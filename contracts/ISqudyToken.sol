// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISqudyToken
 * @dev Interface for the SQUDY token contract (BEP-20)
 */
interface ISqudyToken {
    /**
     * @dev Returns the name of the token
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals of the token
     */
    function decimals() external view returns (uint8);

    /**
     * @dev Returns the total supply of the token
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the balance of the specified account
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Transfers tokens from the caller to the specified recipient
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the allowance given to spender by owner
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Approves the specified address to spend the specified amount of tokens
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Transfers tokens from one address to another using the allowance mechanism
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @dev Burns tokens from the caller's account
     */
    function burn(uint256 amount) external;

    /**
     * @dev Burns tokens from the specified account (requires allowance)
     */
    function burnFrom(address account, uint256 amount) external;

    /**
     * @dev Emitted when tokens are transferred
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when allowance is set
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Emitted when tokens are burned
     */
    event Burn(address indexed from, uint256 value);
} 