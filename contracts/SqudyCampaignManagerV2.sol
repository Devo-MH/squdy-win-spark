// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SqudyCampaignManagerV2
 * @dev Enhanced campaign management contract with security improvements
 * @notice This contract manages SQUDY token staking campaigns with winner selection and token burning
 */
contract SqudyCampaignManagerV2 is ReentrancyGuard, Pausable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ State Variables ============
    
    IERC20 public immutable squdyToken;
    uint256 public campaignCounter;
    uint256 public constant MAX_WINNERS = 100;
    uint256 public constant MIN_CAMPAIGN_DURATION = 1 days;
    uint256 public constant MAX_CAMPAIGN_DURATION = 365 days;
    uint256 public constant PLATFORM_FEE_RATE = 250; // 2.5% in basis points
    uint256 public constant BASIS_POINTS = 10000;
    
    address public feeRecipient;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => Stake)) public stakes;
    mapping(uint256 => mapping(address => bool)) public hasStaked;
    mapping(uint256 => address[]) public campaignParticipants;
    mapping(uint256 => uint256) public totalStaked;
    mapping(uint256 => bool) public campaignFinalized;

    // ============ Structs ============
    
    struct Campaign {
        address creator;
        string title;
        string description;
        uint256 targetAmount;
        uint256 ticketPrice;
        uint256 startTime;
        uint256 endTime;
        uint256 maxParticipants;
        bool isActive;
        bool winnersSelected;
        bool tokensDistributed;
        uint256 totalParticipants;
        uint256 prizePool;
    }
    
    struct Stake {
        uint256 amount;
        uint256 tickets;
        uint256 timestamp;
        bool withdrawn;
    }
    
    struct Winner {
        address participant;
        uint256 prizeAmount;
        uint256 ticketCount;
    }

    // ============ Events ============
    
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 targetAmount,
        uint256 startTime,
        uint256 endTime
    );
    
    event StakeCreated(
        uint256 indexed campaignId,
        address indexed participant,
        uint256 amount,
        uint256 tickets
    );
    
    event WinnersSelected(
        uint256 indexed campaignId,
        Winner[] winners,
        uint256 totalPrizePool
    );
    
    event TokensBurned(
        uint256 indexed campaignId,
        uint256 amountBurned,
        uint256 platformFee
    );
    
    event CampaignFinalized(
        uint256 indexed campaignId,
        uint256 totalStaked,
        uint256 totalParticipants
    );
    
    event EmergencyWithdraw(
        uint256 indexed campaignId,
        address indexed participant,
        uint256 amount
    );

    // ============ Modifiers ============
    
    modifier validCampaign(uint256 _campaignId) {
        require(_campaignId > 0 && _campaignId <= campaignCounter, "Invalid campaign ID");
        _;
    }
    
    modifier campaignActive(uint256 _campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isActive, "Campaign not active");
        require(block.timestamp >= campaign.startTime, "Campaign not started");
        require(block.timestamp <= campaign.endTime, "Campaign ended");
        _;
    }
    
    modifier campaignEnded(uint256 _campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp > campaign.endTime, "Campaign still active");
        _;
    }
    
    modifier onlyCampaignCreator(uint256 _campaignId) {
        require(campaigns[_campaignId].creator == msg.sender, "Not campaign creator");
        _;
    }

    // ============ Constructor ============
    
    constructor(
        address _squdyToken,
        address _feeRecipient
    ) {
        require(_squdyToken != address(0), "Invalid token address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        squdyToken = IERC20(_squdyToken);
        feeRecipient = _feeRecipient;
    }

    // ============ External Functions ============
    
    /**
     * @dev Create a new campaign
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _targetAmount Target amount to raise
     * @param _ticketPrice Price per ticket in SQUDY tokens
     * @param _startTime Campaign start timestamp
     * @param _endTime Campaign end timestamp
     * @param _maxParticipants Maximum number of participants (0 for unlimited)
     * @param _prizePool Total prize pool amount
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _targetAmount,
        uint256 _ticketPrice,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _maxParticipants,
        uint256 _prizePool
    ) external whenNotPaused returns (uint256) {
        require(bytes(_title).length > 0, "Empty title");
        require(_targetAmount > 0, "Invalid target amount");
        require(_ticketPrice > 0, "Invalid ticket price");
        require(_startTime >= block.timestamp, "Start time in past");
        require(_endTime > _startTime, "Invalid end time");
        require(_endTime.sub(_startTime) >= MIN_CAMPAIGN_DURATION, "Duration too short");
        require(_endTime.sub(_startTime) <= MAX_CAMPAIGN_DURATION, "Duration too long");
        require(_prizePool > 0, "Invalid prize pool");

        campaignCounter++;
        uint256 campaignId = campaignCounter;

        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            title: _title,
            description: _description,
            targetAmount: _targetAmount,
            ticketPrice: _ticketPrice,
            startTime: _startTime,
            endTime: _endTime,
            maxParticipants: _maxParticipants,
            isActive: true,
            winnersSelected: false,
            tokensDistributed: false,
            totalParticipants: 0,
            prizePool: _prizePool
        });

        emit CampaignCreated(
            campaignId,
            msg.sender,
            _title,
            _targetAmount,
            _startTime,
            _endTime
        );

        return campaignId;
    }

    /**
     * @dev Stake tokens in a campaign
     * @param _campaignId Campaign to stake in
     * @param _amount Amount of SQUDY tokens to stake
     */
    function stakeInCampaign(
        uint256 _campaignId,
        uint256 _amount
    ) external nonReentrant whenNotPaused validCampaign(_campaignId) campaignActive(_campaignId) {
        require(_amount > 0, "Invalid stake amount");
        require(!hasStaked[_campaignId][msg.sender], "Already staked");

        Campaign storage campaign = campaigns[_campaignId];
        
        if (campaign.maxParticipants > 0) {
            require(campaign.totalParticipants < campaign.maxParticipants, "Max participants reached");
        }

        uint256 tickets = _amount.div(campaign.ticketPrice);
        require(tickets > 0, "Insufficient amount for tickets");

        // Transfer tokens from user
        squdyToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Record stake
        stakes[_campaignId][msg.sender] = Stake({
            amount: _amount,
            tickets: tickets,
            timestamp: block.timestamp,
            withdrawn: false
        });

        hasStaked[_campaignId][msg.sender] = true;
        campaignParticipants[_campaignId].push(msg.sender);
        totalStaked[_campaignId] = totalStaked[_campaignId].add(_amount);
        campaign.totalParticipants++;

        emit StakeCreated(_campaignId, msg.sender, _amount, tickets);
    }

    /**
     * @dev Select winners for a campaign (only creator)
     * @param _campaignId Campaign to select winners for
     * @param _winners Array of winners with prize amounts
     */
    function selectWinners(
        uint256 _campaignId,
        Winner[] memory _winners
    ) external validCampaign(_campaignId) campaignEnded(_campaignId) onlyCampaignCreator(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(!campaign.winnersSelected, "Winners already selected");
        require(_winners.length <= MAX_WINNERS, "Too many winners");
        require(_winners.length > 0, "No winners provided");

        uint256 totalPrizeAmount = 0;
        for (uint256 i = 0; i < _winners.length; i++) {
            require(_winners[i].participant != address(0), "Invalid winner address");
            require(hasStaked[_campaignId][_winners[i].participant], "Winner didn't stake");
            totalPrizeAmount = totalPrizeAmount.add(_winners[i].prizeAmount);
        }

        require(totalPrizeAmount <= campaign.prizePool, "Prize exceeds pool");

        campaign.winnersSelected = true;
        
        emit WinnersSelected(_campaignId, _winners, totalPrizeAmount);
    }

    /**
     * @dev Burn remaining tokens after winner selection
     * @param _campaignId Campaign to burn tokens for
     */
    function burnCampaignTokens(
        uint256 _campaignId
    ) external validCampaign(_campaignId) onlyCampaignCreator(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.winnersSelected, "Winners not selected");
        require(!campaignFinalized[_campaignId], "Already finalized");

        uint256 totalTokens = totalStaked[_campaignId];
        require(totalTokens > 0, "No tokens to burn");

        // Calculate platform fee
        uint256 platformFee = totalTokens.mul(PLATFORM_FEE_RATE).div(BASIS_POINTS);
        uint256 burnAmount = totalTokens.sub(platformFee);

        // Transfer platform fee
        if (platformFee > 0) {
            squdyToken.safeTransfer(feeRecipient, platformFee);
        }

        // Burn remaining tokens (transfer to dead address)
        if (burnAmount > 0) {
            squdyToken.safeTransfer(address(0xdEaD), burnAmount);
        }

        campaignFinalized[_campaignId] = true;

        emit TokensBurned(_campaignId, burnAmount, platformFee);
        emit CampaignFinalized(_campaignId, totalTokens, campaign.totalParticipants);
    }

    /**
     * @dev Emergency withdraw function (only if campaign is cancelled)
     * @param _campaignId Campaign to withdraw from
     */
    function emergencyWithdraw(
        uint256 _campaignId
    ) external nonReentrant validCampaign(_campaignId) {
        require(!campaigns[_campaignId].isActive, "Campaign still active");
        require(!campaignFinalized[_campaignId], "Campaign finalized");
        require(hasStaked[_campaignId][msg.sender], "No stake found");

        Stake storage userStake = stakes[_campaignId][msg.sender];
        require(!userStake.withdrawn, "Already withdrawn");

        uint256 amount = userStake.amount;
        userStake.withdrawn = true;

        squdyToken.safeTransfer(msg.sender, amount);

        emit EmergencyWithdraw(_campaignId, msg.sender, amount);
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Pause the contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Cancel a campaign (emergency)
     * @param _campaignId Campaign to cancel
     */
    function cancelCampaign(
        uint256 _campaignId
    ) external onlyOwner validCampaign(_campaignId) {
        campaigns[_campaignId].isActive = false;
    }

    /**
     * @dev Update fee recipient
     * @param _newFeeRecipient New fee recipient address
     */
    function updateFeeRecipient(address _newFeeRecipient) external onlyOwner {
        require(_newFeeRecipient != address(0), "Invalid address");
        feeRecipient = _newFeeRecipient;
    }

    // ============ View Functions ============
    
    /**
     * @dev Get campaign details
     * @param _campaignId Campaign ID to query
     */
    function getCampaign(
        uint256 _campaignId
    ) external view validCampaign(_campaignId) returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    /**
     * @dev Get user's stake in a campaign
     * @param _campaignId Campaign ID
     * @param _user User address
     */
    function getUserStake(
        uint256 _campaignId,
        address _user
    ) external view validCampaign(_campaignId) returns (Stake memory) {
        return stakes[_campaignId][_user];
    }

    /**
     * @dev Get total staked amount in a campaign
     * @param _campaignId Campaign ID
     */
    function getTotalStaked(
        uint256 _campaignId
    ) external view validCampaign(_campaignId) returns (uint256) {
        return totalStaked[_campaignId];
    }

    /**
     * @dev Get campaign participants
     * @param _campaignId Campaign ID
     */
    function getCampaignParticipants(
        uint256 _campaignId
    ) external view validCampaign(_campaignId) returns (address[] memory) {
        return campaignParticipants[_campaignId];
    }

    /**
     * @dev Check if campaign is currently active
     * @param _campaignId Campaign ID
     */
    function isCampaignActive(
        uint256 _campaignId
    ) external view validCampaign(_campaignId) returns (bool) {
        Campaign storage campaign = campaigns[_campaignId];
        return campaign.isActive && 
               block.timestamp >= campaign.startTime && 
               block.timestamp <= campaign.endTime;
    }

    /**
     * @dev Get contract version
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}