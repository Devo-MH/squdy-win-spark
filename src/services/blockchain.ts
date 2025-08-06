import { ethers } from 'ethers';
import { Campaign, UserParticipation, BlockchainTransaction } from '@/types';

// Mock Web3 provider for development
class MockWeb3Provider {
  private accounts: string[] = [];
  private isConnected = false;

  async request(request: { method: string; params?: any[] }) {
    switch (request.method) {
      case 'eth_requestAccounts':
        if (!this.isConnected) {
          this.accounts = ['0xUser1234567890123456789012345678901234567890'];
          this.isConnected = true;
        }
        return this.accounts;
      
      case 'eth_accounts':
        return this.accounts;
      
      case 'eth_chainId':
        return '0x38'; // BSC Mainnet
      
      case 'wallet_switchEthereumChain':
        return null;
      
      default:
        throw new Error(`Method ${request.method} not supported`);
    }
  }

  on(event: string, callback: Function) {
    // Mock event handling
    if (event === 'accountsChanged') {
      setTimeout(() => callback(this.accounts), 100);
    }
  }

  removeListener(event: string, callback: Function) {
    // Mock event removal
  }
}

// Check if MetaMask is available
export const isMetaMaskAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
};

// Get MetaMask provider
export const getMetaMaskProvider = () => {
  if (isMetaMaskAvailable()) {
    return (window as any).ethereum;
  }
  return new MockWeb3Provider();
};

// Connect to MetaMask
export const connectWallet = async (): Promise<string[]> => {
  try {
    const provider = getMetaMaskProvider();
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    return accounts;
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw new Error('Failed to connect wallet');
  }
};

// Get current account
export const getCurrentAccount = async (): Promise<string | null> => {
  try {
    const provider = getMetaMaskProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });
    return accounts[0] || null;
  } catch (error) {
    console.error('Error getting current account:', error);
    return null;
  }
};

// Check if wallet is connected
export const isWalletConnected = async (): Promise<boolean> => {
  const account = await getCurrentAccount();
  return account !== null;
};

// Get network information
export const getNetworkInfo = async () => {
  try {
    const provider = getMetaMaskProvider();
    const chainId = await provider.request({ method: 'eth_chainId' });
    
    const networks = {
      '0x1': { name: 'Ethereum Mainnet', symbol: 'ETH' },
      '0x38': { name: 'Binance Smart Chain', symbol: 'BNB' },
      '0x61': { name: 'BSC Testnet', symbol: 'tBNB' }
    };
    
    return networks[chainId as keyof typeof networks] || { name: 'Unknown Network', symbol: 'Unknown' };
  } catch (error) {
    console.error('Error getting network info:', error);
    return { name: 'Unknown Network', symbol: 'Unknown' };
  }
};

// Switch to BSC network
export const switchToBSC = async (): Promise<void> => {
  try {
    const provider = getMetaMaskProvider();
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x38' }]
    });
  } catch (error) {
    console.error('Error switching to BSC:', error);
    throw new Error('Failed to switch to BSC network');
  }
};

// Mock smart contract ABI for campaign interactions
const CAMPAIGN_ABI = [
  'function stake(uint256 amount) external',
  'function unstake(uint256 amount) external',
  'function getStakedAmount(address user) external view returns (uint256)',
  'function getTicketCount(address user) external view returns (uint256)',
  'function isEligible(address user) external view returns (bool)',
  'function selectWinners() external',
  'function burnTokens() external',
  'function getCampaignInfo() external view returns (string, uint256, uint256, uint256, uint256)',
  'event Staked(address indexed user, uint256 amount)',
  'event Unstaked(address indexed user, uint256 amount)',
  'event WinnersSelected(address[] winners)',
  'event TokensBurned(uint256 amount)'
];

// Mock contract instance
class MockCampaignContract {
  private stakedAmounts: Map<string, number> = new Map();
  private ticketAmount: number;
  private campaignInfo: any;

  constructor(campaignInfo: any) {
    this.campaignInfo = campaignInfo;
    this.ticketAmount = campaignInfo.ticketAmount;
  }

  async stake(amount: number): Promise<BlockchainTransaction> {
    const account = await getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    const currentStaked = this.stakedAmounts.get(account) || 0;
    this.stakedAmounts.set(account, currentStaked + amount);

    return {
      hash: `0xStakeTx${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      from: account,
      to: this.campaignInfo.contractAddress,
      value: ethers.utils.parseEther(amount.toString()).toString(),
      gasUsed: '150000',
      gasPrice: '5000000000',
      blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      bscScanUrl: `https://bscscan.com/tx/0xStakeTx${Date.now()}`
    };
  }

  async getStakedAmount(userAddress: string): Promise<number> {
    return this.stakedAmounts.get(userAddress) || 0;
  }

  async getTicketCount(userAddress: string): Promise<number> {
    const staked = await this.getStakedAmount(userAddress);
    return Math.floor(staked / this.ticketAmount);
  }

  async isEligible(userAddress: string): Promise<boolean> {
    const ticketCount = await this.getTicketCount(userAddress);
    return ticketCount > 0;
  }
}

// Create contract instance for a campaign
export const createCampaignContract = (campaign: Campaign) => {
  return new MockCampaignContract(campaign);
};

// Stake tokens in a campaign
export const stakeTokens = async (campaign: Campaign, amount: number): Promise<BlockchainTransaction> => {
  const contract = createCampaignContract(campaign);
  return await contract.stake(amount);
};

// Get user's staked amount in a campaign
export const getStakedAmount = async (campaign: Campaign, userAddress: string): Promise<number> => {
  const contract = createCampaignContract(campaign);
  return await contract.getStakedAmount(userAddress);
};

// Get user's ticket count in a campaign
export const getTicketCount = async (campaign: Campaign, userAddress: string): Promise<number> => {
  const contract = createCampaignContract(campaign);
  return await contract.getTicketCount(userAddress);
};

// Check if user is eligible for a campaign
export const checkEligibility = async (campaign: Campaign, userAddress: string): Promise<boolean> => {
  const contract = createCampaignContract(campaign);
  return await contract.isEligible(userAddress);
};

// Mock function to get SQUDY token balance
export const getSQUDYBalance = async (userAddress: string): Promise<number> => {
  // Mock balance - in real implementation, this would call the token contract
  return Math.floor(Math.random() * 10000) + 100;
};

// Mock function to get SQUDY token allowance
export const getSQUDYAllowance = async (userAddress: string, spenderAddress: string): Promise<number> => {
  // Mock allowance - in real implementation, this would call the token contract
  return Math.floor(Math.random() * 10000) + 100;
};

// Approve SQUDY tokens for staking
export const approveSQUDY = async (spenderAddress: string, amount: number): Promise<BlockchainTransaction> => {
  const account = await getCurrentAccount();
  if (!account) throw new Error('No wallet connected');

  return {
    hash: `0xApproveTx${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
    from: account,
    to: '0xSQUDYTokenContract123456789012345678901234567890',
    value: '0',
    gasUsed: '100000',
    gasPrice: '5000000000',
    blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
    timestamp: new Date().toISOString(),
    status: 'confirmed',
    bscScanUrl: `https://bscscan.com/tx/0xApproveTx${Date.now()}`
  };
};

// Listen for wallet events
export const setupWalletListeners = (onAccountChange: (accounts: string[]) => void) => {
  const provider = getMetaMaskProvider();
  
  provider.on('accountsChanged', onAccountChange);
  provider.on('chainChanged', () => {
    window.location.reload();
  });

  return () => {
    provider.removeListener('accountsChanged', onAccountChange);
  };
}; 