import { ethers } from 'ethers';
import { toast } from 'sonner';
import { mockSqudyToken } from './mockSqudyToken';

// Automated Campaign Manager ABI
const AUTOMATED_CAMPAIGN_MANAGER_ABI = [
  // View functions
  'function getCampaign(uint256 campaignId) external view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 refundableAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock))',
  'function getParticipant(uint256 campaignId, address user) external view returns (tuple(uint256 stakedAmount, uint256 ticketCount, bool hasCompletedSocial, uint256 joinedAt))',
  'function getCampaignParticipants(uint256 campaignId) external view returns (address[])',
  'function getTotalCampaigns() external view returns (uint256)',
  'function campaigns(uint256) external view returns (uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 refundableAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock)',
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
  
  // Emergency functions
  'function emergencyTerminateCampaign(uint256 campaignId, bool refundUsers) external',
  'function emergencyPause() external',
  'function emergencyUnpause() external',
  'function pauseCampaign(uint256 campaignId) external',
  'function resumeCampaign(uint256 campaignId) external',
  'function updateCampaignEndDate(uint256 campaignId, uint256 newEndDate) external',
  
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
  'event CampaignTerminated(uint256 indexed campaignId, bool refunded)',
  'event CampaignPaused(uint256 indexed campaignId)',
  'event CampaignResumed(uint256 indexed campaignId)',
  'event CampaignEndDateUpdated(uint256 indexed campaignId, uint256 oldEndDate, uint256 newEndDate)',
];

// Real SQUDY Token V4 ABI (no burn, no campaign-manager linkage)
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
  
  // Admin/Security
  'function pause() external',
  'function unpause() external',
  'function paused() external view returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

