import { ethers, parseUnits, formatUnits } from 'ethers';
import { toast } from 'sonner';
import { mockSqudyToken } from './mockSqudyToken';

// Automated Campaign Manager ABI
const AUTOMATED_CAMPAIGN_MANAGER_ABI = [
  // View functions
  'function getCampaign(uint256 campaignId) external view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock))',
  'function getParticipant(uint256 campaignId, address user) external view returns (tuple(uint256 stakedAmount, uint256 ticketCount, bool hasCompletedSocial, uint256 joinedAt))',
  'function getCampaignParticipants(uint256 campaignId) external view returns (address[])',
  'function getTotalCampaigns() external view returns (uint256)',
  'function campaigns(uint256) external view returns (uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock)',
  'function participants(uint256, address) external view returns (uint256 stakedAmount, uint256 ticketCount, bool hasCompletedSocial, uint256 joinedAt)',
  
  // State changing functions
  'function createCampaign(string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 startDate, uint256 endDate, string[] prizes) external returns (uint256)',
  'function stakeTokens(uint256 campaignId, uint256 amount) external',
  'function selectWinners(uint256 campaignId) external',
  'function burnTokens(uint256 campaignId) external',
  'function confirmSocialTasks(uint256 campaignId, address user) external',
  
  // Admin functions
  'function pause() external',
  'function unpause() external',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',
  
  // Constants
  'function ADMIN_ROLE() external view returns (bytes32)',
  'function OPERATOR_ROLE() external view returns (bytes32)',
  
  // Events
  'event CampaignCreated(uint256 indexed campaignId, address indexed creator, string name)',
  'event UserStaked(uint256 indexed campaignId, address indexed user, uint256 amount, uint256 tickets)',
  'event SocialTasksCompleted(uint256 indexed campaignId, address indexed user)',
  'event WinnersSelected(uint256 indexed campaignId, address[] winners, uint256 blockNumber)',
  'event TokensBurned(uint256 indexed campaignId, uint256 amount)',
  'event CampaignStatusChanged(uint256 indexed campaignId, uint8 status)',
];

// Real SQUDY Token ABI
const SQUDY_TOKEN_ABI = [
  // Standard ERC20
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  
  // Enhanced SQUDY features
  'function burn(uint256 amount) external',
  'function burnFrom(address from, uint256 amount) external',
  'function authorizedBurners(address) external view returns (bool)',
  'function totalBurned() external view returns (uint256)',
  'function circulatingSupply() external view returns (uint256)',
  'function getBurnStats() external view returns (uint256 burned, uint256 circulating, uint256 burnRate)',
  
  // Owner functions
  'function setAuthorizedBurner(address burner, bool authorized) external',
  'function pause() external',
  'function unpause() external',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event BurnerAuthorized(address indexed burner, bool authorized)',
  'event TokensBurnedByCampaign(address indexed campaign, uint256 amount)',
];

// Contract addresses
export const AUTOMATED_CONTRACT_ADDRESSES = {
  SQUDY_TOKEN: import.meta.env.VITE_SQUDY_TOKEN_ADDRESS || '0x1234567890123456789012345678901234567890',
  CAMPAIGN_MANAGER: import.meta.env.VITE_CAMPAIGN_MANAGER_ADDRESS || '0x0987654321098765432109876543210987654321',
};

// Campaign Status enum (matches Solidity)
export enum CampaignStatus {
  Active = 0,
  Finished = 1,
  Burned = 2
}

// Interfaces for type safety
export interface AutomatedCampaign {
  id: bigint;
  name: string;
  description: string;
  imageUrl: string;
  softCap: bigint;
  hardCap: bigint;
  ticketAmount: bigint;
  currentAmount: bigint;
  startDate: bigint;
  endDate: bigint;
  participantCount: bigint;
  prizes: string[];
  winners: string[];
  status: CampaignStatus;
  tokensAreBurned: boolean;
  totalBurned: bigint;
  winnerSelectionBlock: bigint;
}

export interface AutomatedParticipant {
  stakedAmount: bigint;
  ticketCount: bigint;
  hasCompletedSocial: boolean;
  joinedAt: bigint;
}

