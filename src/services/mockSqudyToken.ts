import { ethers } from 'ethers';
import { toast } from 'sonner';

// Mock SQUDY Token implementation for testing
export class MockSqudyToken {
  private userBalances: Map<string, ethers.BigNumber> = new Map();
  private userAllowances: Map<string, Map<string, ethers.BigNumber>> = new Map();
  private _decimals = 18;
  private _name = 'Mock SQUDY Token';
  private _symbol = 'mSQUDY';
  private _totalSupply = ethers.utils.parseUnits('1000000', 18); // 1M tokens

  constructor() {
    // Initialize with some default balances for testing
    this.initializeTestBalances();
  }

  private initializeTestBalances() {
    // Give all connected wallets some test tokens
    const defaultBalance = ethers.utils.parseUnits('10000', this._decimals); // 10k tokens per wallet
    
    // We'll add balances when wallets connect
    console.log('Mock SQUDY Token initialized with default test balances');
  }

  // Ensure user has test tokens
  private ensureUserHasTokens(address: string) {
    if (!this.userBalances.has(address.toLowerCase())) {
      const testBalance = ethers.utils.parseUnits('10000', this._decimals); // 10k tokens
      this.userBalances.set(address.toLowerCase(), testBalance);
      console.log(`🎁 Gifted ${ethers.utils.formatUnits(testBalance, this._decimals)} mSQUDY tokens to ${address}`);
      toast.success(`🎁 You received 10,000 mock SQUDY tokens for testing!`);
    }
  }

  // ERC20-like interface methods
  async name(): Promise<string> {
    return this._name;
  }

  async symbol(): Promise<string> {
    return this._symbol;
  }

  async decimals(): Promise<number> {
    return this._decimals;
  }

  async totalSupply(): Promise<ethers.BigNumber> {
    return this._totalSupply;
  }

  async balanceOf(address: string): Promise<ethers.BigNumber> {
    this.ensureUserHasTokens(address);
    return this.userBalances.get(address.toLowerCase()) || ethers.constants.Zero;
  }

  async allowance(owner: string, spender: string): Promise<ethers.BigNumber> {
    this.ensureUserHasTokens(owner);
    const ownerAllowances = this.userAllowances.get(owner.toLowerCase());
    if (!ownerAllowances) return ethers.constants.Zero;
    return ownerAllowances.get(spender.toLowerCase()) || ethers.constants.Zero;
  }

  async approve(owner: string, spender: string, amount: ethers.BigNumber): Promise<boolean> {
    this.ensureUserHasTokens(owner);
    
    if (!this.userAllowances.has(owner.toLowerCase())) {
      this.userAllowances.set(owner.toLowerCase(), new Map());
    }
    
    const ownerAllowances = this.userAllowances.get(owner.toLowerCase())!;
    ownerAllowances.set(spender.toLowerCase(), amount);
    
    console.log(`✅ Approved ${ethers.utils.formatUnits(amount, this._decimals)} mSQUDY from ${owner} to ${spender}`);
    toast.success(`Approved ${ethers.utils.formatUnits(amount, this._decimals)} mSQUDY tokens`);
    
    return true;
  }

  async transfer(from: string, to: string, amount: ethers.BigNumber): Promise<boolean> {
    this.ensureUserHasTokens(from);
    
    const fromBalance = this.userBalances.get(from.toLowerCase()) || ethers.constants.Zero;
    if (fromBalance.lt(amount)) {
      throw new Error('Insufficient balance for transfer');
    }

    // Update balances
    this.userBalances.set(from.toLowerCase(), fromBalance.sub(amount));
    
    const toBalance = this.userBalances.get(to.toLowerCase()) || ethers.constants.Zero;
    this.userBalances.set(to.toLowerCase(), toBalance.add(amount));
    
    console.log(`💸 Transferred ${ethers.utils.formatUnits(amount, this._decimals)} mSQUDY from ${from} to ${to}`);
    
    return true;
  }

  // Helper method to add more tokens for testing
  mintTokens(address: string, amount: string) {
    const amountBN = ethers.utils.parseUnits(amount, this._decimals);
    const currentBalance = this.userBalances.get(address.toLowerCase()) || ethers.constants.Zero;
    this.userBalances.set(address.toLowerCase(), currentBalance.add(amountBN));
    console.log(`🏭 Minted ${amount} mSQUDY tokens to ${address}`);
    toast.success(`🏭 Minted ${amount} mock SQUDY tokens for testing!`);
  }

  // Method to reset balances for testing
  resetBalances() {
    this.userBalances.clear();
    this.userAllowances.clear();
    console.log('🔄 Reset all mock token balances');
  }

  // Campaign token burning simulation
  burnCampaignTokens(campaignId: number) {
    // In a real implementation, this would burn the actual staked tokens
    // For mock purposes, we'll simulate by reducing the total supply
    const burnAmount = ethers.utils.parseUnits('1000', this._decimals); // Simulate burning 1000 tokens
    
    if (this._totalSupply.gte(burnAmount)) {
      this._totalSupply = this._totalSupply.sub(burnAmount);
      console.log(`🔥 Mock: Burned ${ethers.utils.formatUnits(burnAmount, this._decimals)} tokens for campaign ${campaignId}`);
      console.log(`📊 New total supply: ${ethers.utils.formatUnits(this._totalSupply, this._decimals)} mSQUDY`);
      toast.success(`🔥 Burned ${ethers.utils.formatUnits(burnAmount, this._decimals)} tokens from total supply`);
    } else {
      console.log('⚠️ Mock: Not enough tokens in supply to burn');
      toast.error('Not enough tokens in supply to burn');
    }
  }
}

// Singleton instance for the app
export const mockSqudyToken = new MockSqudyToken();