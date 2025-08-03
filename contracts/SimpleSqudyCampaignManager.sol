// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract SimpleSqudyCampaignManager {
    IERC20 public immutable squdyToken;
    uint256 public campaignCounter;
    address public owner;
    
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => Stake)) public stakes;
    mapping(uint256 => mapping(address => bool)) public hasStaked;
    mapping(uint256 => address[]) public campaignParticipants;
    mapping(uint256 => uint256) public totalStaked;

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
        uint256 totalParticipants;
        uint256 prizePool;
    }
    
    struct Stake {
        uint256 amount;
        uint256 tickets;
        uint256 timestamp;
        bool withdrawn;
    }

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, string title);
    event StakeCreated(uint256 indexed campaignId, address indexed participant, uint256 amount, uint256 tickets);
    event WinnersSelected(uint256 indexed campaignId, address[] winners);
    event TokensBurned(uint256 indexed campaignId, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier validCampaign(uint256 _campaignId) {
        require(_campaignId > 0 && _campaignId <= campaignCounter, "Invalid campaign");
        _;
    }

    modifier campaignActive(uint256 _campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isActive, "Campaign not active");
        require(block.timestamp >= campaign.startTime, "Not started");
        require(block.timestamp <= campaign.endTime, "Ended");
        _;
    }

    constructor(address _squdyToken) {
        require(_squdyToken != address(0), "Invalid token");
        squdyToken = IERC20(_squdyToken);
        owner = msg.sender;
    }

    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _targetAmount,
        uint256 _ticketPrice,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _maxParticipants,
        uint256 _prizePool
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Empty title");
        require(_targetAmount > 0, "Invalid target");
        require(_ticketPrice > 0, "Invalid ticket price");
        require(_startTime >= block.timestamp, "Start time past");
        require(_endTime > _startTime, "Invalid end time");

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
            totalParticipants: 0,
            prizePool: _prizePool
        });

        emit CampaignCreated(campaignId, msg.sender, _title);
        return campaignId;
    }

    function stakeInCampaign(uint256 _campaignId, uint256 _amount) 
        external 
        validCampaign(_campaignId) 
        campaignActive(_campaignId) 
    {
        require(_amount > 0, "Invalid amount");
        require(!hasStaked[_campaignId][msg.sender], "Already staked");

        Campaign storage campaign = campaigns[_campaignId];
        
        if (campaign.maxParticipants > 0) {
            require(campaign.totalParticipants < campaign.maxParticipants, "Max participants");
        }

        uint256 tickets = _amount / campaign.ticketPrice;
        require(tickets > 0, "Insufficient for tickets");

        // Transfer tokens
        require(squdyToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        // Record stake
        stakes[_campaignId][msg.sender] = Stake({
            amount: _amount,
            tickets: tickets,
            timestamp: block.timestamp,
            withdrawn: false
        });

        hasStaked[_campaignId][msg.sender] = true;
        campaignParticipants[_campaignId].push(msg.sender);
        totalStaked[_campaignId] += _amount;
        campaign.totalParticipants++;

        emit StakeCreated(_campaignId, msg.sender, _amount, tickets);
    }

    function selectWinners(uint256 _campaignId, address[] memory _winners) 
        external 
        validCampaign(_campaignId) 
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Not creator");
        require(block.timestamp > campaign.endTime, "Campaign active");
        require(!campaign.winnersSelected, "Winners selected");

        for (uint256 i = 0; i < _winners.length; i++) {
            require(hasStaked[_campaignId][_winners[i]], "Winner didn't stake");
        }

        campaign.winnersSelected = true;
        emit WinnersSelected(_campaignId, _winners);
    }

    function burnCampaignTokens(uint256 _campaignId) external validCampaign(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Not creator");
        require(campaign.winnersSelected, "Winners not selected");

        uint256 burnAmount = totalStaked[_campaignId];
        require(burnAmount > 0, "No tokens");

        // Transfer to burn address
        require(squdyToken.transfer(address(0xdEaD), burnAmount), "Burn failed");

        emit TokensBurned(_campaignId, burnAmount);
    }

    function getCampaign(uint256 _campaignId) 
        external 
        view 
        validCampaign(_campaignId) 
        returns (Campaign memory) 
    {
        return campaigns[_campaignId];
    }

    function getUserStake(uint256 _campaignId, address _user) 
        external 
        view 
        returns (Stake memory) 
    {
        return stakes[_campaignId][_user];
    }

    function getTotalStaked(uint256 _campaignId) 
        external 
        view 
        returns (uint256) 
    {
        return totalStaked[_campaignId];
    }

    function getCampaignParticipants(uint256 _campaignId) 
        external 
        view 
        returns (address[] memory) 
    {
        return campaignParticipants[_campaignId];
    }
}