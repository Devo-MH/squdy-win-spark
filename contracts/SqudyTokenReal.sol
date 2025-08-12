// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

/**
 * @title SqudyToken - Production Version
 * @notice Enhanced BEP-20 token with anti-bot, burn mechanics, and trading features
 * @dev Combines original Squdy features with enhanced security and optimizations
 * @author Squdy Team
 */
contract SqudyToken is ERC20, ERC20Burnable, ERC20Permit, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ============ CONSTANTS ============
    uint256 public constant MAX_SUPPLY = 450_000_000_000 * 10**18; // 450B tokens max
    uint256 public constant INITIAL_SUPPLY = 450_000_000_000 * 10**18; // 450B initial
    uint256 public constant FEE_DENOM = 10000;
    uint256 public constant MAX_PENALTY_FEE = 5000; // 50% max penalty (reduced from 99%)
    
    // ============ PANCAKESWAP ============
    IUniswapV2Router02 public pancakeRouter;
    address public pancakePair;
    
    // ============ TRADING CONTROL ============
    bool public tradingEnabled;
    uint256 public launchBlock;
    uint256 public penaltyBlocks = 3;
    uint256 public cooldownBlocks = 2;
    
    // ============ FEES & LIMITS ============
    uint256 public normalFee = 200; // 2.00%
    bool public taxBuys; // default false
    uint256 public maxTxAmount = INITIAL_SUPPLY / 200; // 0.5%
    uint256 public maxWalletAmount = INITIAL_SUPPLY / 100; // 1%
    
    // ============ CIRCUIT BREAKERS ============
    uint256 public maxDailyVolume = INITIAL_SUPPLY / 10; // 10% of supply
    uint256 public currentDay;
    uint256 public currentDayVolume;
    bool public circuitBreakerEnabled = true;
    
    // ============ WITHDRAWAL PATTERN ============
    mapping(address => uint256) public pendingWithdrawals;
    uint256 public totalPendingWithdrawals;
    
    // ============ ANTI-BOT ============
    mapping(address => bool) public isBot;
    mapping(address => uint256) private _lastTxBlock;
    mapping(address => bool) private _isExcludedFromFee;
    mapping(address => bool) private _isExcludedFromLimits;
    
    // ============ ANTI-SANDWICH ============
    uint256 public maxSwapImpactBps = 200; // 2.00%
    uint256 public impactGraceBlocks = 300;
    uint256 public graceImpactBps = 800; // 8.00%
    uint256 public minReservesForImpact = 1_000_000e18;
    bool public sameBlockGuard = true;
    mapping(address => uint256) private _lastTradeBlock;
    
    // ============ SELL LIMITS ============
    uint256 public sellLimitGraceBlocks = 6000;
    uint256 public maxSellBpsOfReserves = 300; // 3%
    
    // ============ AUTHORIZED CONTRACTS ============
    mapping(address => bool) public authorizedBurners; // Legacy support
    address public campaignManager;
    address public prizePool;
    
    // ============ STATISTICS ============
    uint256 public totalBurned;
    uint256 public totalFeesCollected;
    
    // ============ EVENTS ============
    event TradingEnabled(uint256 indexed launchBlock);
    event BlacklistUpdated(address indexed bot, bool indexed value);
    event BurnerAuthorized(address indexed burner, bool authorized);
    event CampaignManagerUpdated(address indexed newManager);
    event PrizePoolUpdated(address indexed newPool);
    event FeesRouted(address indexed to, uint256 amount);
    event CircuitBreakerTriggered(uint256 volume, uint256 maxVolume);
    event WithdrawalQueued(address indexed user, uint256 amount);
    event WithdrawalProcessed(address indexed user, uint256 amount);
    event TokensBurned(address indexed burner, uint256 amount);
    event TokensBurnedByCampaign(address indexed campaign, uint256 amount);
    event ImpactCheckFailed(address indexed actor, uint256 impactBps, uint256 maxAllowed);
    event DailyVolumeReset(uint256 newDay, uint256 previousVolume);
    event MaxDailyVolumeUpdated(uint256 newMax);
    event ExcludedFromLimits(address indexed addr, bool excluded);
    event LimitsUpdated(uint256 maxTx, uint256 maxWallet);
    
    // ============ CONSTRUCTOR ============
    constructor(
        address _router,
        address _initialOwner
    ) 
        ERC20("SQUDY Token", "SQUDY")
        ERC20Permit("SQUDY Token")
    {
        require(_initialOwner != address(0), "Invalid owner");
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, _initialOwner);
        _grantRole(ADMIN_ROLE, _initialOwner);
        
        // Mint initial supply
        _mint(_initialOwner, INITIAL_SUPPLY);
        
        // Initialize day tracking
        currentDay = block.timestamp / 1 days;
        
        // Setup PancakeSwap (immutables must be assigned exactly once)
        address router_ = _router;
        address pair_ = address(0);
        if (router_ != address(0)) {
            address factory = IUniswapV2Router02(router_).factory();
            address weth = IUniswapV2Router02(router_).WETH();
            address existing = IUniswapV2Factory(factory).getPair(address(this), weth);
            pair_ = existing == address(0) ? IUniswapV2Factory(factory).createPair(address(this), weth) : existing;
        }
        pancakeRouter = IUniswapV2Router02(router_);
        pancakePair = pair_;
        
        // Setup exclusions
        _isExcludedFromFee[_initialOwner] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromLimits[_initialOwner] = true;
        _isExcludedFromLimits[address(this)] = true;
        if (pair_ != address(0)) {
            _isExcludedFromLimits[pair_] = true;
        }
        
        // Legacy compatibility
        authorizedBurners[_initialOwner] = true;
        emit BurnerAuthorized(_initialOwner, true);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function enableTrading() external onlyRole(ADMIN_ROLE) {
        require(!tradingEnabled, "Trading already enabled");
        tradingEnabled = true;
        launchBlock = block.number;
        emit TradingEnabled(launchBlock);
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    function blacklistAddress(address bot, bool value) external onlyRole(ADMIN_ROLE) {
        isBot[bot] = value;
        emit BlacklistUpdated(bot, value);
    }
    
    function setExcludedFromFee(address addr, bool excluded) external onlyRole(ADMIN_ROLE) {
        _isExcludedFromFee[addr] = excluded;
    }
    
    function setExcludedFromLimits(address addr, bool excluded) external onlyRole(ADMIN_ROLE) {
        _isExcludedFromLimits[addr] = excluded;
        emit ExcludedFromLimits(addr, excluded);
    }
    
    /**
     * @dev Set campaign manager contract (legacy + new compatibility)
     */
    function setCampaignManager(address _manager) external onlyRole(ADMIN_ROLE) {
        campaignManager = _manager;
        if (_manager != address(0)) {
            _isExcludedFromFee[_manager] = true;
            _isExcludedFromLimits[_manager] = true;
            authorizedBurners[_manager] = true; // Legacy support
            _grantRole(BURNER_ROLE, _manager);
        }
        emit CampaignManagerUpdated(_manager);
        emit BurnerAuthorized(_manager, _manager != address(0));
    }
    
    /**
     * @dev Legacy function for backward compatibility
     */
    function setAuthorizedBurner(address burner, bool authorized) external onlyRole(ADMIN_ROLE) {
        authorizedBurners[burner] = authorized;
        if (authorized) {
            _grantRole(BURNER_ROLE, burner);
        } else {
            _revokeRole(BURNER_ROLE, burner);
        }
        emit BurnerAuthorized(burner, authorized);
    }
    
    function setPrizePool(address pool) external onlyRole(ADMIN_ROLE) {
        prizePool = pool;
        if (pool != address(0)) {
            _isExcludedFromFee[pool] = true;
            _isExcludedFromLimits[pool] = true;
        }
        emit PrizePoolUpdated(pool);
    }
    
    function setMaxDailyVolume(uint256 _max) external onlyRole(ADMIN_ROLE) {
        require(_max >= INITIAL_SUPPLY / 100, "Max too low");
        maxDailyVolume = _max;
        emit MaxDailyVolumeUpdated(_max);
    }
    
    function setCircuitBreakerEnabled(bool _enabled) external onlyRole(ADMIN_ROLE) {
        circuitBreakerEnabled = _enabled;
    }
    
    function setNormalFee(uint256 fee_) external onlyRole(ADMIN_ROLE) {
        require(fee_ <= 500, "Fee too high");
        normalFee = fee_;
    }
    
    function setLimits(uint256 maxTx_, uint256 maxWallet_) external onlyRole(ADMIN_ROLE) {
        maxTxAmount = maxTx_;
        maxWalletAmount = maxWallet_;
        emit LimitsUpdated(maxTx_, maxWallet_);
    }
    
    function setPenaltyBlocks(uint256 blocks_) external onlyRole(ADMIN_ROLE) {
        penaltyBlocks = blocks_;
    }
    
    function setCooldownBlocks(uint256 blocks_) external onlyRole(ADMIN_ROLE) {
        cooldownBlocks = blocks_;
    }
    
    function setMaxSwapImpactBps(uint256 bps) external onlyRole(ADMIN_ROLE) {
        require(bps >= 25 && bps <= 1000, "Impact out of range");
        maxSwapImpactBps = bps;
    }
    
    function setSameBlockGuard(bool enabled) external onlyRole(ADMIN_ROLE) {
        sameBlockGuard = enabled;
    }
    
    // ============ WITHDRAWAL PATTERN ============
    
    function queueWithdrawal(address user, uint256 amount) external {
        require(msg.sender == campaignManager, "Only campaign manager");
        pendingWithdrawals[user] += amount;
        totalPendingWithdrawals += amount;
        emit WithdrawalQueued(user, amount);
    }
    
    function processWithdrawal() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawal");
        require(balanceOf(address(this)) >= amount, "Insufficient balance");
        
        pendingWithdrawals[msg.sender] = 0;
        totalPendingWithdrawals -= amount;
        
        _transfer(address(this), msg.sender, amount);
        emit WithdrawalProcessed(msg.sender, amount);
    }
    
    // ============ BURN FUNCTIONS ============
    
    /**
     * @dev Enhanced burnFrom with multiple authorization methods
     */
    function burnFrom(address account, uint256 amount) public override {
        // Check multiple authorization methods for compatibility
        bool isAuthorized = (
            msg.sender == campaignManager ||
            authorizedBurners[msg.sender] ||
            hasRole(BURNER_ROLE, msg.sender) ||
            hasRole(ADMIN_ROLE, msg.sender)
        );
        
        if (isAuthorized) {
            _burn(account, amount);
            totalBurned += amount;
            emit TokensBurned(account, amount);
            emit TokensBurnedByCampaign(msg.sender, amount);
        } else {
            // Standard ERC20 burnFrom with allowance
            super.burnFrom(account, amount);
            totalBurned += amount;
            emit TokensBurned(account, amount);
        }
    }
    
    function burn(uint256 amount) public override {
        super.burn(amount);
        totalBurned += amount;
        emit TokensBurned(msg.sender, amount);
    }
    
    // ============ MINT FUNCTION (TESTNET) ============
    
    function mint(address to, uint256 amount) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(to != address(0), "Invalid recipient");
        require(totalSupply() + amount <= MAX_SUPPLY, "Cap exceeded");
        _mint(to, amount);
    }
    
    // ============ FEE CALCULATION ============
    
    function _currentFee() internal view returns (uint256) {
        if (!tradingEnabled) return 0;
        
        uint256 _launchBlock = launchBlock;
        uint256 _penaltyBlocks = penaltyBlocks;
        uint256 since = block.number - _launchBlock;
        
        if (since < _penaltyBlocks) {
            return MAX_PENALTY_FEE; // 50% max penalty
        } else if (since < _penaltyBlocks + 10) {
            return 2000; // 20% for next 10 blocks
        } else {
            return normalFee; // steady-state fee
        }
    }
    
    // ============ CIRCUIT BREAKER ============
    
    function _updateDailyVolume(uint256 amount) internal {
        uint256 today = block.timestamp / 1 days;
        
        if (today > currentDay) {
            emit DailyVolumeReset(today, currentDayVolume);
            currentDay = today;
            currentDayVolume = amount;
        } else {
            currentDayVolume += amount;
        }
        
        if (circuitBreakerEnabled && currentDayVolume > maxDailyVolume) {
            emit CircuitBreakerTriggered(currentDayVolume, maxDailyVolume);
            revert("Daily volume limit exceeded");
        }
    }
    
    // ============ TRANSFER LOGIC ============
    
    function _update(address from, address to, uint256 value) 
        internal 
        override 
        whenNotPaused 
    {
        // Skip all checks for minting/burning
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }
        
        // Gas optimization
        bool _tradingEnabled = tradingEnabled;
        address _pancakePair = pancakePair;
        
        // Trading gate
        require(
            _tradingEnabled || _isExcludedFromFee[from] || _isExcludedFromFee[to],
            "Trading not active"
        );
        
        // Blacklist check
        require(!isBot[from] && !isBot[to], "Bot blocked");
        
        // Circuit breaker for DEX trades
        if (_pancakePair != address(0) && (from == _pancakePair || to == _pancakePair)) {
            _updateDailyVolume(value);
            
            // Cooldown enforcement
            if (cooldownBlocks > 0) {
                address actor = (from == _pancakePair) ? to : from;
                if (!_isExcludedFromFee[actor]) {
                    uint256 last = _lastTxBlock[actor];
                    require(block.number > last + cooldownBlocks, "Cooldown active");
                    _lastTxBlock[actor] = block.number;
                }
            }
            
            // Anti-sandwich checks
            _enforceAntiSandwich(from, to, value);
            
            // Buy limits
            if (from == _pancakePair && !_isExcludedFromLimits[to]) {
                require(value <= maxTxAmount, "Exceeds max tx");
                require(balanceOf(to) + value <= maxWalletAmount, "Exceeds max wallet");
            }
            
            // Sell limits
            if (to == _pancakePair && !_isExcludedFromLimits[from]) {
                _enforceEarlySellLimit(value);
            }
        }
        
        // Calculate fees
        uint256 feeAmount = 0;
        if (!_isExcludedFromFee[from] && !_isExcludedFromFee[to] && _pancakePair != address(0)) {
            bool isSell = to == _pancakePair;
            bool isBuy = from == _pancakePair;
            
            if (isSell || (taxBuys && isBuy)) {
                uint256 feeRate = _currentFee();
                if (feeRate > 0) {
                    feeAmount = (value * feeRate) / FEE_DENOM;
                    if (feeAmount > 0) {
                        super._update(from, address(this), feeAmount);
                        totalFeesCollected += feeAmount;
                    }
                }
            }
        }
        
        // Update same-block guard
        if (sameBlockGuard && _pancakePair != address(0) && (from == _pancakePair || to == _pancakePair)) {
            address actor = (from == _pancakePair) ? to : from;
            _lastTradeBlock[actor] = block.number;
        }
        
        super._update(from, to, value - feeAmount);
    }
    
    function _enforceAntiSandwich(address from, address to, uint256 amount) internal {
        address _pancakePair = pancakePair;
        
        if (_pancakePair == address(0) || (from != _pancakePair && to != _pancakePair)) return;
        
        // Same-block guard
        if (sameBlockGuard) {
            address actor = (from == _pancakePair) ? to : from;
            if (_lastTradeBlock[actor] == block.number) {
                emit ImpactCheckFailed(actor, 0, 0);
                revert("Same-block trade");
            }
        }
        
        // Price impact check
        try IUniswapV2Pair(_pancakePair).getReserves() returns (uint112 r0, uint112 r1, uint32) {
            if (r0 == 0 || r1 == 0) return;
            
            address t0 = IUniswapV2Pair(_pancakePair).token0();
            uint256 tokenReserves = (t0 == address(this)) ? uint256(r0) : uint256(r1);
            
            if (tokenReserves < minReservesForImpact) return;
            
            uint256 impactBps = (amount * FEE_DENOM) / tokenReserves;
            uint256 maxAllowed = _getMaxImpact();
            
            if (impactBps > maxAllowed) {
                emit ImpactCheckFailed(msg.sender, impactBps, maxAllowed);
                revert("Price impact too high");
            }
        } catch {
            // Pair not initialized yet
            return;
        }
    }
    
    function _getMaxImpact() internal view returns (uint256) {
        if (!tradingEnabled) return maxSwapImpactBps;
        
        uint256 since = block.number - launchBlock;
        return since < impactGraceBlocks ? graceImpactBps : maxSwapImpactBps;
    }
    
    function _enforceEarlySellLimit(uint256 amount) internal view {
        if (!tradingEnabled) return;
        
        uint256 since = block.number - launchBlock;
        if (since >= sellLimitGraceBlocks) return;
        
        address _pancakePair = pancakePair;
        if (_pancakePair == address(0)) return;
        
        try IUniswapV2Pair(_pancakePair).getReserves() returns (uint112 r0, uint112 r1, uint32) {
            if (r0 == 0 || r1 == 0) return;
            
            address t0 = IUniswapV2Pair(_pancakePair).token0();
            uint256 tokenReserves = (t0 == address(this)) ? uint256(r0) : uint256(r1);
            if (tokenReserves == 0) return;
            
            uint256 bpsOfReserves = (amount * FEE_DENOM) / tokenReserves;
            require(bpsOfReserves <= maxSellBpsOfReserves, "Sell too large");
        } catch {
            return;
        }
    }
    
    // ============ FEE MANAGEMENT ============
    
    function routeFeesToPrizePool(uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(prizePool != address(0), "Prize pool not set");
        uint256 bal = balanceOf(address(this)) - totalPendingWithdrawals;
        require(bal > 0, "No fees available");
        
        if (amount == 0 || amount > bal) amount = bal;
        
        _transfer(address(this), prizePool, amount);
        emit FeesRouted(prizePool, amount);
    }
    
    // ============ RECOVERY FUNCTIONS ============
    
    function recoverERC20(address token, address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(token != address(this), "Cannot recover SQUDY");
        IERC20(token).safeTransfer(to, amount);
    }
    
    function recoverETH(address payable to) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        (bool success, ) = to.call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function circulatingSupply() external view returns (uint256) {
        return totalSupply();
    }
    
    function getBurnStats() external view returns (
        uint256 burned,
        uint256 circulating,
        uint256 burnRate
    ) {
        burned = totalBurned;
        circulating = totalSupply();
        burnRate = INITIAL_SUPPLY > 0 ? (burned * 10000) / INITIAL_SUPPLY : 0;
    }
    
    // ============ DISABLE OWNERSHIP RENOUNCEMENT ============
    
    function renounceRole(bytes32 role, address account) public override {
        require(role != DEFAULT_ADMIN_ROLE, "Cannot renounce admin role");
        super.renounceRole(role, account);
    }
    
    receive() external payable {}
}