// Automated Contract Service
export class AutomatedContractService {
  private provider: ethers.BrowserProvider;
  private signer: ethers.Signer;
  private squdyTokenContract: ethers.Contract | null = null;
  private campaignManagerContract: ethers.Contract;
  private useMockToken: boolean;

  constructor(provider: ethers.BrowserProvider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    // Use mock token if contract addresses are demo addresses
    this.useMockToken = AUTOMATED_CONTRACT_ADDRESSES.SQUDY_TOKEN === '0x1234567890123456789012345678901234567890' || 
                       AUTOMATED_CONTRACT_ADDRESSES.SQUDY_TOKEN === '';

    // Initialize contracts
    if (!this.useMockToken) {
      this.squdyTokenContract = new ethers.Contract(
        AUTOMATED_CONTRACT_ADDRESSES.SQUDY_TOKEN,
        SQUDY_TOKEN_ABI,
        this.signer
      );
    }

    this.campaignManagerContract = new ethers.Contract(
      AUTOMATED_CONTRACT_ADDRESSES.CAMPAIGN_MANAGER,
      AUTOMATED_CAMPAIGN_MANAGER_ABI,
      this.signer
    );
  }

  // ============ TOKEN FUNCTIONS ============

  async getTokenBalance(address: string): Promise<string> {
    try {
      if (this.useMockToken) {
        const balance = await mockSqudyToken.balanceOf(address);
        return formatUnits(balance, 18);
      } else {
        const balance = await this.squdyTokenContract!.balanceOf(address);
        return formatUnits(balance, 18);
      }
    } catch (error) {
      console.error('Error getting token balance:', error);
      return '0';
    }
  }

  async getTokenAllowance(owner: string, spender: string): Promise<string> {
    try {
      if (this.useMockToken) {
        const allowance = await mockSqudyToken.allowance(owner, spender);
        return formatUnits(allowance, 18);
      } else {
        const allowance = await this.squdyTokenContract!.allowance(owner, spender);
        return formatUnits(allowance, 18);
      }
    } catch (error) {
      console.error('Error getting token allowance:', error);
      return '0';
    }
  }

  async approveTokens(spender: string, amount: string): Promise<boolean> {
    try {
      const amountBN = parseUnits(amount, 18);
      
      if (this.useMockToken) {
        const userAddress = await this.signer.getAddress();
        await mockSqudyToken.approve(userAddress, spender, amountBN);
        return true;
      } else {
        const tx = await this.squdyTokenContract!.approve(spender, amountBN);
        await tx.wait();
        return true;
      }
    } catch (error) {
      console.error('Error approving tokens:', error);
      return false;
    }
  }

  async requestTestTokens(): Promise<boolean> {
    if (!this.useMockToken) {
      toast.error('Test tokens only available in demo mode');
      return false;
    }

    try {
      const userAddress = await this.signer.getAddress();
      const amount = parseUnits('1000', 18); // 1000 test tokens
      mockSqudyToken.mintTokens(userAddress, amount);
      
      if (!window.mockTokenToastShown) {
        toast.success('🎁 Received 1000 test SQUDY tokens!');
        window.mockTokenToastShown = true;
      }
      
      return true;
    } catch (error) {
      console.error('Error getting test tokens:', error);
      toast.error('Failed to get test tokens');
      return false;
    }
  }

  isUsingMockToken(): boolean {
    return this.useMockToken;
  }

  // ============ CAMPAIGN FUNCTIONS ============

  async getTotalCampaigns(): Promise<number> {
    try {
      const total = await this.campaignManagerContract.getTotalCampaigns();
      return Number(total);
    } catch (error) {
      console.error('Error getting total campaigns:', error);
      return 0;
    }
  }

