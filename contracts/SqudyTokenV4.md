## Summary of Changes

I've successfully created a **simplified version** of the Squdy Token with the following modifications:

### ✅ **REMOVED Components:**

1. **All Burn Functions:**
    - Removed `burn()` function
    - Removed `burnFrom()` function
    - Removed ERC20Burnable inheritance
    - Removed `totalBurned` tracking
    - Removed `TokensBurned` events
2. **All Campaign Manager Relations:**
    - Removed `campaignManager` state variable
    - Removed `setCampaignManager()` function
    - Removed `authorizedBurners` mapping
    - Removed `setAuthorizedBurner()` function
    - Removed `queueWithdrawal()` function
    - Removed `processWithdrawal()` function
    - Removed withdrawal pattern components
    - Removed `prizePool` and related functions
    - Removed all campaign-related events

### ✅ **KEPT Components:**

1. **Core Trading Features:**
    - Anti-bot protection (cooldown, blacklist)
    - Anti-sandwich mechanisms
    - Dynamic fee structure
    - Buy/sell limits
    - Circuit breakers
2. **Essential Functions:**
    - ERC20 standard functions
    - Trading enable/disable
    - Fee collection and management
    - Admin controls
    - Recovery functions
3. **Security Features:**
    - Pausable mechanism
    - ReentrancyGuard
    - AccessControl roles
    - Input validation

### 📋 **New Simplified Structure:**

The token now functions as a **pure trading token** with:

- Standard ERC20 functionality
- Advanced anti-bot protection
- Fee collection mechanism
- No burning capability
- No campaign dependencies

### 🔧 **Key Changes:**

solidity

```solidity
// Old: Complex token with burn and campaign features
contract SqudyToken is ERC20, ERC20Burnable, ERC20Permit, AccessControl...

// New: Simplified trading token
contract SqudyToken is ERC20, ERC20Permit, AccessControl, Pausable, ReentrancyGuard
```

### 📊 **Fee Management Update:**

Instead of routing to campaign/prize pools, fees now:

1. Accumulate in the contract
2. Can be collected by designated `feeReceiver`
3. Admin can set and update fee receiver
4. Simple `collectFees()` function for fee distribution

This simplified version is:

- **Lighter** - Lower deployment cost
- **Simpler** - Easier to audit and maintain
- **Independent** - No external contract dependencies
- **Focused** - Pure trading token functionality

The token is now a standalone trading token that can work independently without any campaign management system!

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

/**
 * @title SqudyToken - Simplified Trading Token
 * @notice BEP-20 token with anti-bot and trading features (burn removed)
 * @dev Pure trading token without burn or campaign features
 * @author Squdy Team
 */
