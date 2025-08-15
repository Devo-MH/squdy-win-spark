import { ethers } from 'ethers';

// Campaign Manager ABI for reading campaign data
const CAMPAIGN_MANAGER_ABI = [
  'function getTotalCampaigns() external view returns (uint256)',
  'function getCampaign(uint256) external view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 refundableAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock))',
  'function campaigns(uint256) external view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 refundableAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock))'
];

export interface BlockchainCampaign {
  id: number;
  contractId: number;
  name: string;
  description: string;
  imageUrl: string;
  status: string;
  currentAmount: number;
  hardCap: number;
  participantCount: number;
  softCap: number;
  ticketAmount: number;
  startDate: string;
  endDate: string;
  prizes: Array<{ name: string; value: number; currency: string }>;
  winners: string[];
  totalBurned: number;
  createdAt: string;
  updatedAt: string;
}

export class BlockchainCampaignService {
  private provider: ethers.providers.Web3Provider | null = null;
  private contract: ethers.Contract | null = null;

  constructor() {
    this.initializeProvider();
  }

  private async initializeProvider() {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        this.provider = new ethers.providers.Web3Provider((window as any).ethereum);
        
        const campaignManagerAddress = (import.meta as any).env?.VITE_CAMPAIGN_MANAGER_ADDRESS;
        if (campaignManagerAddress) {
          this.contract = new ethers.Contract(campaignManagerAddress, CAMPAIGN_MANAGER_ABI, this.provider);
        }
      }
    } catch (error) {
      console.warn('Failed to initialize blockchain provider:', error);
    }
  }

  // Convert campaign status from uint8 to string
  private getStatusString(status: number): string {
    switch (status) {
      case 0: return 'pending';
      case 1: return 'active';
      case 2: return 'paused';
      case 3: return 'finished';
      case 4: return 'burned';
      default: return 'unknown';
    }
  }

  // Format amount from wei to SQUDY
  private formatAmount(amount: any): number {
    try {
      if (ethers.utils?.formatUnits) {
        return parseFloat(ethers.utils.formatUnits(amount, 18));
      } else if (ethers.formatUnits) {
        return parseFloat(ethers.formatUnits(amount, 18));
      }
      return Number(amount?.toString?.() ?? amount ?? 0);
    } catch {
      return Number(amount?.toString?.() ?? amount ?? 0);
    }
  }

  // Parse timestamp to ISO string
  private parseTimestamp(timestamp: any): string {
    try {
      const num = Number(timestamp?.toString?.() ?? timestamp ?? 0);
      if (num < 1e12) {
        return new Date(num * 1000).toISOString(); // seconds to milliseconds
      } else {
        return new Date(num).toISOString(); // already milliseconds
      }
    } catch {
      return new Date().toISOString();
    }
  }

  // Get all campaigns from blockchain
  async getCampaigns(): Promise<{ campaigns: BlockchainCampaign[]; pagination: any }> {
    try {
      if (!this.contract) {
        await this.initializeProvider();
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }
      }

      const totalCampaigns = await this.contract.getTotalCampaigns();
      const campaigns: BlockchainCampaign[] = [];

      // Fetch campaigns from blockchain
      for (let i = 1; i <= totalCampaigns; i++) {
        try {
          const campaignData = await this.contract.getCampaign(i);
          
          const campaign: BlockchainCampaign = {
            id: i,
            contractId: i,
            name: campaignData.name || `Campaign ${i}`,
            description: campaignData.description || 'Campaign description',
            imageUrl: campaignData.imageUrl || 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop',
            status: this.getStatusString(campaignData.status),
            currentAmount: this.formatAmount(campaignData.currentAmount),
            hardCap: this.formatAmount(campaignData.hardCap),
            participantCount: Number(campaignData.participantCount || 0),
            softCap: this.formatAmount(campaignData.softCap),
            ticketAmount: this.formatAmount(campaignData.ticketAmount),
            startDate: this.parseTimestamp(campaignData.startDate),
            endDate: this.parseTimestamp(campaignData.endDate),
            prizes: campaignData.prizes?.map((prize: string, index: number) => ({
              name: prize || `Prize ${index + 1}`,
              value: 1000, // Default value
              currency: 'USD'
            })) || [],
            winners: campaignData.winners?.filter((w: string) => w !== '0x0000000000000000000000000000000000000000') || [],
            totalBurned: this.formatAmount(campaignData.totalBurned),
            createdAt: this.parseTimestamp(campaignData.startDate),
            updatedAt: new Date().toISOString()
          };

          campaigns.push(campaign);
        } catch (error) {
          console.warn(`Failed to fetch campaign ${i}:`, error);
        }
      }

      return {
        campaigns,
        pagination: {
          page: 1,
          limit: campaigns.length,
          total: campaigns.length,
          totalPages: 1
        }
      };
    } catch (error) {
      console.error('Failed to fetch campaigns from blockchain:', error);
      return { campaigns: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } };
    }
  }

  // Get single campaign by ID
  async getCampaignById(id: number | string): Promise<{ campaign: BlockchainCampaign }> {
    try {
      if (!this.contract) {
        await this.initializeProvider();
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }
      }

      const campaignId = Number(id);
      const campaignData = await this.contract.getCampaign(campaignId);
      
      const campaign: BlockchainCampaign = {
        id: campaignId,
        contractId: campaignId,
        name: campaignData.name || `Campaign ${campaignId}`,
        description: campaignData.description || 'Campaign description',
        imageUrl: campaignData.imageUrl || 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop',
        status: this.getStatusString(campaignData.status),
        currentAmount: this.formatAmount(campaignData.currentAmount),
        hardCap: this.formatAmount(campaignData.hardCap),
        participantCount: Number(campaignData.participantCount || 0),
        softCap: this.formatAmount(campaignData.softCap),
        ticketAmount: this.formatAmount(campaignData.ticketAmount),
        startDate: this.parseTimestamp(campaignData.startDate),
        endDate: this.parseTimestamp(campaignData.endDate),
        prizes: campaignData.prizes?.map((prize: string, index: number) => ({
          name: prize || `Prize ${index + 1}`,
          value: 1000, // Default value
          currency: 'USD'
        })) || [],
        winners: campaignData.winners?.filter((w: string) => w !== '0x0000000000000000000000000000000000000000') || [],
        totalBurned: this.formatAmount(campaignData.totalBurned),
        createdAt: this.parseTimestamp(campaignData.startDate),
        updatedAt: new Date().toISOString()
      };

      return { campaign };
    } catch (error) {
      console.error(`Failed to fetch campaign ${id} from blockchain:`, error);
      throw new Error(`Campaign ${id} not found`);
    }
  }

  // Get campaign participants (placeholder - would need additional contract functions)
  async getCampaignParticipants(id: number): Promise<{ participants: any[]; pagination: any }> {
    // This would require additional contract functions to implement
    return { participants: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } };
  }

  // Get campaign winners
  async getCampaignWinners(id: number): Promise<{ winners: string[] }> {
    try {
      if (!this.contract) {
        await this.initializeProvider();
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }
      }

      const campaignData = await this.contract.getCampaign(id);
      const winners = campaignData.winners?.filter((w: string) => w !== '0x0000000000000000000000000000000000000000') || [];
      
      return { winners };
    } catch (error) {
      console.error(`Failed to fetch winners for campaign ${id}:`, error);
      return { winners: [] };
    }
  }

  // Get my campaign status (placeholder - would need wallet connection)
  async getMyStatus(id: number): Promise<any> {
    // This would require wallet connection and additional contract functions
    return {
      isParticipating: false,
      status: 'not_participating',
      hasStaked: false,
      socialTasksCompleted: {},
      allSocialTasksCompleted: false
    };
  }
}

// Export singleton instance
export const blockchainCampaignService = new BlockchainCampaignService();