// Contract addresses
export const AUTOMATED_CONTRACT_ADDRESSES = {
  SQUDY_TOKEN: import.meta.env.VITE_SQUDY_TOKEN_ADDRESS || '0xEC377663EcdaA7d20dEa996243114c03F7E147F2',
  CAMPAIGN_MANAGER: import.meta.env.VITE_CAMPAIGN_MANAGER_ADDRESS || '0x0117b89a1E9Ca93f12D757e0712A95a1C90132ef',
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
  private provider: any;
  private signer: ethers.Signer;
  private squdyTokenContract: ethers.Contract | null = null;
  private campaignManagerContract: ethers.Contract;
  private useMockToken: boolean;

  constructor(provider: any, signer: ethers.Signer) {
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
         return ethers.utils.formatUnits(balance, 18);
      } else {
        const balance = await this.squdyTokenContract!.balanceOf(address);
        return ethers.utils.formatUnits(balance, 18);
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
         return ethers.utils.formatUnits(allowance, 18);
      } else {
        const allowance = await this.squdyTokenContract!.allowance(owner, spender);
        return ethers.utils.formatUnits(allowance, 18);
      }
    } catch (error) {
      console.error('Error getting token allowance:', error);
      return '0';
    }
  }

  async approveTokens(spender: string, amount: string): Promise<boolean> {
    try {
      const amountBN = ethers.utils.parseUnits(amount, 18);
      
      if (this.useMockToken) {
        const userAddress = await this.signer.getAddress();
        await mockSqudyToken.approve(userAddress, spender, BigInt(amountBN.toString()));
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

  async transferTokens(to: string, amount: string): Promise<boolean> {
    try {
      const amountBN = ethers.utils.parseUnits(amount, 18);
      if (this.useMockToken) {
        const from = await this.signer.getAddress();
        await mockSqudyToken.transfer(from, to, BigInt(amountBN.toString()));
        toast.success(`✅ Sent ${amount} SQUDY to ${to.slice(0, 6)}...${to.slice(-4)}`);
        return true;
      } else {
        if (!ethers.utils.isAddress(to)) {
          toast.error('Invalid recipient address');
          return false;
        }
        const from = await this.signer.getAddress();
        const balance = await this.squdyTokenContract!.balanceOf(from);
        const balEnough = (balance as any).lt ? !(balance as any).lt(amountBN) : (BigInt(balance.toString()) >= BigInt(amountBN.toString()));
        if (!balEnough) {
          toast.error('Insufficient SQUDY balance');
          return false;
        }
        const tx = await this.squdyTokenContract!.transfer(to, amountBN);
        toast.info('📤 Transfer submitted. Waiting for confirmation...');
        await tx.wait();
        toast.success(`✅ Sent ${amount} SQUDY to ${to.slice(0, 6)}...${to.slice(-4)}`);
        return true;
      }
    } catch (error: any) {
      console.error('Error transferring tokens:', error);
      toast.error(`Transfer failed: ${error?.reason || error?.message || 'Unknown error'}`);
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
      const amount = BigInt(ethers.utils.parseUnits('1000', 18).toString()); // 1000 test tokens
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
      return Number(total.toString?.() ?? total);
    } catch (error) {
      console.error('Error getting total campaigns:', error);
      return 0;
    }
  }

  async getCampaign(campaignId: number): Promise<AutomatedCampaign | null> {
    try {
      const campaign = await this.campaignManagerContract.getCampaign(campaignId);
      return {
        id: BigInt(campaign.id?.toString?.() ?? campaign.id),
        name: campaign.name,
        description: campaign.description,
        imageUrl: campaign.imageUrl,
        softCap: BigInt(campaign.softCap?.toString?.() ?? campaign.softCap),
        hardCap: BigInt(campaign.hardCap?.toString?.() ?? campaign.hardCap),
        ticketAmount: BigInt(campaign.ticketAmount?.toString?.() ?? campaign.ticketAmount),
        currentAmount: BigInt(campaign.currentAmount?.toString?.() ?? campaign.currentAmount),
        startDate: BigInt(campaign.startDate?.toString?.() ?? campaign.startDate),
        endDate: BigInt(campaign.endDate?.toString?.() ?? campaign.endDate),
        participantCount: BigInt(campaign.participantCount?.toString?.() ?? campaign.participantCount),
        prizes: campaign.prizes,
        winners: campaign.winners,
        status: Number(campaign.status?.toString?.() ?? campaign.status) as CampaignStatus,
        tokensAreBurned: campaign.tokensAreBurned,
        totalBurned: BigInt(campaign.totalBurned?.toString?.() ?? campaign.totalBurned),
        winnerSelectionBlock: BigInt(campaign.winnerSelectionBlock?.toString?.() ?? campaign.winnerSelectionBlock)
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
        stakedAmount: BigInt(participant.stakedAmount?.toString?.() ?? participant.stakedAmount),
        ticketCount: BigInt(participant.ticketCount?.toString?.() ?? participant.ticketCount),
        hasCompletedSocial: participant.hasCompletedSocial,
        joinedAt: BigInt(participant.joinedAt?.toString?.() ?? participant.joinedAt)
      };
    } catch (error) {
      console.error('Error getting participant:', error);
      return null;
    }
  }

  async stakeTokens(campaignId: number, amount: string): Promise<boolean> {
    try {
      const amountBN = ethers.utils.parseUnits(amount, 18);
      
      if (this.useMockToken) {
        // Mock staking logic
        const userAddress = await this.signer.getAddress();
        const balance = await mockSqudyToken.balanceOf(userAddress);
        
        const hasEnough = (balance as any).lt ? !(balance as any).lt(amountBN) : (BigInt(balance.toString()) >= BigInt(amountBN.toString()));
        if (!hasEnough) {
          toast.error('Insufficient token balance');
          return false;
        }

        // Simulate transfer to campaign manager
        await mockSqudyToken.transfer(
          userAddress, 
          AUTOMATED_CONTRACT_ADDRESSES.CAMPAIGN_MANAGER, 
          BigInt(amountBN.toString())
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
    // Manager still performs burn (transfer-to-dead if token lacks burn). Keep this.
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
      const softCapBN = ethers.utils.parseUnits(softCap, 18);
      const hardCapBN = ethers.utils.parseUnits(hardCap, 18);
      const ticketAmountBN = ethers.utils.parseUnits(ticketAmount, 18);

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

      // Compute the event topic hash with ethers v5/v6 compatibility
      const keccak = (ethers as any).id || (ethers as any).utils?.id;
      const eventTopic = keccak ? keccak("CampaignCreated(uint256,address,string)") : null;

      // Extract campaign ID from event (defensive iteration)
      const logs = Array.isArray(receipt?.logs) ? receipt.logs : [];
      for (const log of logs) {
        try {
          // Try by topic match
          if (eventTopic && log?.topics?.[0] === eventTopic) {
            const idBn = (ethers as any).BigNumber?.from
              ? (ethers as any).BigNumber.from(log.topics[1])
              : (ethers as any).BigNumber?.from?.(log.topics[1]);
            if (idBn) return Number(idBn.toString());
            // Fallback to JS parse if BigNumber is unavailable
            return parseInt(log.topics[1], 16);
          }
          // Fallback: try interface.parseLog if available
          if ((this.campaignManagerContract as any)?.interface?.parseLog) {
            const parsed = (this.campaignManagerContract as any).interface.parseLog(log);
            if (parsed && parsed.name === 'CampaignCreated' && parsed.args?.[0] != null) {
              return Number(parsed.args[0].toString());
            }
          }
        } catch {
          // ignore parsing errors
        }
      }

      // Last-resort fallback: query counter from contract
      try {
        const getTotal = (this.campaignManagerContract as any).getTotalCampaigns || (this.campaignManagerContract as any).getCampaignCount;
        if (getTotal) {
          const total = await getTotal();
          const asNum = Number(total?.toString?.() ?? total);
          if (!Number.isNaN(asNum) && asNum > 0) return asNum;
        }
      } catch {}

      return null;
    } catch (error) {
      console.error('Error creating campaign:', error);
      return null;
    }
  }

  // ============ TOKEN STATS ============

  // Burn stats removed in V4 token

  // ============ EMERGENCY FUNCTIONS ============
  
  async emergencyTerminateCampaign(campaignId: number, refundUsers: boolean): Promise<void> {
    try {
      console.log(`🚨 Emergency terminating campaign ${campaignId}, refund: ${refundUsers}`);
      const tx = await this.campaignManagerContract.emergencyTerminateCampaign(campaignId, refundUsers);
      await tx.wait();
      toast.success(`✅ Campaign ${campaignId} terminated${refundUsers ? ' with refunds' : ''}`);
    } catch (error: any) {
      console.error('❌ Emergency terminate failed:', error);
      toast.error(`❌ Emergency terminate failed: ${error.reason || error.message}`);
      throw error;
    }
  }

  async emergencyPauseContract(): Promise<void> {
    try {
      console.log('🚨 Emergency pausing entire contract');
      const tx = await this.campaignManagerContract.emergencyPause();
      await tx.wait();
      toast.success('✅ Contract emergency paused');
    } catch (error: any) {
      console.error('❌ Emergency pause failed:', error);
      toast.error(`❌ Emergency pause failed: ${error.reason || error.message}`);
      throw error;
    }
  }

  async emergencyUnpauseContract(): Promise<void> {
    try {
      console.log('🚨 Emergency unpausing entire contract');
      const tx = await this.campaignManagerContract.emergencyUnpause();
      await tx.wait();
      toast.success('✅ Contract emergency unpaused');
    } catch (error: any) {
      console.error('❌ Emergency unpause failed:', error);
      toast.error(`❌ Emergency unpause failed: ${error.reason || error.message}`);
      throw error;
    }
  }

  async pauseCampaign(campaignId: number): Promise<void> {
    try {
      console.log(`⏸️ Pausing campaign ${campaignId}`);
      const tx = await this.campaignManagerContract.pauseCampaign(campaignId);
      await tx.wait();
      toast.success(`✅ Campaign ${campaignId} paused`);
    } catch (error: any) {
      console.error('❌ Pause campaign failed:', error);
      toast.error(`❌ Pause campaign failed: ${error.reason || error.message}`);
      throw error;
    }
  }

  async resumeCampaign(campaignId: number): Promise<void> {
    try {
      console.log(`▶️ Resuming campaign ${campaignId}`);
      const tx = await this.campaignManagerContract.resumeCampaign(campaignId);
      await tx.wait();
      toast.success(`✅ Campaign ${campaignId} resumed`);
    } catch (error: any) {
      console.error('❌ Resume campaign failed:', error);
      toast.error(`❌ Resume campaign failed: ${error.reason || error.message}`);
      throw error;
    }
  }

  async updateCampaignEndDate(campaignId: number, newEndDate: Date): Promise<void> {
    try {
      const newEndTimestamp = Math.floor(newEndDate.getTime() / 1000);
      console.log(`📅 Updating campaign ${campaignId} end date to ${newEndDate}`);
      const tx = await this.campaignManagerContract.updateCampaignEndDate(campaignId, newEndTimestamp);
      await tx.wait();
      toast.success(`✅ Campaign ${campaignId} end date updated`);
    } catch (error: any) {
      console.error('❌ Update end date failed:', error);
      toast.error(`❌ Update end date failed: ${error.reason || error.message}`);
      throw error;
    }
  }

  // ============ ROLE MANAGEMENT ============
  
  async grantRole(role: string, account: string): Promise<void> {
    try {
      console.log(`👑 Granting role ${role} to ${account}`);
      const roleHash = role === 'ADMIN' ? await this.campaignManagerContract.ADMIN_ROLE() : await this.campaignManagerContract.OPERATOR_ROLE();
      const tx = await this.campaignManagerContract.grantRole(roleHash, account);
      await tx.wait();
      toast.success(`✅ ${role} role granted to ${account}`);
    } catch (error: any) {
      console.error('❌ Grant role failed:', error);
      toast.error(`❌ Grant role failed: ${error.reason || error.message}`);
      throw error;
    }
  }

  async revokeRole(role: string, account: string): Promise<void> {
    try {
      console.log(`🚫 Revoking role ${role} from ${account}`);
      const roleHash = role === 'ADMIN' ? await this.campaignManagerContract.ADMIN_ROLE() : await this.campaignManagerContract.OPERATOR_ROLE();
      const tx = await this.campaignManagerContract.revokeRole(roleHash, account);
      await tx.wait();
      toast.success(`✅ ${role} role revoked from ${account}`);
    } catch (error: any) {
      console.error('❌ Revoke role failed:', error);
      toast.error(`❌ Revoke role failed: ${error.reason || error.message}`);
      throw error;
    }
  }

  async checkRole(role: string, account: string): Promise<boolean> {
    try {
      const roleHash = role === 'ADMIN' ? await this.campaignManagerContract.ADMIN_ROLE() : await this.campaignManagerContract.OPERATOR_ROLE();
      return await this.campaignManagerContract.hasRole(roleHash, account);
    } catch (error: any) {
      console.error('❌ Check role failed:', error);
      return false;
    }
  }
}