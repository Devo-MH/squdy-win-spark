// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "./ISqudyToken.sol"; // Using IERC20 instead

/**
 * @title AutomatedSqudyCampaignManager
 * @dev Simplified campaign manager with automated winner selection
 * @author Squdy Team
 */
contract AutomatedSqudyCampaignManager is AccessControl, ReentrancyGuard, Pausable {

    // ============ CONSTANTS ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ============ STATE VARIABLES ============
    IERC20 public immutable squdyToken;
    uint256 private _campaignIds;
    uint256 private _randomSeed;
    
    // Campaign storage
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => Participant)) public participants;
    mapping(uint256 => address[]) public campaignParticipants;
    
    // ============ STRUCTS ============
    struct Campaign {
        uint256 id;
        string name;
        string description;
        string imageUrl;
        uint256 softCap;
        uint256 hardCap;
        uint256 ticketAmount;
        uint256 currentAmount;
        uint256 startDate;
        uint256 endDate;
        uint256 participantCount;
        string[] prizes;
        address[] winners;
        CampaignStatus status;
        bool tokensAreBurned;
        uint256 totalBurned;
        uint256 winnerSelectionBlock; // Block number when winners were selected
    }

    struct Participant {
        uint256 stakedAmount;
        uint256 ticketCount;
        bool hasCompletedSocial;
        uint256 joinedAt;
    }

    enum CampaignStatus { Active, Finished, Burned }

    // ============ EVENTS ============
    event CampaignCreated(uint256 indexed campaignId, address indexed creator, string name);
    event UserStaked(uint256 indexed campaignId, address indexed user, uint256 amount, uint256 tickets);
    event SocialTasksCompleted(uint256 indexed campaignId, address indexed user);
    event WinnersSelected(uint256 indexed campaignId, address[] winners, uint256 blockNumber);
    event TokensBurned(uint256 indexed campaignId, uint256 amount);
    event CampaignStatusChanged(uint256 indexed campaignId, CampaignStatus status);

    // ============ MODIFIERS ============
    modifier campaignExists(uint256 campaignId) {
        require(campaignId > 0 && campaignId <= _campaignIds, "Campaign does not exist");
        _;
    }

    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        _;
    }

    // ============ CONSTRUCTOR ============
    constructor(address _squdyToken) {
        require(_squdyToken != address(0), "Invalid token address");
        squdyToken = IERC20(_squdyToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        
        // Initialize random seed
        _randomSeed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)));
    }

    // ============ MAIN FUNCTIONS ============

    /**
     * @dev Creates a new campaign
     */
    function createCampaign(
        string memory name,
        string memory description,
        string memory imageUrl,
        uint256 softCap,
        uint256 hardCap,
        uint256 ticketAmount,
        uint256 startDate,
        uint256 endDate,
        string[] memory prizes
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(startDate > block.timestamp, "Invalid start date");
        require(endDate > startDate, "Invalid end date");
        require(softCap > 0 && hardCap > softCap, "Invalid caps");
        require(ticketAmount > 0, "Invalid ticket amount");

        _campaignIds++;
        uint256 campaignId = _campaignIds;

        Campaign storage campaign = campaigns[campaignId];
        campaign.id = campaignId;
        campaign.name = name;
        campaign.description = description;
        campaign.imageUrl = imageUrl;
        campaign.softCap = softCap;
        campaign.hardCap = hardCap;
        campaign.ticketAmount = ticketAmount;
        campaign.startDate = startDate;
        campaign.endDate = endDate;
        campaign.status = CampaignStatus.Active;
        
        // Copy prizes array
        for (uint256 i = 0; i < prizes.length; i++) {
            campaign.prizes.push(prizes[i]);
        }

        emit CampaignCreated(campaignId, msg.sender, name);
        return campaignId;
    }

    /**
     * @dev Stake tokens in a campaign
     */
    function stakeTokens(uint256 campaignId, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        campaignExists(campaignId) 
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.Active, "Campaign not active");
        require(block.timestamp >= campaign.startDate && block.timestamp <= campaign.endDate, "Campaign not in progress");
        require(amount >= campaign.ticketAmount, "Amount below minimum");
        require(campaign.currentAmount + amount <= campaign.hardCap, "Exceeds hard cap");

        Participant storage participant = participants[campaignId][msg.sender];
        
        // If first time participating, add to participants list
        if (participant.stakedAmount == 0) {
            campaignParticipants[campaignId].push(msg.sender);
            campaign.participantCount++;
            participant.joinedAt = block.timestamp;
        }

        // Calculate tickets
        uint256 ticketCount = amount / campaign.ticketAmount;
        participant.stakedAmount += amount;
        participant.ticketCount += ticketCount;
        
        campaign.currentAmount += amount;
        
        // Transfer tokens from user to contract
        require(squdyToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        
        emit UserStaked(campaignId, msg.sender, amount, ticketCount);
    }

    /**
     * @dev Automated winner selection when campaign ends
     * Can be called by anyone after campaign ends
     */
    function selectWinners(uint256 campaignId) 
        external 
        campaignExists(campaignId) 
        nonReentrant 
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.Active, "Campaign not active");
        require(block.timestamp > campaign.endDate, "Campaign still active");
        require(campaign.currentAmount >= campaign.softCap, "Soft cap not reached");

        // Get eligible participants (those who completed social tasks)
        address[] memory eligibleParticipants = getEligibleParticipants(campaignId);
        require(eligibleParticipants.length > 0, "No eligible participants");

        // Select winners based on weighted random selection
        uint256 winnerCount = campaign.prizes.length;
        if (winnerCount > eligibleParticipants.length) {
            winnerCount = eligibleParticipants.length;
        }

        // Generate randomness using multiple entropy sources
        uint256 entropy = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            block.number,
            campaignId,
            campaign.currentAmount,
            _randomSeed++
        )));

        // Select winners using weighted random selection
        for (uint256 i = 0; i < winnerCount; i++) {
            address winner = selectWeightedWinner(campaignId, eligibleParticipants, entropy + i);
            campaign.winners.push(winner);
            
            // Remove winner from eligible list for next selection
            eligibleParticipants = removeFromArray(eligibleParticipants, winner);
        }

        campaign.status = CampaignStatus.Finished;
        campaign.winnerSelectionBlock = block.number;

        emit WinnersSelected(campaignId, campaign.winners, block.number);
        emit CampaignStatusChanged(campaignId, CampaignStatus.Finished);
    }

    /**
     * @dev Burn all staked tokens after winner selection
     */
    function burnTokens(uint256 campaignId) 
        external 
        campaignExists(campaignId) 
        nonReentrant 
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.Finished, "Winners not selected");
        require(!campaign.tokensAreBurned, "Tokens already burned");

        uint256 burnAmount = campaign.currentAmount;
        campaign.tokensAreBurned = true;
        campaign.totalBurned = burnAmount;
        campaign.status = CampaignStatus.Burned;

        // Burn tokens by transferring to dead address
        require(squdyToken.transfer(address(0xdEaD), burnAmount), "Burn failed");

        emit TokensBurned(campaignId, burnAmount);
        emit CampaignStatusChanged(campaignId, CampaignStatus.Burned);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Get eligible participants (those who completed social tasks)
     */
    function getEligibleParticipants(uint256 campaignId) 
        internal 
        view 
        returns (address[] memory) 
    {
        address[] memory allParticipants = campaignParticipants[campaignId];
        address[] memory eligible = new address[](allParticipants.length);
        uint256 eligibleCount = 0;

        for (uint256 i = 0; i < allParticipants.length; i++) {
            if (participants[campaignId][allParticipants[i]].hasCompletedSocial) {
                eligible[eligibleCount] = allParticipants[i];
                eligibleCount++;
            }
        }

        // Resize array to actual eligible count
        address[] memory result = new address[](eligibleCount);
        for (uint256 i = 0; i < eligibleCount; i++) {
            result[i] = eligible[i];
        }

        return result;
    }

    /**
     * @dev Select winner using weighted random selection based on ticket count
     */
    function selectWeightedWinner(
        uint256 campaignId, 
        address[] memory eligibleParticipants, 
        uint256 randomness
    ) internal view returns (address) {
        // Calculate total tickets for eligible participants
        uint256 totalTickets = 0;
        for (uint256 i = 0; i < eligibleParticipants.length; i++) {
            totalTickets += participants[campaignId][eligibleParticipants[i]].ticketCount;
        }

        // Generate random number within total tickets
        uint256 randomTicket = randomness % totalTickets;
        
        // Find winner based on cumulative ticket distribution
        uint256 cumulativeTickets = 0;
        for (uint256 i = 0; i < eligibleParticipants.length; i++) {
            cumulativeTickets += participants[campaignId][eligibleParticipants[i]].ticketCount;
            if (randomTicket < cumulativeTickets) {
                return eligibleParticipants[i];
            }
        }
        
        // Fallback (should never reach here)
        return eligibleParticipants[0];
    }

    /**
     * @dev Remove address from array
     */
    function removeFromArray(address[] memory arr, address target) 
        internal 
        pure 
        returns (address[] memory) 
    {
        address[] memory result = new address[](arr.length - 1);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] != target) {
                result[resultIndex] = arr[i];
                resultIndex++;
            }
        }
        
        return result;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Confirm social tasks completion for a user
     */
    function confirmSocialTasks(uint256 campaignId, address user) 
        external 
        onlyOperator 
        campaignExists(campaignId) 
    {
        require(participants[campaignId][user].stakedAmount > 0, "User not participating");
        require(!participants[campaignId][user].hasCompletedSocial, "Already completed");
        
        participants[campaignId][user].hasCompletedSocial = true;
        
        emit SocialTasksCompleted(campaignId, user);
    }

    // ============ VIEW FUNCTIONS ============

    function getCampaign(uint256 campaignId) 
        external 
        view 
        campaignExists(campaignId) 
        returns (Campaign memory) 
    {
        return campaigns[campaignId];
    }

    function getParticipant(uint256 campaignId, address user) 
        external 
        view 
        returns (Participant memory) 
    {
        return participants[campaignId][user];
    }

    function getCampaignParticipants(uint256 campaignId) 
        external 
        view 
        campaignExists(campaignId) 
        returns (address[] memory) 
    {
        return campaignParticipants[campaignId];
    }

    function getTotalCampaigns() external view returns (uint256) {
        return _campaignIds;
    }
}