  async getCampaign(campaignId: number): Promise<AutomatedCampaign | null> {
    try {
      const campaign = await this.campaignManagerContract.getCampaign(campaignId);
      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        imageUrl: campaign.imageUrl,
        softCap: campaign.softCap,
        hardCap: campaign.hardCap,
        ticketAmount: campaign.ticketAmount,
        currentAmount: campaign.currentAmount,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        participantCount: campaign.participantCount,
        prizes: campaign.prizes,
        winners: campaign.winners,
        status: campaign.status,
        tokensAreBurned: campaign.tokensAreBurned,
        totalBurned: campaign.totalBurned,
        winnerSelectionBlock: campaign.winnerSelectionBlock
      };
    } catch (error) {
      console.error('Error getting campaign:', error);
      return null;
    }
  }

  async getParticipant(campaignId: number, userAddress: string): Promise<AutomatedParticipant | null> {
    try {
      const participant = await this.campaignManagerContract.getParticipant(campaignId, userAddress);
      return {
        stakedAmount: participant.stakedAmount,
        ticketCount: participant.ticketCount,
        hasCompletedSocial: participant.hasCompletedSocial,
        joinedAt: participant.joinedAt
      };
    } catch (error) {
      console.error('Error getting participant:', error);
      return null;
    }
  }

  async stakeTokens(campaignId: number, amount: string): Promise<boolean> {
    try {
      const amountBN = parseUnits(amount, 18);
      
      if (this.useMockToken) {
        // Mock staking logic
        const userAddress = await this.signer.getAddress();
        const balance = await mockSqudyToken.balanceOf(userAddress);
        
        if (balance < amountBN) {
          toast.error('Insufficient token balance');
          return false;
        }

        // Simulate transfer to campaign manager
        await mockSqudyToken.transfer(
          userAddress, 
          AUTOMATED_CONTRACT_ADDRESSES.CAMPAIGN_MANAGER, 
          amountBN
        );
        
        toast.success(`🎯 Staked ${amount} SQUDY tokens!`);
        return true;
      } else {
        const tx = await this.campaignManagerContract.stakeTokens(campaignId, amountBN);
        await tx.wait();
        return true;
      }
    } catch (error) {
      console.error('Error staking tokens:', error);
      return false;
    }
  }

  async selectWinners(campaignId: number): Promise<boolean> {
    try {
      const tx = await this.campaignManagerContract.selectWinners(campaignId);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error selecting winners:', error);
      return false;
    }
  }

  async burnTokens(campaignId: number): Promise<boolean> {
    try {
      const tx = await this.campaignManagerContract.burnTokens(campaignId);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error burning tokens:', error);
      return false;
    }
  }

  async confirmSocialTasks(campaignId: number, userAddress: string): Promise<boolean> {
    try {
      const tx = await this.campaignManagerContract.confirmSocialTasks(campaignId, userAddress);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error confirming social tasks:', error);
      return false;
    }
  }

  // ============ ADMIN FUNCTIONS ============

  async createCampaign(
    name: string,
    description: string,
    imageUrl: string,
    softCap: string,
    hardCap: string,
    ticketAmount: string,
    startDate: number,
    endDate: number,
    prizes: string[]
  ): Promise<number | null> {
    try {
      const softCapBN = parseUnits(softCap, 18);
      const hardCapBN = parseUnits(hardCap, 18);
      const ticketAmountBN = parseUnits(ticketAmount, 18);

      const tx = await this.campaignManagerContract.createCampaign(
        name,
        description,
        imageUrl,
        softCapBN,
        hardCapBN,
        ticketAmountBN,
        startDate,
        endDate,
        prizes
      );

      const receipt = await tx.wait();
      
      // Extract campaign ID from event
      const campaignCreatedEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id("CampaignCreated(uint256,address,string)")
      );
      
      if (campaignCreatedEvent) {
        return Number(campaignCreatedEvent.topics[1]);
      }
      
      return null;
    } catch (error) {
      console.error('Error creating campaign:', error);
      return null;
    }
  }

  // ============ TOKEN STATS ============

  async getBurnStats(): Promise<{ burned: string; circulating: string; burnRate: string } | null> {
    if (this.useMockToken) {
      return {
        burned: '0',
        circulating: '1000000000', // 1B tokens
        burnRate: '0'
      };
    }

    try {
      const stats = await this.squdyTokenContract!.getBurnStats();
      return {
        burned: formatUnits(stats.burned, 18),
        circulating: formatUnits(stats.circulating, 18),
        burnRate: (Number(stats.burnRate) / 100).toString() // Convert basis points to percentage
      };
    } catch (error) {
      console.error('Error getting burn stats:', error);
      return null;
    }
  }
}