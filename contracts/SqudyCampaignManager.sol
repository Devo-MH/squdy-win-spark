// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ISqudyToken.sol";

/**
 * @title SqudyCampaignManager
 * @dev Manages burn-to-win campaigns for SQUDY tokens with simple on-chain randomness
 * @author Squdy Team
 */
contract SqudyCampaignManager is AccessControl, ReentrancyGuard, Pausable {

    // ============ CONSTANTS ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ============ STATE VARIABLES ============
    ISqudyToken public immutable squdyToken;
    uint256 private _campaignIds;
    uint256 private _randomNonce;
    
    // Campaign storage
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => Participant)) public participants;
    mapping(uint256 => address[]) public campaignParticipants;
    mapping(uint256 => mapping(uint256 => address)) public participantIndexes;
    
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
        bytes32 winnerSelectionTxHash;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    struct Participant {
        uint256 stakedAmount;
        uint256 ticketCount;
        bool hasCompletedSocial;
        bool isWinner;
        uint256 prizeIndex;
        uint256 joinedAt;
    }
    
    enum CampaignStatus {
        PENDING,
        ACTIVE,
        PAUSED,
        FINISHED,
        BURNED
    }

    // ============ EVENTS ============
    event CampaignCreated(
        uint256 indexed campaignId,
        string name,
        uint256 startDate,
        uint256 endDate,
        uint256 ticketAmount
    );
    
    event UserStaked(
        uint256 indexed campaignId,
        address indexed user,
        uint256 amount,
        uint256 tickets
    );
    
    event SocialTasksCompleted(
        uint256 indexed campaignId,
        address indexed user
    );
    
    event CampaignPaused(uint256 indexed campaignId);
    event CampaignResumed(uint256 indexed campaignId);
    event CampaignClosed(uint256 indexed campaignId);
    
    event WinnersSelected(
        uint256 indexed campaignId,
        address[] winners,
        bytes32 selectionHash
    );
    
    event TokensBurned(
        uint256 indexed campaignId,
        uint256 totalBurned
    );
    
    event PrizeClaimed(
        uint256 indexed campaignId,
        address indexed winner,
        uint256 prizeIndex
    );
    
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    // ============ MODIFIERS ============
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "SqudyCampaignManager: admin role required");
        _;
    }
    
    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), 
                "SqudyCampaignManager: operator role required");
        _;
    }
    
    modifier campaignExists(uint256 campaignId) {
        require(campaigns[campaignId].id != 0, "SqudyCampaignManager: campaign does not exist");
        _;
    }
    
    modifier campaignActive(uint256 campaignId) {
        require(campaigns[campaignId].status == CampaignStatus.ACTIVE, 
                "SqudyCampaignManager: campaign not active");
        _;
    }
    
    modifier campaignNotBurned(uint256 campaignId) {
        require(!campaigns[campaignId].tokensAreBurned, 
                "SqudyCampaignManager: tokens already burned");
        _;
    }

    // ============ CONSTRUCTOR ============
    constructor(address _squdyToken) {
        squdyToken = ISqudyToken(_squdyToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Creates a new campaign
     * @param name Campaign name
     * @param description Campaign description
     * @param imageUrl Campaign image URL
     * @param softCap Minimum amount of tokens required
     * @param hardCap Maximum amount of tokens that can be staked
     * @param ticketAmount Amount of tokens per ticket
     * @param startDate Campaign start timestamp
     * @param endDate Campaign end timestamp
     * @param prizes Array of prize descriptions
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
    ) external onlyOperator returns (uint256) {
        require(bytes(name).length > 0, "SqudyCampaignManager: name cannot be empty");
        require(softCap > 0, "SqudyCampaignManager: soft cap must be greater than 0");
        require(hardCap >= softCap, "SqudyCampaignManager: hard cap must be >= soft cap");
        require(ticketAmount > 0, "SqudyCampaignManager: ticket amount must be greater than 0");
        require(startDate > block.timestamp, "SqudyCampaignManager: start date must be in the future");
        require(endDate > startDate, "SqudyCampaignManager: end date must be after start date");
        require(prizes.length > 0, "SqudyCampaignManager: must have at least one prize");
        
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
        campaign.prizes = prizes;
        campaign.status = CampaignStatus.PENDING;
        campaign.createdAt = block.timestamp;
        campaign.updatedAt = block.timestamp;
        
        emit CampaignCreated(campaignId, name, startDate, endDate, ticketAmount);
        
        return campaignId;
    }
    
    /**
     * @dev Activates a campaign
     */
    function activateCampaign(uint256 campaignId) 
        external 
        onlyOperator 
        campaignExists(campaignId) 
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.PENDING, 
                "SqudyCampaignManager: campaign not pending");
        require(block.timestamp >= campaign.startDate, 
                "SqudyCampaignManager: campaign not ready to start");
        
        campaign.status = CampaignStatus.ACTIVE;
        campaign.updatedAt = block.timestamp;
    }
    
    /**
     * @dev Pauses a campaign
     */
    function pauseCampaign(uint256 campaignId) 
        external 
        onlyOperator 
        campaignExists(campaignId) 
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.ACTIVE, 
                "SqudyCampaignManager: campaign not active");
        
        campaign.status = CampaignStatus.PAUSED;
        campaign.updatedAt = block.timestamp;
        
        emit CampaignPaused(campaignId);
    }
    
    /**
     * @dev Resumes a paused campaign
     */
    function resumeCampaign(uint256 campaignId) 
        external 
        onlyOperator 
        campaignExists(campaignId) 
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.PAUSED, 
                "SqudyCampaignManager: campaign not paused");
        require(block.timestamp < campaign.endDate, 
                "SqudyCampaignManager: campaign has ended");
        
        campaign.status = CampaignStatus.ACTIVE;
        campaign.updatedAt = block.timestamp;
        
        emit CampaignResumed(campaignId);
    }
    
    /**
     * @dev Closes a campaign and selects winners
     */
    function closeCampaign(uint256 campaignId) 
        external 
        onlyOperator 
        campaignExists(campaignId) 
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.ACTIVE || campaign.status == CampaignStatus.PAUSED, 
                "SqudyCampaignManager: campaign not active or paused");
        require(block.timestamp >= campaign.endDate || campaign.currentAmount >= campaign.hardCap, 
                "SqudyCampaignManager: campaign not ready to close");
        require(campaign.participantCount > 0, 
                "SqudyCampaignManager: no participants");
        
        campaign.status = CampaignStatus.FINISHED;
        campaign.updatedAt = block.timestamp;
        
        emit CampaignClosed(campaignId);
    }
    
    /**
     * @dev Selects winners using on-chain randomness
     */
    function selectWinners(uint256 campaignId) 
        external 
        onlyOperator 
        campaignExists(campaignId) 
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.FINISHED, 
                "SqudyCampaignManager: campaign not finished");
        require(campaign.participantCount > 0, 
                "SqudyCampaignManager: no participants");
        require(campaign.winners.length == 0, 
                "SqudyCampaignManager: winners already selected");
        
        // Generate random numbers using block variables and nonce
        uint256[] memory randomNumbers = _generateRandomNumbers(campaign.participantCount);
        
        // Select winners based on random numbers and ticket counts
        address[] memory winners = _selectWinners(campaignId, randomNumbers);
        campaign.winners = winners;
        campaign.winnerSelectionTxHash = keccak256(abi.encodePacked(block.timestamp, _randomNonce));
        campaign.updatedAt = block.timestamp;
        
        emit WinnersSelected(campaignId, winners, campaign.winnerSelectionTxHash);
    }
    
    /**
     * @dev Burns all staked tokens after winner selection
     */
    function burnAllTokens(uint256 campaignId) 
        external 
        onlyOperator 
        campaignExists(campaignId) 
        campaignNotBurned(campaignId) 
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.FINISHED, 
                "SqudyCampaignManager: campaign not finished");
        require(campaign.winners.length > 0, 
                "SqudyCampaignManager: winners not selected");
        require(campaign.currentAmount > 0, 
                "SqudyCampaignManager: no tokens to burn");
        
        // Burn all staked tokens
        squdyToken.burnFrom(address(this), campaign.currentAmount);
        
        campaign.tokensAreBurned = true;
        campaign.totalBurned = campaign.currentAmount;
        campaign.updatedAt = block.timestamp;
        
        emit TokensBurned(campaignId, campaign.currentAmount);
    }
    
    /**
     * @dev Adds a new admin
     */
    function addAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(admin != address(0), "SqudyCampaignManager: invalid admin address");
        _grantRole(ADMIN_ROLE, admin);
        emit AdminAdded(admin);
    }
    
    /**
     * @dev Removes an admin
     */
    function removeAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(admin != msg.sender, "SqudyCampaignManager: cannot remove self");
        _revokeRole(ADMIN_ROLE, admin);
        emit AdminRemoved(admin);
    }

    // ============ USER FUNCTIONS ============
    
    /**
     * @dev Allows users to stake SQUDY tokens in a campaign
     * @param campaignId The campaign ID to stake in
     * @param amount Amount of tokens to stake (must be multiple of ticketAmount)
     */
    function stakeSQUDY(uint256 campaignId, uint256 amount) 
        external 
        nonReentrant 
        campaignExists(campaignId) 
        campaignActive(campaignId) 
    {
        Campaign storage campaign = campaigns[campaignId];
        require(amount > 0, "SqudyCampaignManager: amount must be greater than 0");
        require(amount % campaign.ticketAmount == 0, 
                "SqudyCampaignManager: amount must be multiple of ticket amount");
        require(campaign.currentAmount + amount <= campaign.hardCap, 
                "SqudyCampaignManager: would exceed hard cap");
        
        // Check if user already participated
        Participant storage participant = participants[campaignId][msg.sender];
        uint256 ticketCount = amount / campaign.ticketAmount;
        
        if (participant.stakedAmount == 0) {
            // New participant
            participant.stakedAmount = amount;
            participant.ticketCount = ticketCount;
            participant.joinedAt = block.timestamp;
            
            campaignParticipants[campaignId].push(msg.sender);
            participantIndexes[campaignId][campaign.participantCount] = msg.sender;
            campaign.participantCount++;
        } else {
            // Existing participant - add to existing stake
            participant.stakedAmount += amount;
            participant.ticketCount += ticketCount;
        }
        
        campaign.currentAmount += amount;
        campaign.updatedAt = block.timestamp;
        
        // Transfer tokens from user to contract
        require(squdyToken.transferFrom(msg.sender, address(this), amount), 
                "SqudyCampaignManager: token transfer failed");
        
        emit UserStaked(campaignId, msg.sender, amount, ticketCount);
    }
    
    /**
     * @dev Marks social media tasks as completed for a user
     * @param campaignId The campaign ID
     * @param user The user address
     */
    function confirmSocialTasks(uint256 campaignId, address user) 
        external 
        onlyOperator 
        campaignExists(campaignId) 
    {
        require(participants[campaignId][user].stakedAmount > 0, 
                "SqudyCampaignManager: user not participating");
        require(!participants[campaignId][user].hasCompletedSocial, 
                "SqudyCampaignManager: social tasks already completed");
        
        participants[campaignId][user].hasCompletedSocial = true;
        
        emit SocialTasksCompleted(campaignId, user);
    }
    
    /**
     * @dev Gets the ticket count for a user in a campaign
     */
    function getTicketCount(uint256 campaignId, address user) 
        external 
        view 
        campaignExists(campaignId) 
        returns (uint256) 
    {
        return participants[campaignId][user].ticketCount;
    }
    
    /**
     * @dev Checks if a user is eligible for winning (has completed social tasks)
     */
    function isEligibleForWinning(uint256 campaignId, address user) 
        external 
        view 
        campaignExists(campaignId) 
        returns (bool) 
    {
        Participant storage participant = participants[campaignId][user];
        return participant.stakedAmount > 0 && participant.hasCompletedSocial;
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Generates random numbers using block variables and nonce
     */
    function _generateRandomNumbers(uint256 count) 
        internal 
        returns (uint256[] memory) 
    {
        uint256[] memory randomNumbers = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            // Use block variables and nonce for randomness
            randomNumbers[i] = uint256(keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                block.number,
                _randomNonce,
                i
            )));
        }
        
        _randomNonce++;
        return randomNumbers;
    }
    
    /**
     * @dev Internal function to select winners using weighted lottery
     */
    function _selectWinners(uint256 campaignId, uint256[] memory randomNumbers) 
        internal 
        returns (address[] memory) 
    {
        Campaign storage campaign = campaigns[campaignId];
        uint256 totalTickets = 0;
        uint256 eligibleParticipants = 0;
        
        // Count total tickets and eligible participants
        for (uint256 i = 0; i < campaign.participantCount; i++) {
            address participant = participantIndexes[campaignId][i];
            Participant storage p = participants[campaignId][participant];
            if (p.hasCompletedSocial) {
                totalTickets += p.ticketCount;
                eligibleParticipants++;
            }
        }
        
        require(totalTickets > 0, "SqudyCampaignManager: no eligible participants");
        
        // Select winners based on prize count
        uint256 winnerCount = campaign.prizes.length;
        address[] memory winners = new address[](winnerCount);
        uint256 winnersSelected = 0;
        
        for (uint256 i = 0; i < randomNumbers.length && winnersSelected < winnerCount; i++) {
            uint256 randomTicket = randomNumbers[i] % totalTickets;
            address selectedWinner = _findWinnerByTicket(campaignId, randomTicket);
            
            // Check if this winner was already selected
            bool alreadySelected = false;
            for (uint256 j = 0; j < winnersSelected; j++) {
                if (winners[j] == selectedWinner) {
                    alreadySelected = true;
                    break;
                }
            }
            
            if (!alreadySelected) {
                winners[winnersSelected] = selectedWinner;
                participants[campaignId][selectedWinner].isWinner = true;
                participants[campaignId][selectedWinner].prizeIndex = winnersSelected;
                winnersSelected++;
            }
        }
        
        return winners;
    }
    
    /**
     * @dev Internal function to find winner by ticket number
     */
    function _findWinnerByTicket(uint256 campaignId, uint256 targetTicket) 
        internal 
        view 
        returns (address) 
    {
        Campaign storage campaign = campaigns[campaignId];
        uint256 currentTicket = 0;
        
        for (uint256 i = 0; i < campaign.participantCount; i++) {
            address participant = participantIndexes[campaignId][i];
            Participant storage p = participants[campaignId][participant];
            
            if (p.hasCompletedSocial) {
                currentTicket += p.ticketCount;
                if (targetTicket < currentTicket) {
                    return participant;
                }
            }
        }
        
        // Fallback (should not happen if totalTickets is correct)
        return participantIndexes[campaignId][0];
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Gets campaign details
     */
    function getCampaign(uint256 campaignId) 
        external 
        view 
        campaignExists(campaignId) 
        returns (Campaign memory) 
    {
        return campaigns[campaignId];
    }
    
    /**
     * @dev Gets participant details
     */
    function getParticipant(uint256 campaignId, address user) 
        external 
        view 
        campaignExists(campaignId) 
        returns (Participant memory) 
    {
        return participants[campaignId][user];
    }
    
    /**
     * @dev Gets all participants for a campaign
     */
    function getCampaignParticipants(uint256 campaignId) 
        external 
        view 
        campaignExists(campaignId) 
        returns (address[] memory) 
    {
        return campaignParticipants[campaignId];
    }
    
    /**
     * @dev Gets total number of campaigns
     */
    function getCampaignCount() external view returns (uint256) {
        return _campaignIds;
    }
    
    /**
     * @dev Gets campaigns by status
     */
    function getCampaignsByStatus(CampaignStatus status) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256 count = 0;
        uint256 totalCampaigns = _campaignIds;
        
        // Count campaigns with the specified status
        for (uint256 i = 1; i <= totalCampaigns; i++) {
            if (campaigns[i].status == status) {
                count++;
            }
        }
        
        // Create array with campaigns of the specified status
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= totalCampaigns; i++) {
            if (campaigns[i].status == status) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }

    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function
     */
    function emergencyUnpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @dev Emergency function to recover tokens (only if not burned)
     */
    function emergencyRecoverTokens(address token, address to) 
        external 
        onlyAdmin 
    {
        require(token != address(squdyToken), "SqudyCampaignManager: cannot recover SQUDY tokens");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "SqudyCampaignManager: no tokens to recover");
        
        IERC20(token).transfer(to, balance);
    }
} 