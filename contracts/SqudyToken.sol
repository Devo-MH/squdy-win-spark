// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./ISqudyToken.sol";

/**
 * @title SqudyToken
 * @dev Real SQUDY token with deflationary burn mechanics
 * @author Squdy Team
 */
contract SqudyToken is ERC20, ERC20Burnable, Ownable, Pausable, ISqudyToken {
    
    // ============ CONSTANTS ============
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant MAX_SUPPLY = INITIAL_SUPPLY; // No minting after initial
    
    // ============ STATE VARIABLES ============
    mapping(address => bool) public authorizedBurners; // Contracts that can burn tokens
    uint256 public totalBurned; // Track total burned for analytics
    
    // ============ EVENTS ============
    event BurnerAuthorized(address indexed burner, bool authorized);
    event TokensBurnedByCampaign(address indexed campaign, uint256 amount);
    
    // ============ MODIFIERS ============
    modifier onlyAuthorizedBurner() {
        require(authorizedBurners[msg.sender] || msg.sender == owner(), "Not authorized to burn");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    constructor(address initialOwner) ERC20("SQUDY Token", "SQUDY") Ownable(initialOwner) {
        // Mint initial supply to owner
        _mint(initialOwner, INITIAL_SUPPLY);
        
        // Owner is automatically authorized to burn
        authorizedBurners[initialOwner] = true;
        
        emit BurnerAuthorized(initialOwner, true);
    }
    
    // ============ OWNER FUNCTIONS ============
    
    /**
     * @dev Authorize/deauthorize contracts to burn tokens (e.g., campaign managers)
     */
    function setAuthorizedBurner(address burner, bool authorized) external onlyOwner {
        authorizedBurners[burner] = authorized;
        emit BurnerAuthorized(burner, authorized);
    }
    
    /**
     * @dev Emergency pause functionality
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause functionality
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ BURN FUNCTIONS ============
    
    /**
     * @dev Burn tokens from a specific address (for campaign managers)
     * @param from Address to burn tokens from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) public override onlyAuthorizedBurner {
        require(from != address(0), "Cannot burn from zero address");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
        totalBurned += amount;
        
        emit TokensBurnedByCampaign(msg.sender, amount);
    }
    
    /**
     * @dev Enhanced burn function that tracks total burned
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        totalBurned += amount;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get the circulating supply (total supply minus burned)
     */
    function circulatingSupply() external view returns (uint256) {
        return totalSupply();
    }
    
    /**
     * @dev Get burn statistics
     */
    function getBurnStats() external view returns (uint256 burned, uint256 circulating, uint256 burnRate) {
        burned = totalBurned;
        circulating = totalSupply();
        burnRate = INITIAL_SUPPLY > 0 ? (burned * 10000) / INITIAL_SUPPLY : 0; // Basis points
    }
    
    // ============ OVERRIDES ============
    
    /**
     * @dev Override transfer to add pause functionality
     */
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
    
    /**
     * @dev Disable renouncing ownership for security
     */
    function renounceOwnership() public view override onlyOwner {
        revert("Ownership cannot be renounced");
    }
}