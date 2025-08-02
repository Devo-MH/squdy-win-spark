// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockSqudyToken
 * @dev Mock SQUDY token for Sepolia testnet testing
 * Provides the same interface as real SQUDY but allows minting for testing
 */
contract MockSqudyToken is ERC20, Ownable {
    uint8 private _decimals = 18;
    
    /**
     * @dev Constructor that gives msg.sender all of existing tokens
     */
    constructor() ERC20("Mock SQUDY Token", "mSQUDY") {
        // Mint initial supply to deployer for distribution
        _mint(msg.sender, 10_000_000 * 10**_decimals); // 10M tokens
    }
    
    /**
     * @dev Returns the number of decimals used to get its user representation
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Mint tokens to an address (only owner)
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from an address (only owner)
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
    
    /**
     * @dev Burn tokens from caller
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Airdrop tokens to multiple addresses (for testing)
     * @param recipients Array of addresses to receive tokens
     * @param amounts Array of amounts to send to each address
     */
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev Batch mint the same amount to multiple addresses
     * @param recipients Array of addresses to receive tokens
     * @param amount Amount to send to each address
     */
    function batchMint(address[] calldata recipients, uint256 amount) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amount);
        }
    }
    
    /**
     * @dev Emergency function to recover tokens sent to this contract
     * @param token The token contract address
     * @param to The address to send tokens to
     * @param amount The amount of tokens to send
     */
    function recoverTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).transfer(to, amount);
    }
    
    /**
     * @dev Simulate token burning by transferring to dead address
     * This is useful for testing the burning mechanism
     * @param amount The amount of tokens to burn
     */
    function simulateBurn(uint256 amount) external {
        transfer(address(0x000000000000000000000000000000000000dEaD), amount);
    }
}