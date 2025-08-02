// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockSqudyToken
 * @dev Mock SQUDY token for testing purposes
 * @author Squdy Team
 */
contract MockSqudyToken is ERC20, ERC20Burnable, Ownable {
    uint8 private _decimals = 18;
    
    constructor() ERC20("Squdy Token", "SQUDY") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000000 * 10**decimals()); // 1 billion tokens
    }
    
    /**
     * @dev Returns the number of decimals used to get its user representation
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Mints tokens to the specified address (for testing)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burns tokens from the specified account (requires allowance)
     */
    function burnFrom(address account, uint256 amount) public virtual override {
        require(allowance(account, msg.sender) >= amount, "MockSqudyToken: insufficient allowance");
        _burn(account, amount);
    }
} 