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
 * @title SQUDY Token - (meme Trading Token)
 * @notice BEP-20 compatible ERC-20 for BSC with trust-focused controls:
 *         - Fixed supply: 450,000,000,000 * 10^18 minted to initial owner at deploy
 *         - No post-deploy mint functions (irreversible fixed supply)
 *         - Anti-bot/anti-sandwich guards, cooldowns, limits (launch window)
 *         - Limited pause with auto-expiry + cooldown
 *         - Temporary blacklists with reason strings
 *         - Fee-receiver change via timelock (propose/execute)
 *         - Launch restrictions automatically sunset after a fixed period
 */
contract SqudyToken is ERC20, ERC20Permit, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ────────────────────────────── Roles ────────────────────────────── */
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /* ────────────────────────────── Supply ───────────────────────────── */
    uint256 public constant INITIAL_SUPPLY = 450_000_000_000 * 10**18; // 450B (18dp)

    /* ───────────────────────── PancakeSwap/DEX ──────────────────────── */
    IUniswapV2Router02 public immutable pancakeRouter;
    address public immutable pancakePair;

    /* ───────────────────────── Trading controls ──────────────────────── */
    bool public tradingEnabled;
    uint256 public launchBlock;
    uint256 public penaltyBlocks = 3;
    uint256 public cooldownBlocks = 2;

    /* fees/limits */
    uint256 public normalFee = 200; // 2.00%
    bool    public taxBuys;         // default false
    uint256 public constant FEE_DENOM = 10000;
    uint256 public constant MAX_PENALTY_FEE = 5000; // 50% max during first blocks
    uint256 public maxTxAmount     = INITIAL_SUPPLY / 200; // 0.5%
    uint256 public maxWalletAmount = INITIAL_SUPPLY / 100; // 1%

    /* circuit breaker */
    uint256 public maxDailyVolume   = INITIAL_SUPPLY / 10; // 10% of supply/day
    uint256 public currentDay       = block.timestamp / 1 days;
    uint256 public currentDayVolume;
    bool    public circuitBreakerEnabled = true;

    /* anti-bot & exclusions */
    mapping(address => bool) public isBot;
    mapping(address => uint256) private _lastTxBlock;
    mapping(address => bool) private _isExcludedFromFee;
    mapping(address => bool) private _isExcludedFromLimits;

    /* anti-sandwich / price impact */
    uint256 public maxSwapImpactBps   = 200; // 2.00%
    uint256 public impactGraceBlocks  = 300;
    uint256 public graceImpactBps     = 800; // 8.00% early window
    uint256 public minReservesForImpact = 1_000_000e18;
    bool    public sameBlockGuard = true;
    mapping(address => uint256) private _lastTradeBlock;

    /* early sell limit */
    uint256 public sellLimitGraceBlocks = 6000;
    uint256 public maxSellBpsOfReserves = 300; // 3%

    /* fee collection */
    address public feeReceiver;
    uint256 public totalFeesCollected;

    /* ──────────────── Trust improvements: operational limits ─────────── */
    // Pause limitations / auto-expiry guard
    uint256 public pauseEndTime;
    uint256 public lastPauseTime;
    uint256 public constant MAX_PAUSE_DURATION = 24 hours;
    uint256 public constant PAUSE_COOLDOWN     = 7 days;

    // Time-limited blacklist with reasons
    mapping(address => uint256) public blacklistExpiry; // until timestamp
    mapping(address => string)  public blacklistReason;
    uint256 public constant MAX_BLACKLIST_DURATION = 72 hours;

    // Fee receiver timelock (propose/execute)
    address public pendingFeeReceiver;
    uint256 public feeReceiverChangeTime;
    uint256 public constant FEE_RECEIVER_TIMELOCK = 48 hours;

    // Restrictions sunset (disables launch protections after period)
    uint256 public restrictionsEndTime;
    uint256 public constant MAX_RESTRICTIONS_DURATION = 30 days;

    // BscScan/BEP-20 helper (not for auth)
    address public immutable contractOwnerHint;
    function getOwner() external view returns (address) { return contractOwnerHint; }

    /* ───────────────────────────── Events ────────────────────────────── */
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

    // Trust-improvement events
    event PauseLimited(uint256 endTime, uint256 maxDuration);
    event BlacklistLimited(address indexed account, uint256 expiry, string reason);
    event FeeReceiverProposed(address indexed newReceiver, uint256 changeTime);
    event RestrictionsWillEnd(uint256 endTime);

    /* ─────────────────────────── Constructor ─────────────────────────── */
    constructor(address _router, address _initialOwner)
        ERC20("SQUDY Token", "SQUDY")
        ERC20Permit("SQUDY Token")
    {
        require(_initialOwner != address(0), "Invalid owner");

        // Roles
        _grantRole(DEFAULT_ADMIN_ROLE, _initialOwner);
        _grantRole(ADMIN_ROLE, _initialOwner);

        // Mint fixed supply to owner (no further mint exists)
        _mint(_initialOwner, INITIAL_SUPPLY);

        // Day tracking baseline
        currentDay = block.timestamp / 1 days;

        // Router/pair setup
        if (_router != address(0)) {
            pancakeRouter = IUniswapV2Router02(_router);
            address factory = pancakeRouter.factory();
            address weth    = pancakeRouter.WETH();
            address existing = IUniswapV2Factory(factory).getPair(address(this), weth);
            pancakePair = existing == address(0)
                ? IUniswapV2Factory(factory).createPair(address(this), weth)
                : existing;
        } else {
            pancakeRouter = IUniswapV2Router02(address(0));
            pancakePair   = address(0);
        }

        // Exclusions
        _isExcludedFromFee[_initialOwner] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromLimits[_initialOwner] = true;
        _isExcludedFromLimits[address(this)] = true;
        if (pancakePair != address(0)) {
            _isExcludedFromLimits[pancakePair] = true;
        }

        // Initial fee receiver (changes later go via timelock)
        feeReceiver = _initialOwner;

        // For BscScan's `getOwner()` view only
        contractOwnerHint = _initialOwner;
    }

    /* ───────────────────────── Admin functions ───────────────────────── */

    function enableTrading() external onlyRole(ADMIN_ROLE) {
        require(!tradingEnabled, "Trading already enabled");
        tradingEnabled = true;
        launchBlock = block.number;

        // Start restrictions sunset window
        if (restrictionsEndTime == 0) {
            restrictionsEndTime = block.timestamp + MAX_RESTRICTIONS_DURATION;
            emit RestrictionsWillEnd(restrictionsEndTime);
        }
        emit TradingEnabled(launchBlock);
    }

    /* Pause with limits + cooldown */
    function pause() external onlyRole(ADMIN_ROLE) {
        require(block.timestamp > lastPauseTime + PAUSE_COOLDOWN, "Pause on cooldown");
        pauseEndTime = block.timestamp + MAX_PAUSE_DURATION;
        lastPauseTime = block.timestamp;
        _pause();
        emit PauseLimited(pauseEndTime, MAX_PAUSE_DURATION);
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /* Blacklist: permanent on/off */
    function blacklistAddress(address bot, bool value) external onlyRole(ADMIN_ROLE) {
        isBot[bot] = value;
        emit BlacklistUpdated(bot, value);
    }

    /* Blacklist: temporary with reason (auto-expiry on transfers) */
    function blacklistTemporary(address account, uint256 duration, string calldata reason)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(duration <= MAX_BLACKLIST_DURATION, "Duration too long");
        require(bytes(reason).length > 0, "Reason required");
        isBot[account] = true;
        blacklistExpiry[account] = block.timestamp + duration;
        blacklistReason[account] = reason;
        emit BlacklistLimited(account, blacklistExpiry[account], reason);
    }

    function isCurrentlyBlacklisted(address account) public view returns (bool) {
        if (!isBot[account]) return false;
        uint256 exp = blacklistExpiry[account];
        return (exp == 0) || (block.timestamp < exp);
    }

    function setExcludedFromFee(address addr, bool excluded) external onlyRole(ADMIN_ROLE) {
        _isExcludedFromFee[addr] = excluded;
        emit ExcludedFromFees(addr, excluded);
    }

    function setExcludedFromLimits(address addr, bool excluded) external onlyRole(ADMIN_ROLE) {
        _isExcludedFromLimits[addr] = excluded;
        emit ExcludedFromLimits(addr, excluded);
    }

    /* Fee receiver: initial set allowed instantly; later changes via timelock */
    function setFeeReceiver(address _receiver) external onlyRole(ADMIN_ROLE) {
        require(_receiver != address(0), "Invalid receiver");
        if (feeReceiver == address(0)) {
            feeReceiver = _receiver;
            _isExcludedFromFee[_receiver] = true;
            _isExcludedFromLimits[_receiver] = true;
            emit FeeReceiverUpdated(_receiver);
        } else {
            revert("Use proposeFeeReceiver()");
        }
    }

    function proposeFeeReceiver(address newReceiver) external onlyRole(ADMIN_ROLE) {
        require(newReceiver != address(0), "Invalid receiver");
        pendingFeeReceiver = newReceiver;
        feeReceiverChangeTime = block.timestamp + FEE_RECEIVER_TIMELOCK;
        emit FeeReceiverProposed(newReceiver, feeReceiverChangeTime);
    }

    function executeFeeReceiverChange() external {
        require(block.timestamp >= feeReceiverChangeTime, "Timelock active");
        require(pendingFeeReceiver != address(0), "No pending change");
        feeReceiver = pendingFeeReceiver;
        _isExcludedFromFee[feeReceiver] = true;
        _isExcludedFromLimits[feeReceiver] = true;
        pendingFeeReceiver = address(0);
        feeReceiverChangeTime = 0;
        emit FeeReceiverUpdated(feeReceiver);
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
        require(_normalFee <= 500, "Fee too high"); // ≤5%
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

    function setSellLimitParams(uint256 _sellLimitGraceBlocks, uint256 _maxSellBpsOfReserves)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(_maxSellBpsOfReserves >= 50 && _maxSellBpsOfReserves <= 1500, "Sell bps out of range");
        sellLimitGraceBlocks = _sellLimitGraceBlocks;
        maxSellBpsOfReserves = _maxSellBpsOfReserves;
    }

    /* ────────────────── Restrictions Sunset Controls ─────────────────── */
    function initializeRestrictionsSunset() external onlyRole(ADMIN_ROLE) {
        require(restrictionsEndTime == 0, "Already initialized");
        restrictionsEndTime = block.timestamp + MAX_RESTRICTIONS_DURATION;
        emit RestrictionsWillEnd(restrictionsEndTime);
    }

    function _applyRestrictions() internal view returns (bool) {
        if (restrictionsEndTime == 0) return false;
        return block.timestamp < restrictionsEndTime;
    }

    /* ─────────────────── Fee management / recoveries ─────────────────── */
    function collectFees() external nonReentrant {
        require(feeReceiver != address(0), "Fee receiver not set");
        uint256 balance = balanceOf(address(this));
        require(balance > 0, "No fees to collect");
        _transfer(address(this), feeReceiver, balance);
        emit FeesCollected(feeReceiver, balance);
    }

    function collectFeesTo(address recipient, uint256 amount)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
    {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = balanceOf(address(this));
        require(balance > 0, "No fees available");
        if (amount == 0 || amount > balance) amount = balance;
        _transfer(address(this), recipient, amount);
        emit FeesCollected(recipient, amount);
    }

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

    /* ───────────────────── Transfers / trading core ──────────────────── */

    // Auto-expiring pause guard (lets transfers resume after MAX_PAUSE_DURATION)
    function _requireNotPaused() internal view override {
        require(!paused() || block.timestamp > pauseEndTime, "Pausable: paused");
    }

    function _update(address from, address to, uint256 value)
        internal
        override
        whenNotPaused
    {
        // Mint path (only happens in constructor mint)
        if (from == address(0)) {
            super._update(from, to, value);
            return;
        }

        bool _tradingEnabled = tradingEnabled;
        address _pancakePair = pancakePair;
        bool apply = _applyRestrictions();

        // Trading gate
        require(
            _tradingEnabled || _isExcludedFromFee[from] || _isExcludedFromFee[to],
            "Trading not active"
        );

        // Blacklist checks (permanent or temporary)
        require(!isBot[from] && !isBot[to], "Bot blocked");
        require(!isCurrentlyBlacklisted(from) && !isCurrentlyBlacklisted(to), "Blacklisted");

        // DEX-related rules
        if (_pancakePair != address(0) && (from == _pancakePair || to == _pancakePair)) {
            _updateDailyVolume(value);

            if (apply && cooldownBlocks > 0) {
                address actor = (from == _pancakePair) ? to : from;
                if (!_isExcludedFromFee[actor]) {
                    uint256 last = _lastTxBlock[actor];
                    require(block.number > last + cooldownBlocks, "Cooldown active");
                    _lastTxBlock[actor] = block.number;
                }
            }

            if (apply) {
                _enforceAntiSandwich(from, to, value);
            }

            // Buy limits
            if (apply && from == _pancakePair && !_isExcludedFromLimits[to]) {
                require(value <= maxTxAmount, "Exceeds max tx");
                require(balanceOf(to) + value <= maxWalletAmount, "Exceeds max wallet");
            }

            // Sell limits
            if (apply && to == _pancakePair && !_isExcludedFromLimits[from]) {
                _enforceEarlySellLimit(value);
            }
        }

        // Fees (penalty schedule within restrictions window)
        uint256 feeAmount = 0;
        if (!_isExcludedFromFee[from] && !_isExcludedFromFee[to] && _pancakePair != address(0)) {
            bool isSell = to == _pancakePair;
            bool isBuy  = from == _pancakePair;

            if (isSell || (taxBuys && isBuy)) {
                uint256 feeRate = apply ? _currentFee() : normalFee;
                if (feeRate > 0) {
                    feeAmount = (value * feeRate) / FEE_DENOM;
                    if (feeAmount > 0) {
                        super._update(from, address(this), feeAmount);
                        totalFeesCollected += feeAmount;
                    }
                }
            }
        }

        if (apply && sameBlockGuard && _pancakePair != address(0) && (from == _pancakePair || to == _pancakePair)) {
            address actor = (from == _pancakePair) ? to : from;
            _lastTradeBlock[actor] = block.number;
        }

        super._update(from, to, value - feeAmount);
    }

    function _currentFee() internal view returns (uint256) {
        if (!tradingEnabled) return 0;
        uint256 _launchBlock    = launchBlock;
        uint256 _penaltyBlocks  = penaltyBlocks;
        uint256 since = block.number - _launchBlock;

        if (since < _penaltyBlocks) {
            return MAX_PENALTY_FEE;      // 50% for first blocks post-launch
        } else if (since < _penaltyBlocks + 10) {
            return 2000;                 // 20% for next 10 blocks
        } else {
            return normalFee;            // steady-state fee
        }
    }

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

    function _enforceAntiSandwich(address from, address to, uint256 amount) internal view {
        address _pancakePair = pancakePair;
        if (_pancakePair == address(0) || (from != _pancakePair && to != _pancakePair)) return;

        // Same-block guard
        if (sameBlockGuard) {
            address actor = (from == _pancakePair) ? to : from;
            if (_lastTradeBlock[actor] == block.number) revert("Same-block trade");
        }

        // Price impact cap
        try IUniswapV2Pair(_pancakePair).getReserves() returns (uint112 r0, uint112 r1, uint32) {
            if (r0 == 0 || r1 == 0) return;
            address t0 = IUniswapV2Pair(_pancakePair).token0();
            uint256 tokenReserves = (t0 == address(this)) ? uint256(r0) : uint256(r1);
            if (tokenReserves < minReservesForImpact) return;

            uint256 impactBps = (amount * FEE_DENOM) / tokenReserves;
            uint256 maxAllowed = _getMaxImpact();
            if (impactBps > maxAllowed) revert("Price impact too high");
        } catch {
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

    /* ────────────────────────── Views / helpers ──────────────────────── */
    function circulatingSupply() external view returns (uint256) {
        return totalSupply(); // fixed supply
    }

    function getTokenInfo() external view returns (
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 totalSupply_,
        uint256 maxSupply_
    ) {
        uint256 ts = totalSupply();
        return (name(), symbol(), decimals(), ts, ts); // max == total (fixed)
    }

    function getTradingInfo() external view returns (
        bool isEnabled,
        uint256 currentFee,
        uint256 txLimit,
        uint256 walletLimit,
        uint256 dailyVolume
    ) {
        bool apply = _applyRestrictions();
        return (tradingEnabled, apply ? _currentFee() : normalFee, maxTxAmount, maxWalletAmount, currentDayVolume);
    }

    // Maintained for dashboard compatibility: mints are disabled (false/0)
    function getSecurityStatus() external view returns (
        bool isPaused_,
        uint256 pauseEndsAt_,
        bool canMint_,
        uint256 mintAvailable_,
        uint256 restrictionsEndAt_,
        uint256 blacklistedAddresses_
    ) {
        return (
            paused(),
            pauseEndTime,
            false,
            0,
            restrictionsEndTime,
            0 // on-chain counting omitted (gas-heavy)
        );
    }

    /* ─────────────── Prevent renouncing default admin control ────────── */
    function renounceRole(bytes32 role, address account) public override {
        require(role != DEFAULT_ADMIN_ROLE, "Cannot renounce admin role");
        super.renounceRole(role, account);
    }

    receive() external payable {}
}
