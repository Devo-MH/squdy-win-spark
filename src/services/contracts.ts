import { ethers } from 'ethers';
import { toast } from 'sonner';

// Safe ethers utils helpers
const safeParseUnits = (value: string, decimals: number) => {
  if (!ethers?.utils?.parseUnits) {
    throw new Error('ethers.utils.parseUnits is not available');
  }
  return ethers.utils.parseUnits(value, decimals);
};

const safeFormatUnits = (value: any, decimals: number) => {
  if (!ethers?.utils?.formatUnits) {
    throw new Error('ethers.utils.formatUnits is not available');
  }
  return ethers.utils.formatUnits(value, decimals);
};

// Extend Window interface for session tracking
declare global {
  interface Window {
    mockTokenToastShown?: boolean;
  }
}
import { mockSqudyToken } from './mockSqudyToken';

// Contract ABIs for SimpleSqudyCampaignManager
const CAMPAIGN_MANAGER_ABI = [
  'function campaigns(uint256) external view returns (address creator, string title, string description, uint256 targetAmount, uint256 ticketPrice, uint256 startTime, uint256 endTime, uint256 maxParticipants, bool isActive, bool winnersSelected, uint256 totalParticipants, uint256 prizePool)',
  'function campaignCounter() external view returns (uint256)',
  'function stakes(uint256, address) external view returns (uint256 amount, uint256 tickets, uint256 timestamp, bool withdrawn)',
  'function hasStaked(uint256, address) external view returns (bool)',
  'function totalStaked(uint256) external view returns (uint256)',
  'function getCampaign(uint256 _campaignId) external view returns (tuple(address creator, string title, string description, uint256 targetAmount, uint256 ticketPrice, uint256 startTime, uint256 endTime, uint256 maxParticipants, bool isActive, bool winnersSelected, uint256 totalParticipants, uint256 prizePool))',
  'function getUserStake(uint256 _campaignId, address _user) external view returns (tuple(uint256 amount, uint256 tickets, uint256 timestamp, bool withdrawn))',
  'function getCampaignParticipants(uint256 _campaignId) external view returns (address[])',
  'function createCampaign(string _title, string _description, uint256 _targetAmount, uint256 _ticketPrice, uint256 _startTime, uint256 _endTime, uint256 _maxParticipants, uint256 _prizePool) external returns (uint256)',
  // Support multiple manager variants
  'function stakeTokens(uint256 campaignId, uint256 amount) external',
  'function stakeSQUDY(uint256 campaignId, uint256 amount) external',
  'function stakeInCampaign(uint256 _campaignId, uint256 _amount) external',
  'function selectWinners(uint256 _campaignId, address[] _winners) external',
  'function burnCampaignTokens(uint256 _campaignId) external',
  // Optional access-control helpers (not all deployments implement these)
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function ADMIN_ROLE() external view returns (bytes32)',
  'function OPERATOR_ROLE() external view returns (bytes32)',
  'function owner() external view returns (address)',
  
  // Events
  'event CampaignCreated(uint256 indexed campaignId, address indexed creator, string title)',
  'event StakeCreated(uint256 indexed campaignId, address indexed participant, uint256 amount, uint256 tickets)',
  'event WinnersSelected(uint256 indexed campaignId, address[] winners)',
  'event TokensBurned(uint256 indexed campaignId, uint256 amount)',
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
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function getFreeTokens() external',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

// Contract addresses (Sepolia testnet deployment)
export const CONTRACT_ADDRESSES = {
  SQUDY_TOKEN: import.meta.env.VITE_SQUDY_TOKEN_ADDRESS || '0x1234567890123456789012345678901234567890',
  CAMPAIGN_MANAGER: import.meta.env.VITE_CAMPAIGN_MANAGER_ADDRESS || '0x0987654321098765432109876543210987654321',
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
    
    // Use mock token if contract addresses are demo addresses
    this.useMockToken = CONTRACT_ADDRESSES.SQUDY_TOKEN === '0x1234567890123456789012345678901234567890' || 
                       !CONTRACT_ADDRESSES.SQUDY_TOKEN || 
                       CONTRACT_ADDRESSES.SQUDY_TOKEN === '';
    
    if (!this.useMockToken) {
      this.squdyTokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.SQUDY_TOKEN,
        SQUDY_TOKEN_ABI,
        signer
      );
    } else {
      // Create contract instance for the SimpleMockSqudyToken
      this.squdyTokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.SQUDY_TOKEN,
        SQUDY_TOKEN_ABI,
        signer
      );
    }
    
    // Campaign manager contract
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
        return safeFormatUnits(balance, decimals);
      } else {
        const balance = await this.squdyTokenContract!.balanceOf(address);
        const decimals = await this.squdyTokenContract!.decimals();
        return safeFormatUnits(balance, decimals);
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
        const amountBN = safeParseUnits(amount, decimals);
        
        await mockSqudyToken.approve(userAddress, spender, amountBN);
        
        // Return a mock transaction object
        return {
          hash: '0x' + Math.random().toString(16).substring(2),
          wait: async () => ({ status: 1 })
        };
      } else {
        const decimals = await this.squdyTokenContract!.decimals();
        const amountBN = safeParseUnits(amount, decimals);
        
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
        const amountBN = safeParseUnits(amount, decimals);
        
        // Check allowance first (get raw BigNumber instead of formatted string)
        const allowanceBN = await mockSqudyToken.allowance(userAddress, CONTRACT_ADDRESSES.CAMPAIGN_MANAGER);
        
        if (allowanceBN < amountBN) {
          throw new Error('Insufficient token allowance. Please approve tokens first.');
        }
        
        // Check balance
        const balance = await mockSqudyToken.balanceOf(userAddress);
        if (balance < amountBN) {
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
        const amountBN = safeParseUnits(amount, decimals);
        
        // Check allowance first
        const userAddress = await this.signer.getAddress();
        const allowanceBN = await this.squdyTokenContract!.allowance(userAddress, CONTRACT_ADDRESSES.CAMPAIGN_MANAGER);
        
        if (allowanceBN < amountBN) {
          throw new Error('Insufficient token allowance. Please approve tokens first.');
        }
        
        // Support multiple function names across manager versions
        const stakeFn =
          (this.campaignManagerContract as any).stakeTokens ||
          (this.campaignManagerContract as any).stakeSQUDY ||
          (this.campaignManagerContract as any).stakeInCampaign;

        if (!stakeFn) {
          throw new Error('Staking function not found on campaign manager contract');
        }

        const tx = await stakeFn(campaignId, amountBN);
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

  // Admin functions for winner selection and token burning
  async selectWinners(campaignId: number): Promise<any> {
    try {
      if (this.useMockToken) {
        // Mock winner selection - simulate the process
        console.log(`🎲 Mock: Selecting winners for campaign ${campaignId}`);
        toast.info('Selecting winners using mock randomness...');
        
        // Return a mock transaction object
        return {
          hash: '0x' + Math.random().toString(16).substring(2),
          wait: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate blockchain delay
            toast.success('🏆 Winners selected successfully!');
            return { status: 1 };
          }
        };
      } else {
        // Real smart contract implementation
        console.log(`🔗 Real: Selecting winners for campaign ${campaignId}`);
        toast.info('Submitting transaction to blockchain...');
        
        // Gas estimation for better UX
        const gasEstimate = await this.campaignManagerContract.estimateGas.selectWinners(campaignId);
        console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
        
        // Add 20% buffer to gas estimate
        const gasLimit = gasEstimate.mul(120).div(100);
        const tx = await this.campaignManagerContract.selectWinners(campaignId, { gasLimit });
        toast.info(`Transaction sent: ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);
        return tx;
      }
    } catch (error: any) {
      console.error('❌ SelectWinners failed:', error);
      if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds for gas. Please add ETH to your wallet.');
      } else if (error.code === 'USER_REJECTED') {
        toast.error('Transaction rejected by user.');
      } else if (error.message?.includes('revert')) {
        toast.error('Smart contract error: ' + error.reason || 'Transaction reverted');
      } else {
        toast.error('Failed to select winners: ' + error.message);
      }
      throw error;
    }
  }

  // Create campaign on-chain and return the created campaignId
  async createCampaign(data: {
    name: string;
    description: string;
    imageUrl?: string;
    softCap: string | number;
    hardCap: string | number;
    ticketAmount: string | number;
    startDate: string; // ISO or datetime-local
    endDate: string;   // ISO or datetime-local
    prizes?: string[];
  }): Promise<number> {
    try {
      const account = await this.signer.getAddress();
      // Ensure the manager is deployed on this network
      try {
        const code = await this.provider.getCode(CONTRACT_ADDRESSES.CAMPAIGN_MANAGER);
        if (!code || code === '0x') {
          throw new Error('CampaignManager not deployed on this network. Switch to the correct chain.');
        }
      } catch (netErr: any) {
        // Older ethers may not support getCode on this provider; ignore
      }
      const startTs = Math.floor(new Date(data.startDate).getTime() / 1000);
      const endTs = Math.floor(new Date(data.endDate).getTime() / 1000);
      const decimals = this.useMockToken ? 18 : await this.squdyTokenContract!.decimals();
      const softCapBN = safeParseUnits(String(data.softCap), decimals);
      const hardCapBN = safeParseUnits(String(data.hardCap), decimals);
      const ticketAmountBN = safeParseUnits(String(data.ticketAmount), decimals);

      const contractAny = this.campaignManagerContract as any;

      // Preflight: if access control exists, verify caller has admin/operator role
      try {
        const adminRole = await contractAny.ADMIN_ROLE?.();
        const operatorRole = await contractAny.OPERATOR_ROLE?.();
        if (adminRole || operatorRole) {
          let authorized = true;
          if (adminRole) {
            const hasAdmin = await contractAny.hasRole?.(adminRole, account);
            authorized = authorized && (hasAdmin !== false);
          }
          if (operatorRole) {
            const hasOp = await contractAny.hasRole?.(operatorRole, account);
            authorized = authorized || (hasOp === true);
          }
          if (!authorized) {
            throw new Error('Your wallet is not authorized to create campaigns (missing ADMIN/OPERATOR role)');
          }
        }
      } catch (_) {
        // ignore if not implemented
      }

      // Preflight: if Ownable exists, ensure caller is owner
      try {
        const owner = await contractAny.owner?.();
        if (owner && owner.toLowerCase() !== account.toLowerCase()) {
          throw new Error('Your wallet is not authorized to create campaigns (caller is not the owner)');
        }
      } catch (_) {
        // ignore if not implemented
      }

      // Try automated signature first: (name, description, imageUrl, softCap, hardCap, ticketAmount, start, end, prizes)
      let tx;
      try {
        // Simulate first to surface revert reason
        try {
          if (this.campaignManagerContract.callStatic && (this.campaignManagerContract as any).callStatic.createCampaign) {
            await (this.campaignManagerContract as any).callStatic.createCampaign(
              data.name,
              data.description,
              data.imageUrl || '',
              softCapBN,
              hardCapBN,
              ticketAmountBN,
              startTs,
              endTs,
              Array.isArray(data.prizes) ? data.prizes : []
            );
          }
        } catch (simErr: any) {
          const msg = simErr?.error?.message || simErr?.data?.message || simErr?.message || 'Simulation reverted';
          throw new Error(msg);
        }
        // Gas pre-estimation for clearer error reporting
        try {
          await this.campaignManagerContract.estimateGas.createCampaign(
            data.name,
            data.description,
            data.imageUrl || '',
            softCapBN,
            hardCapBN,
            ticketAmountBN,
            startTs,
            endTs,
            Array.isArray(data.prizes) ? data.prizes : []
          );
        } catch (estErr: any) {
          // Continue to try sending, ethers will throw if it truly reverts
          console.warn('Gas estimation failed for automated signature; will attempt send:', estErr?.message || estErr);
        }
        // Add 20% gas buffer if estimate succeeded
        const gasLimit1 = await (async () => {
          try {
            const g = await this.campaignManagerContract.estimateGas.createCampaign(
              data.name,
              data.description,
              data.imageUrl || '',
              softCapBN,
              hardCapBN,
              ticketAmountBN,
              startTs,
              endTs,
              Array.isArray(data.prizes) ? data.prizes : []
            );
            return g.mul(120).div(100);
          } catch {
            return undefined;
          }
        })();
        tx = await contractAny.createCampaign(
          data.name,
          data.description,
          data.imageUrl || '',
          softCapBN,
          hardCapBN,
          ticketAmountBN,
          startTs,
          endTs,
          Array.isArray(data.prizes) ? data.prizes : [],
          ...(gasLimit1 ? [{ gasLimit: gasLimit1 }] : [])
        );
      } catch (e) {
        // Fallback: simple signature (title, description, targetAmount, ticketPrice, startTime, endTime, maxParticipants, prizePool)
        // Map hardCap->targetAmount, ticketAmount->ticketPrice, use large maxParticipants, prizePool=hardCap
        try {
          if (this.campaignManagerContract.callStatic && (this.campaignManagerContract as any).callStatic.createCampaign) {
            await (this.campaignManagerContract as any).callStatic.createCampaign(
              data.name,
              data.description,
              hardCapBN,
              ticketAmountBN,
              startTs,
              endTs,
              1000000,
              hardCapBN
            );
          }
        } catch (simErr2: any) {
          const msg = simErr2?.error?.message || simErr2?.data?.message || simErr2?.message || 'Simulation reverted';
          throw new Error(msg);
        }
        try {
          await this.campaignManagerContract.estimateGas.createCampaign(
            data.name,
            data.description,
            hardCapBN,
            ticketAmountBN,
            startTs,
            endTs,
            1000000,
            hardCapBN
          );
        } catch (estErr2: any) {
          console.warn('Gas estimation failed for simple signature; will attempt send:', estErr2?.message || estErr2);
        }
        const gasLimit2 = await (async () => {
          try {
            const g = await this.campaignManagerContract.estimateGas.createCampaign(
              data.name,
              data.description,
              hardCapBN,
              ticketAmountBN,
              startTs,
              endTs,
              1000000,
              hardCapBN
            );
            return g.mul(120).div(100);
          } catch {
            return undefined;
          }
        })();
        tx = await contractAny.createCampaign(
          data.name,
          data.description,
          hardCapBN,
          ticketAmountBN,
          startTs,
          endTs,
          1000000,
          hardCapBN,
          ...(gasLimit2 ? [{ gasLimit: gasLimit2 }] : [])
        );
      }

      const receipt = await tx.wait();

      // Try to parse CampaignCreated event for id
      const logs = receipt.logs || [];
      for (const log of logs) {
        try {
          const parsed = this.campaignManagerContract.interface.parseLog(log);
          if (parsed && parsed.name === 'CampaignCreated') {
            const idArg = parsed.args?.[0];
            if (idArg != null) {
              return Number(idArg.toString());
            }
          }
        } catch (_) {
          // ignore parse errors
        }
      }

      // As a fallback, try reading a counter
      try {
        const counter = await (contractAny.getCampaignCount?.() || contractAny.campaignCounter?.());
        if (counter) {
          const value = typeof counter.toNumber === 'function' ? counter.toNumber() : Number(counter);
          return value - 1 >= 0 ? value - 1 : value;
        }
      } catch (_) {}

      throw new Error('Could not determine created campaign id from transaction');
    } catch (error) {
      console.error('Error creating on-chain campaign:', error);
      throw error;
    }
  }

  async burnAllTokens(campaignId: number): Promise<any> {
    try {
      if (this.useMockToken) {
        // Mock token burning - simulate burning all staked tokens
        console.log(`🔥 Mock: Burning all staked tokens for campaign ${campaignId}`);
        
        // In mock mode, we simulate burning by "removing" tokens from circulation
        // The actual burning would transfer tokens to a burn address or reduce total supply
        mockSqudyToken.burnCampaignTokens(campaignId);
        
        toast.success('🔥 All staked tokens have been burned!');
        
        // Return a mock transaction object
        return {
          hash: '0x' + Math.random().toString(16).substring(2),
          wait: async () => ({ status: 1 })
        };
      } else {
        // Real smart contract implementation
        console.log(`🔗 Real: Burning all staked tokens for campaign ${campaignId}`);
        toast.info('Submitting burn transaction to blockchain...');
        
        // Gas estimation for better UX
        const gasEstimate = await this.campaignManagerContract.estimateGas.burnAllTokens(campaignId);
        console.log(`⛽ Estimated gas for burn: ${gasEstimate.toString()}`);
        
        // Add 20% buffer to gas estimate
        const gasLimit = gasEstimate.mul(120).div(100);
        const tx = await this.campaignManagerContract.burnAllTokens(campaignId, { gasLimit });
        toast.info(`Burn transaction sent: ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);
        return tx;
      }
    } catch (error: any) {
      console.error('❌ BurnAllTokens failed:', error);
      if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds for gas. Please add ETH to your wallet.');
      } else if (error.code === 'USER_REJECTED') {
        toast.error('Transaction rejected by user.');
      } else if (error.message?.includes('revert')) {
        toast.error('Smart contract error: ' + error.reason || 'Transaction reverted');
      } else {
        toast.error('Failed to burn tokens: ' + error.message);
      }
      throw error;
    }
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
              softCap: ethers.utils.formatUnits(campaign.softCap, 18),
        hardCap: ethers.utils.formatUnits(campaign.hardCap, 18),
        ticketAmount: ethers.utils.formatUnits(campaign.ticketAmount, 18),
        currentAmount: ethers.utils.formatUnits(campaign.currentAmount, 18),
      startDate: new Date(campaign.startDate.toNumber() * 1000),
      endDate: new Date(campaign.endDate.toNumber() * 1000),
      participantCount: campaign.participantCount.toNumber(),
      prizes: campaign.prizes,
      winners: campaign.winners,
      status: this.getStatusString(campaign.status),
      tokensAreBurned: campaign.tokensAreBurned,
      totalBurned: ethers.utils.formatUnits(campaign.totalBurned),
      winnerSelectionTxHash: campaign.winnerSelectionTxHash,
      createdAt: new Date(campaign.createdAt.toNumber() * 1000),
      updatedAt: new Date(campaign.updatedAt.toNumber() * 1000),
    };
  }

  private parseParticipantData(participant: any): any {
    return {
      stakedAmount: ethers.utils.formatUnits(participant.stakedAmount),
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
          ticketAmount: ethers.utils.formatUnits(ticketAmount),
        });
      });
    }

    if (callbacks.onUserStaked) {
      this.campaignManagerContract.on('UserStaked', (campaignId, user, amount, tickets) => {
        callbacks.onUserStaked!({
          campaignId: campaignId.toNumber(),
          user,
          amount: ethers.utils.formatUnits(amount),
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
          totalBurned: ethers.utils.formatUnits(totalBurned),
        });
      });
    }
  }



  // Cleanup event listeners
  removeAllListeners(): void {
    this.campaignManagerContract.removeAllListeners();
    if (this.squdyTokenContract) {
      this.squdyTokenContract.removeAllListeners();
    }
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