contract SqudyToken is ERC20, ERC20Permit, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ============ CONSTANTS ============
    uint256 public constant MAX_SUPPLY = 450_000_000_000 * 10**18; // 450B tokens max
    uint256 public constant INITIAL_SUPPLY = 450_000_000_000 * 10**18; // 450B initial
    uint256 public constant FEE_DENOM = 10000;
    uint256 public constant MAX_PENALTY_FEE = 5000; // 50% max penalty
    
    // ============ PANCAKESWAP ============
    IUniswapV2Router02 public immutable pancakeRouter;
    address public immutable pancakePair;
    
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
    
    // ============ FEE COLLECTION ============
    address public feeReceiver;
    uint256 public totalFeesCollected;
    
    // ============ EVENTS ============
    event TradingEnabled(uint256 indexed launchBlock);
    event BlacklistUpdated(address indexed bot, bool indexed value);
    event FeeReceiverUpdated(address indexed newReceiver);
    event FeesCollected(address indexed to, uint256 amount);
    event CircuitBreakerTriggered(uint256 volume, uint256 maxVolume);
    event ImpactCheckFailed(address indexed actor, uint256 impactBps, uint256 maxAllowed);
    event DailyVolumeReset(uint256 newDay, uint256 previousVolume);
    event MaxDailyVolumeUpdated(uint256 newMax);
    event ExcludedFromLimits(address indexed addr, bool excluded);
    event ExcludedFromFees(address indexed addr, bool excluded);
    event LimitsUpdated(uint256 maxTx, uint256 maxWallet);
    event FeesUpdated(uint256 normalFee, bool taxBuys);
    event AntiSandwichUpdated(uint256 maxImpactBps, bool sameBlockGuard);
    
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
        
        // Setup PancakeSwap
        if (_router != address(0)) {
            pancakeRouter = IUniswapV2Router02(_router);
            
            address factory = pancakeRouter.factory();
            address weth = pancakeRouter.WETH();
            
            address existing = IUniswapV2Factory(factory).getPair(address(this), weth);
            pancakePair = existing == address(0)
                ? IUniswapV2Factory(factory).createPair(address(this), weth)
                : existing;
        } else {
            // For testing without router
            pancakeRouter = IUniswapV2Router02(address(0));
            pancakePair = address(0);
        }
        
        // Setup exclusions
        _isExcludedFromFee[_initialOwner] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromLimits[_initialOwner] = true;
        _isExcludedFromLimits[address(this)] = true;
        if (pancakePair != address(0)) {
            _isExcludedFromLimits[pancakePair] = true;
        }
        
        // Set initial fee receiver
        feeReceiver = _initialOwner;
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
        emit ExcludedFromFees(addr, excluded);
    }
    
    function setExcludedFromLimits(address addr, bool excluded) external onlyRole(ADMIN_ROLE) {
        _isExcludedFromLimits[addr] = excluded;
        emit ExcludedFromLimits(addr, excluded);
    }
    
    function setFeeReceiver(address _receiver) external onlyRole(ADMIN_ROLE) {
        require(_receiver != address(0), "Invalid receiver");
        feeReceiver = _receiver;
        _isExcludedFromFee[_receiver] = true;
        _isExcludedFromLimits[_receiver] = true;
        emit FeeReceiverUpdated(_receiver);
    }
    
    function setMaxDailyVolume(uint256 _max) external onlyRole(ADMIN_ROLE) {
        require(_max >= INITIAL_SUPPLY / 100, "Max too low");
        maxDailyVolume = _max;
        emit MaxDailyVolumeUpdated(_max);
    }
    
    function setCircuitBreakerEnabled(bool _enabled) external onlyRole(ADMIN_ROLE) {
        circuitBreakerEnabled = _enabled;
    }
    
    function setFees(uint256 _normalFee, bool _taxBuys) external onlyRole(ADMIN_ROLE) {
        require(_normalFee <= 500, "Fee too high"); // Max 5%
        normalFee = _normalFee;
        taxBuys = _taxBuys;
        emit FeesUpdated(_normalFee, _taxBuys);
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
    
    function setAntiSandwichParams(
        uint256 _maxSwapImpactBps,
        uint256 _impactGraceBlocks,
        uint256 _graceImpactBps,
        bool _sameBlockGuard
    ) external onlyRole(ADMIN_ROLE) {
        require(_maxSwapImpactBps >= 25 && _maxSwapImpactBps <= 1000, "Impact out of range");
        require(_graceImpactBps >= 100 && _graceImpactBps <= 1500, "Grace impact out of range");
        
        maxSwapImpactBps = _maxSwapImpactBps;
        impactGraceBlocks = _impactGraceBlocks;
        graceImpactBps = _graceImpactBps;
        sameBlockGuard = _sameBlockGuard;
        
        emit AntiSandwichUpdated(_maxSwapImpactBps, _sameBlockGuard);
    }
    
    function setSellLimitParams(
        uint256 _sellLimitGraceBlocks,
        uint256 _maxSellBpsOfReserves
    ) external onlyRole(ADMIN_ROLE) {
        require(_maxSellBpsOfReserves >= 50 && _maxSellBpsOfReserves <= 1500, "Sell bps out of range");
        sellLimitGraceBlocks = _sellLimitGraceBlocks;
        maxSellBpsOfReserves = _maxSellBpsOfReserves;
    }
    
    // ============ MINT FUNCTION (TESTNET/REWARDS) ============
    
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
        // Skip all checks for minting
        if (from == address(0)) {
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
    
    function _enforceAntiSandwich(address from, address to, uint256 amount) internal view {
        address _pancakePair = pancakePair;
        
        if (_pancakePair == address(0) || (from != _pancakePair && to != _pancakePair)) return;
        
        // Same-block guard
        if (sameBlockGuard) {
            address actor = (from == _pancakePair) ? to : from;
            if (_lastTradeBlock[actor] == block.number) {
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
    
    function collectFees() external nonReentrant {
        require(feeReceiver != address(0), "Fee receiver not set");
        uint256 balance = balanceOf(address(this));
        require(balance > 0, "No fees to collect");
        
        _transfer(address(this), feeReceiver, balance);
        emit FeesCollected(feeReceiver, balance);
    }
    
    function collectFeesTo(address recipient, uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = balanceOf(address(this));
        require(balance > 0, "No fees available");
        
        if (amount == 0 || amount > balance) {
            amount = balance;
        }
        
        _transfer(address(this), recipient, amount);
        emit FeesCollected(recipient, amount);
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
    
    function getTokenInfo() external view returns (
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 totalSupply,
        uint256 maxSupply
    ) {
        return (
            name(),
            symbol(),
            decimals(),
            totalSupply(),
            MAX_SUPPLY
        );
    }
    
    function getTradingInfo() external view returns (
        bool isEnabled,
        uint256 currentFee,
        uint256 txLimit,
        uint256 walletLimit,
        uint256 dailyVolume
    ) {
        return (
            tradingEnabled,
            _currentFee(),
            maxTxAmount,
            maxWalletAmount,
            currentDayVolume
        );
    }
    
    // ============ DISABLE OWNERSHIP RENOUNCEMENT ============
    
    function renounceRole(bytes32 role, address account) public override {
        require(role != DEFAULT_ADMIN_ROLE, "Cannot renounce admin role");
        super.renounceRole(role, account);
    }
    
    receive() external payable {}
}
```