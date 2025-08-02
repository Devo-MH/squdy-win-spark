import { ethers } from 'ethers';
import { toast } from 'sonner';

// Mock SQUDY Token implementation for testing
export class MockSqudyToken {
  private userBalances: Map<string, bigint> = new Map();
  private userAllowances: Map<string, Map<string, bigint>> = new Map();
  private decimals = 18n;
  private name = 'Mock SQUDY Token';
  private symbol = 'mSQUDY';
  private totalSupply = ethers.parseUnits('1000000', 18); // 1M tokens

  constructor() {
    // Initialize with some default balances for testing
    this.initializeTestBalances();
  }

  private initializeTestBalances() {
    // Give all connected wallets some test tokens
    const defaultBalance = ethers.parseUnits('10000', 18); // 10k tokens per wallet
    
    // We'll add balances when wallets connect
    console.log('Mock SQUDY Token initialized with default test balances');
  }

  // Ensure user has test tokens
  private ensureUserHasTokens(address: string) {
    if (!this.userBalances.has(address.toLowerCase())) {
      const testBalance = ethers.parseUnits('10000', 18); // 10k tokens
      this.userBalances.set(address.toLowerCase(), testBalance);
      console.log(`🎁 Gifted ${ethers.formatUnits(testBalance, 18)} mSQUDY tokens to ${address}`);
      toast.success(`🎁 You received 10,000 mock SQUDY tokens for testing!`);
    }
  }

  // ERC20-like interface methods
  async name(): Promise<string> {
    return this.name;
  }

  async symbol(): Promise<string> {
    return this.symbol;
  }

  async decimals(): Promise<bigint> {
    return this.decimals;
  }

  async totalSupply(): Promise<bigint> {
    return this.totalSupply;
  }

  async balanceOf(address: string): Promise<bigint> {
    this.ensureUserHasTokens(address);
    return this.userBalances.get(address.toLowerCase()) || 0n;
  }

  async allowance(owner: string, spender: string): Promise<bigint> {
    this.ensureUserHasTokens(owner);
    const ownerAllowances = this.userAllowances.get(owner.toLowerCase());
    if (!ownerAllowances) return 0n;
    return ownerAllowances.get(spender.toLowerCase()) || 0n;
  }

  async approve(owner: string, spender: string, amount: bigint): Promise<boolean> {
    this.ensureUserHasTokens(owner);
    
    if (!this.userAllowances.has(owner.toLowerCase())) {
      this.userAllowances.set(owner.toLowerCase(), new Map());
    }
    
    const ownerAllowances = this.userAllowances.get(owner.toLowerCase())!;
    ownerAllowances.set(spender.toLowerCase(), amount);
    
    console.log(`✅ Approved ${ethers.formatUnits(amount, 18)} mSQUDY from ${owner} to ${spender}`);
    toast.success(`Approved ${ethers.formatUnits(amount, 18)} mSQUDY tokens`);
    
    return true;
  }

  async transfer(from: string, to: string, amount: bigint): Promise<boolean> {
    this.ensureUserHasTokens(from);
    
    const fromBalance = this.userBalances.get(from.toLowerCase()) || 0n;
    if (fromBalance < amount) {
      throw new Error('Insufficient balance for transfer');
    }

    // Update balances
    this.userBalances.set(from.toLowerCase(), fromBalance - amount);
    
    const toBalance = this.userBalances.get(to.toLowerCase()) || 0n;
    this.userBalances.set(to.toLowerCase(), toBalance + amount);
    
    console.log(`💸 Transferred ${ethers.formatUnits(amount, 18)} mSQUDY from ${from} to ${to}`);
    
    return true;
  }

  // Helper method to add more tokens for testing
  mintTokens(address: string, amount: string) {
    const amountBN = ethers.parseUnits(amount, 18);
    const currentBalance = this.userBalances.get(address.toLowerCase()) || 0n;
    this.userBalances.set(address.toLowerCase(), currentBalance + amountBN);
    console.log(`🏭 Minted ${amount} mSQUDY tokens to ${address}`);
    toast.success(`🏭 Minted ${amount} mock SQUDY tokens for testing!`);
  }

  // Method to reset balances for testing
  resetBalances() {
    this.userBalances.clear();
    this.userAllowances.clear();
    console.log('🔄 Reset all mock token balances');
  }
}

// Singleton instance for the app
export const mockSqudyToken = new MockSqudyToken();