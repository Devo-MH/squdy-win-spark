// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SqudyTokenV2
 * @notice Mintable/Pausable/Burnable ERC20 with roles and a controlled faucet for testnets.
 * - Roles: DEFAULT_ADMIN, MINTER, BURNER, PAUSER, RESCUER, FAUCET
 * - Cap: totalSupply may not exceed `cap`
 * - Faucet: role-gated mint with per-tx cap (for Sepolia testing)
 * - Recover functions: rescue other ERC20s or this token accidentally sent to the contract
 */
contract SqudyTokenV2 is ERC20, ERC20Burnable, AccessControl, Pausable {
  bytes32 public constant MINTER_ROLE  = keccak256("MINTER_ROLE");
  bytes32 public constant BURNER_ROLE  = keccak256("BURNER_ROLE");
  bytes32 public constant PAUSER_ROLE  = keccak256("PAUSER_ROLE");
  bytes32 public constant RESCUER_ROLE = keccak256("RESCUER_ROLE");
  bytes32 public constant FAUCET_ROLE  = keccak256("FAUCET_ROLE");

  // Hard cap on total supply
  uint256 public immutable cap;

  // Faucet configuration (per-transaction limit)
  uint256 public faucetMaxPerTx;

  event FaucetMaxPerTxUpdated(uint256 newMax);

  constructor(
    string memory name_,
    string memory symbol_,
    address admin_,
    uint256 initialSupply,
    uint256 cap_
  ) ERC20(name_, symbol_) {
    require(admin_ != address(0), "admin=0");
    require(cap_ > 0, "cap=0");
    require(initialSupply <= cap_, "initial > cap");
    cap = cap_;

    _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    _grantRole(MINTER_ROLE, admin_);
    _grantRole(PAUSER_ROLE, admin_);
    _grantRole(RESCUER_ROLE, admin_);
    _grantRole(FAUCET_ROLE, admin_);

    faucetMaxPerTx = 1_000 ether; // sensible default for testnets

    if (initialSupply > 0) {
      _mint(admin_, initialSupply);
    }
  }

  // ============ Minting/Burning ============

  function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
    require(totalSupply() + amount <= cap, "cap exceeded");
    _mint(to, amount);
  }

  // Restrict burnFrom to burner role (holders can still call burn for their own balance)
  function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
    _burn(account, amount);
  }

  // ============ Faucet (testnet utility) ============

  function faucet(address to, uint256 amount) external onlyRole(FAUCET_ROLE) {
    require(amount > 0 && amount <= faucetMaxPerTx, "invalid faucet amount");
    require(totalSupply() + amount <= cap, "cap exceeded");
    _mint(to, amount);
  }

  function setFaucetMaxPerTx(uint256 newMax) external onlyRole(DEFAULT_ADMIN_ROLE) {
    faucetMaxPerTx = newMax;
    emit FaucetMaxPerTxUpdated(newMax);
  }

  // ============ Pause Controls ============

  function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
  function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

  function _update(address from, address to, uint256 value)
    internal
    override(ERC20)
    whenNotPaused
  {
    super._update(from, to, value);
  }

  // ============ Rescue Utilities ============

  function recoverERC20(address token, address to, uint256 amount) external onlyRole(RESCUER_ROLE) {
    require(to != address(0), "to=0");
    IERC20(token).transfer(to, amount);
  }

  function recoverOwnTokens(address to, uint256 amount) external onlyRole(RESCUER_ROLE) {
    require(to != address(0), "to=0");
    _transfer(address(this), to, amount);
  }
}


