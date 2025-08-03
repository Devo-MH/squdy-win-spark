// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleMockSqudyToken {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;
    string public name = "Mock SQUDY Token";
    string public symbol = "SQUDY";
    uint8 public decimals = 18;
    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        uint256 initialSupply = 1000000 * 10**decimals; // 1M tokens
        _totalSupply = initialSupply;
        _balances[msg.sender] = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        address from = msg.sender;
        _transfer(from, to, amount);
        return true;
    }

    function allowance(address ownerAddr, address spender) public view returns (uint256) {
        return _allowances[ownerAddr][spender];
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        address ownerAddr = msg.sender;
        _approve(ownerAddr, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        address spender = msg.sender;
        uint256 currentAllowance = allowance(from, spender);
        require(currentAllowance >= amount, "ERC20: insufficient allowance");
        
        _transfer(from, to, amount);
        _approve(from, spender, currentAllowance - amount);

        return true;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "ERC20: mint to zero address");

        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from zero address");
        require(to != address(0), "ERC20: transfer to zero address");

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        
        _balances[from] = fromBalance - amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _approve(address ownerAddr, address spender, uint256 amount) internal {
        require(ownerAddr != address(0), "ERC20: approve from zero address");
        require(spender != address(0), "ERC20: approve to zero address");

        _allowances[ownerAddr][spender] = amount;
        emit Approval(ownerAddr, spender, amount);
    }

    // Convenience function for testing - gives free tokens to anyone
    function getFreeTokens() public {
        require(_balances[msg.sender] < 10000 * 10**decimals, "Already has enough tokens");
        
        uint256 freeAmount = 1000 * 10**decimals; // 1000 tokens
        _balances[msg.sender] += freeAmount;
        _totalSupply += freeAmount;
        
        emit Transfer(address(0), msg.sender, freeAmount);
    }
}