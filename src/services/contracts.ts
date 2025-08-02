import { ethers } from 'ethers';
import { toast } from 'sonner';

// Extend Window interface for session tracking
declare global {
  interface Window {
    mockTokenToastShown?: boolean;
  }
}
import { mockSqudyToken } from './mockSqudyToken';

// Contract ABIs (simplified for frontend)
const CAMPAIGN_MANAGER_ABI = [
  'function getCampaign(uint256 campaignId) external view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, bytes32 winnerSelectionTxHash, uint256 createdAt, uint256 updatedAt))',
  'function getCampaignCount() external view returns (uint256)',
  'function getParticipant(uint256 campaignId, address user) external view returns (tuple(uint256 stakedAmount, uint256 ticketCount, bool hasCompletedSocial, bool isWinner, uint256 prizeIndex, uint256 joinedAt))',
  'function stakeSQUDY(uint256 campaignId, uint256 amount) external',
  'function isEligibleForWinning(uint256 campaignId, address user) external view returns (bool)',
  'function getTicketCount(uint256 campaignId, address user) external view returns (uint256)',
  
  // Events
  'event CampaignCreated(uint256 indexed campaignId, string name, uint256 startDate, uint256 endDate, uint256 ticketAmount)',
  'event UserStaked(uint256 indexed campaignId, address indexed user, uint256 amount, uint256 tickets)',
  'event SocialTasksCompleted(uint256 indexed campaignId, address indexed user)',
  'event WinnersSelected(uint256 indexed campaignId, address[] winners, bytes32 requestId)',
  'event TokensBurned(uint256 indexed campaignId, uint256 totalBurned)',
];

const SQUDY_TOKEN_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

// Contract addresses (will be set from environment or deployment)
export const CONTRACT_ADDRESSES = {
  SQUDY_TOKEN: import.meta.env.VITE_SQUDY_TOKEN_ADDRESS || '',
  CAMPAIGN_MANAGER: import.meta.env.VITE_CAMPAIGN_MANAGER_ADDRESS || '',
};

// Contract service class
export class ContractService {
  private provider: ethers.providers.Web3Provider;
  private signer: ethers.Signer;
  private squdyTokenContract: ethers.Contract | null = null;
  private campaignManagerContract: ethers.Contract;
  private useMockToken: boolean;

  constructor(provider: ethers.providers.Web3Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    // Use mock token if no real contract address is provided
    this.useMockToken = !CONTRACT_ADDRESSES.SQUDY_TOKEN || CONTRACT_ADDRESSES.SQUDY_TOKEN === '';
    
    if (!this.useMockToken) {
      this.squdyTokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.SQUDY_TOKEN,
        SQUDY_TOKEN_ABI,
        signer
      );
    }
    
    // For now, we'll use a placeholder for campaign manager in mock mode
    // In production, this should point to the real contract
    const campaignAddress = CONTRACT_ADDRESSES.CAMPAIGN_MANAGER || '0x0000000000000000000000000000000000000000';
    this.campaignManagerContract = new ethers.Contract(
      campaignAddress,
      CAMPAIGN_MANAGER_ABI,
      signer
    );
    
