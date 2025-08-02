import { ethers } from 'ethers';
import { toast } from 'sonner';

// Mock SQUDY Token implementation for testing
export class MockSqudyToken {
  private userBalances: Map<string, ethers.BigNumber> = new Map();
  private userAllowances: Map<string, Map<string, ethers.BigNumber>> = new Map();
  private decimals = 18;
  private name = 'Mock SQUDY Token';
  private symbol = 'mSQUDY';
  private totalSupply = ethers.utils.parseUnits('1000000', 18); // 1M tokens

  constructor() {
    // Initialize with some default balances for testing
    this.initializeTestBalances();
  }

  private initializeTestBalances() {
    // Give all connected wallets some test tokens
    const defaultBalance = ethers.utils.parseUnits('10000', 18); // 10k tokens per wallet
    
    // We'll add balances when wallets connect
    console.log('Mock SQUDY Token initialized with default test balances');
  }

  // Ensure user has test tokens
  private ensureUserHasTokens(address: string) {
    if (!this.userBalances.has(address.toLowerCase())) {
      const testBalance = ethers.utils.parseUnits('10000', 18); // 10k tokens
      this.userBalances.set(address.toLowerCase(), testBalance);
      console.log(`🎁 Gifted ${ethers.utils.formatUnits(testBalance, 18)} mSQUDY tokens to ${address}`);
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

  async decimals(): Promise<number> {
    return this.decimals;
  }

  async totalSupply(): Promise<ethers.BigNumber> {
    return this.totalSupply;
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
    
    console.log(`✅ Approved ${ethers.utils.formatUnits(amount, 18)} mSQUDY from ${owner} to ${spender}`);
    toast.success(`Approved ${ethers.utils.formatUnits(amount, 18)} mSQUDY tokens`);
    
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
    
    console.log(`💸 Transferred ${ethers.utils.formatUnits(amount, 18)} mSQUDY from ${from} to ${to}`);
    
    return true;
  }

  // Helper method to add more tokens for testing
  mintTokens(address: string, amount: string) {
    const amountBN = ethers.utils.parseUnits(amount, 18);
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
}

// Singleton instance for the app
export const mockSqudyToken = new MockSqudyToken();