    if (this.useMockToken) {
      // Only show toast once per session
      if (!window.mockTokenToastShown) {
        toast.info('🧪 Using mock SQUDY token for testing purposes');
        window.mockTokenToastShown = true;
      }
    }
  }

  // SQUDY Token methods
  async getTokenBalance(address: string): Promise<string> {
    try {
      if (this.useMockToken) {
        const balance = await mockSqudyToken.balanceOf(address);
        const decimals = await mockSqudyToken.decimals();
        return ethers.utils.formatUnits(balance, decimals);
      } else {
        const balance = await this.squdyTokenContract!.balanceOf(address);
        const decimals = await this.squdyTokenContract!.decimals();
        return ethers.utils.formatUnits(balance, decimals);
      }
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw error;
    }
  }

  async getTokenAllowance(owner: string, spender: string): Promise<string> {
    try {
      if (this.useMockToken) {
        const allowance = await mockSqudyToken.allowance(owner, spender);
        const decimals = await mockSqudyToken.decimals();
        return ethers.utils.formatUnits(allowance, decimals);
      } else {
        const allowance = await this.squdyTokenContract!.allowance(owner, spender);
        const decimals = await this.squdyTokenContract!.decimals();
        return ethers.utils.formatUnits(allowance, decimals);
      }
    } catch (error) {
      console.error('Error getting token allowance:', error);
      throw error;
    }
  }

  async approveToken(spender: string, amount: string): Promise<ethers.ContractTransaction | any> {
    try {
      if (this.useMockToken) {
        const userAddress = await this.signer.getAddress();
        const decimals = await mockSqudyToken.decimals();
        const amountBN = ethers.utils.parseUnits(amount, decimals);
        
        await mockSqudyToken.approve(userAddress, spender, amountBN);
        
        // Return a mock transaction object
        return {
          hash: '0x' + Math.random().toString(16).substring(2),
          wait: async () => ({ status: 1 })
        };
      } else {
        const decimals = await this.squdyTokenContract!.decimals();
        const amountBN = ethers.utils.parseUnits(amount, decimals);
        
        const tx = await this.squdyTokenContract!.approve(spender, amountBN);
        toast.info('Approval transaction sent. Please wait for confirmation...');
        
        return tx;
      }
    } catch (error: any) {
      console.error('Error approving token:', error);
      toast.error(error.message || 'Failed to approve tokens');
      throw error;
    }
  }

  async getTokenInfo(): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  }> {
    try {
      if (this.useMockToken) {
        const [name, symbol, decimals, totalSupply] = await Promise.all([
          mockSqudyToken.name(),
          mockSqudyToken.symbol(),
          mockSqudyToken.decimals(),
          mockSqudyToken.totalSupply(),
        ]);

        return {
          name,
          symbol,
          decimals: Number(decimals),
          totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
        };
      } else {
        const [name, symbol, decimals, totalSupply] = await Promise.all([
          this.squdyTokenContract!.name(),
          this.squdyTokenContract!.symbol(),
          this.squdyTokenContract!.decimals(),
          this.squdyTokenContract!.totalSupply(),
        ]);

        return {
          name,
          symbol,
          decimals: Number(decimals),
          totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
        };
      }
    } catch (error) {
      console.error('Error getting token info:', error);
      throw error;
    }
  }

  // Campaign Manager methods
  async getCampaignCount(): Promise<number> {
    try {
      const count = await this.campaignManagerContract.getCampaignCount();
      return count.toNumber();
    } catch (error) {
      console.error('Error getting campaign count:', error);
      throw error;
    }
  }

  async getCampaign(campaignId: number): Promise<any> {
    try {
      const campaign = await this.campaignManagerContract.getCampaign(campaignId);
      return this.parseCampaignData(campaign);
    } catch (error) {
      console.error('Error getting campaign:', error);
      throw error;
    }
  }

  async getParticipant(campaignId: number, userAddress: string): Promise<any> {
    try {
      const participant = await this.campaignManagerContract.getParticipant(campaignId, userAddress);
      return this.parseParticipantData(participant);
    } catch (error) {
      console.error('Error getting participant:', error);
      throw error;
    }
  }

  async stakeTokens(campaignId: number, amount: string): Promise<ethers.ContractTransaction | any> {
    try {
      if (this.useMockToken) {
        // Mock staking process
        const userAddress = await this.signer.getAddress();
        const decimals = await mockSqudyToken.decimals();
        const amountBN = ethers.utils.parseUnits(amount, decimals);
        
        // Check allowance first
        const allowance = await this.getTokenAllowance(userAddress, CONTRACT_ADDRESSES.CAMPAIGN_MANAGER);
        const allowanceBN = ethers.utils.parseUnits(allowance, decimals);
        
        if (allowanceBN.lt(amountBN)) {
          throw new Error('Insufficient token allowance. Please approve tokens first.');
        }
        
        // Check balance
        const balance = await mockSqudyToken.balanceOf(userAddress);
        if (balance.lt(amountBN)) {
          throw new Error('Insufficient token balance for staking.');
        }
        
        // Simulate transfer to campaign manager (burning tokens for staking)
        await mockSqudyToken.transfer(userAddress, CONTRACT_ADDRESSES.CAMPAIGN_MANAGER || '0x0000000000000000000000000000000000000000', amountBN);
        
        toast.success(`🎉 Successfully staked ${amount} mSQUDY tokens in campaign ${campaignId}!`);
        
        // Return a mock transaction object
        return {
          hash: '0x' + Math.random().toString(16).substring(2),
          wait: async () => ({ status: 1 })
        };
      } else {
        const decimals = await this.squdyTokenContract!.decimals();
        const amountBN = ethers.utils.parseUnits(amount, decimals);
        
        // Check allowance first
        const userAddress = await this.signer.getAddress();
        const allowance = await this.getTokenAllowance(userAddress, CONTRACT_ADDRESSES.CAMPAIGN_MANAGER);
        const allowanceBN = ethers.utils.parseUnits(allowance, decimals);
        
        if (allowanceBN.lt(amountBN)) {
          throw new Error('Insufficient token allowance. Please approve tokens first.');
        }
        
        const tx = await this.campaignManagerContract.stakeSQUDY(campaignId, amountBN);
        toast.info('Staking transaction sent. Please wait for confirmation...');
        
        return tx;
      }
    } catch (error: any) {
      console.error('Error staking tokens:', error);
      toast.error(error.message || 'Failed to stake tokens');
      throw error;
    }
  }

  // Mock token utilities
  async requestTestTokens(amount: string = '1000'): Promise<void> {
    if (this.useMockToken) {
      const userAddress = await this.signer.getAddress();
      mockSqudyToken.mintTokens(userAddress, amount);
    } else {
      toast.error('Test tokens are only available in mock mode');
    }
  }

  isUsingMockToken(): boolean {
    return this.useMockToken;
  }

  async isEligibleForWinning(campaignId: number, userAddress: string): Promise<boolean> {
    try {
      return await this.campaignManagerContract.isEligibleForWinning(campaignId, userAddress);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      throw error;
    }
  }

  async getTicketCount(campaignId: number, userAddress: string): Promise<number> {
    try {
      const count = await this.campaignManagerContract.getTicketCount(campaignId, userAddress);
      return count.toNumber();
    } catch (error) {
      console.error('Error getting ticket count:', error);
      throw error;
    }
  }

  // Helper methods
  private parseCampaignData(campaign: any): any {
    return {
      id: campaign.id.toNumber(),
      name: campaign.name,
      description: campaign.description,
      imageUrl: campaign.imageUrl,
      softCap: ethers.formatEther(campaign.softCap),
      hardCap: ethers.formatEther(campaign.hardCap),
      ticketAmount: ethers.formatEther(campaign.ticketAmount),
      currentAmount: ethers.formatEther(campaign.currentAmount),
      startDate: new Date(campaign.startDate.toNumber() * 1000),
      endDate: new Date(campaign.endDate.toNumber() * 1000),
      participantCount: campaign.participantCount.toNumber(),
      prizes: campaign.prizes,
      winners: campaign.winners,
      status: this.getStatusString(campaign.status),
      tokensAreBurned: campaign.tokensAreBurned,
      totalBurned: ethers.formatEther(campaign.totalBurned),
      winnerSelectionTxHash: campaign.winnerSelectionTxHash,
      createdAt: new Date(campaign.createdAt.toNumber() * 1000),
      updatedAt: new Date(campaign.updatedAt.toNumber() * 1000),
    };
  }

  private parseParticipantData(participant: any): any {
    return {
      stakedAmount: ethers.formatEther(participant.stakedAmount),
      ticketCount: participant.ticketCount.toNumber(),
      hasCompletedSocial: participant.hasCompletedSocial,
      isWinner: participant.isWinner,
      prizeIndex: participant.prizeIndex.toNumber(),
      joinedAt: new Date(participant.joinedAt.toNumber() * 1000),
    };
  }

  private getStatusString(status: number): string {
    const statusMap: { [key: number]: string } = {
      0: 'pending',
      1: 'active',
      2: 'paused',
      3: 'finished',
      4: 'burned',
    };
    return statusMap[status] || 'unknown';
  }

  // Event listeners
  setupEventListeners(callbacks: {
    onCampaignCreated?: (data: any) => void;
    onUserStaked?: (data: any) => void;
    onSocialTasksCompleted?: (data: any) => void;
    onWinnersSelected?: (data: any) => void;
    onTokensBurned?: (data: any) => void;
  }): void {
    if (callbacks.onCampaignCreated) {
      this.campaignManagerContract.on('CampaignCreated', (campaignId, name, startDate, endDate, ticketAmount) => {
        callbacks.onCampaignCreated!({
          campaignId: campaignId.toNumber(),
          name,
          startDate: new Date(startDate.toNumber() * 1000),
          endDate: new Date(endDate.toNumber() * 1000),
          ticketAmount: ethers.formatEther(ticketAmount),
        });
      });
    }

    if (callbacks.onUserStaked) {
      this.campaignManagerContract.on('UserStaked', (campaignId, user, amount, tickets) => {
        callbacks.onUserStaked!({
          campaignId: campaignId.toNumber(),
          user,
          amount: ethers.formatEther(amount),
          tickets: tickets.toNumber(),
        });
      });
    }

    if (callbacks.onSocialTasksCompleted) {
      this.campaignManagerContract.on('SocialTasksCompleted', (campaignId, user) => {
        callbacks.onSocialTasksCompleted!({
          campaignId: campaignId.toNumber(),
          user,
        });
      });
    }

    if (callbacks.onWinnersSelected) {
      this.campaignManagerContract.on('WinnersSelected', (campaignId, winners, requestId) => {
        callbacks.onWinnersSelected!({
          campaignId: campaignId.toNumber(),
          winners,
          requestId,
        });
      });
    }

    if (callbacks.onTokensBurned) {
      this.campaignManagerContract.on('TokensBurned', (campaignId, totalBurned) => {
        callbacks.onTokensBurned!({
          campaignId: campaignId.toNumber(),
          totalBurned: ethers.formatEther(totalBurned),
        });
      });
    }
  }

  // Cleanup event listeners
  removeAllListeners(): void {
    this.campaignManagerContract.removeAllListeners();
    this.squdyTokenContract.removeAllListeners();
  }
}

// Hook for contract service
export const useContracts = (provider: ethers.providers.Web3Provider | null, signer: ethers.Signer | null) => {
  if (!provider || !signer) {
    return null;
  }
  
  // Always create the service - it will automatically use mock tokens if no addresses are configured
  return new ContractService(provider, signer);
};

export default ContractService;