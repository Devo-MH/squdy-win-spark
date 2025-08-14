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
// Lazy-load mock token only when needed to avoid side-effects in production
type MockModule = typeof import('./mockSqudyToken');
let cachedMockModule: MockModule | null = null;
async function loadMock(): Promise<MockModule> {
  if (!cachedMockModule) {
    cachedMockModule = await import('./mockSqudyToken');
  }
  return cachedMockModule;
}

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
  // Simple manager signature
  'function createCampaign(string _title, string _description, uint256 _targetAmount, uint256 _ticketPrice, uint256 _startTime, uint256 _endTime, uint256 _maxParticipants, uint256 _prizePool) external returns (uint256)',
  // Automated/role-based manager signature
  'function createCampaign(string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 startDate, uint256 endDate, string[] prizes) external returns (uint256)',
  // Support multiple manager variants
  'function stakeTokens(uint256 campaignId, uint256 amount) external',
  'function stakeSQUDY(uint256 campaignId, uint256 amount) external',
  'function stakeInCampaign(uint256 _campaignId, uint256 _amount) external',
  'function selectWinners(uint256 _campaignId, address[] _winners) external',
  // Some managers expose a simpler single-arg variant
  'function selectWinners(uint256 _campaignId) external',
  'function burnCampaignTokens(uint256 _campaignId) external',
  'function updateCampaignEndDate(uint256 campaignId, uint256 newEndDate) external',
  'function emergencyPause() external',
  'function emergencyUnpause() external',
  'function confirmSocialTasks(uint256 campaignId, address user) external',
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
  SQUDY_TOKEN: import.meta.env.VITE_SQUDY_TOKEN_ADDRESS || '0xEC377663EcdaA7d20dEa996243114c03F7E147F2',
  CAMPAIGN_MANAGER: import.meta.env.VITE_CAMPAIGN_MANAGER_ADDRESS || '0x0117b89a1E9Ca93f12D757e0712A95a1C90132ef',
};

// Contract service class
export class ContractService {
  private roleStatusCache: Map<string, { result: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  // Public helper to check roles quickly in UI
  async getRoleStatus(address?: string): Promise<{ hasAdmin: boolean; hasOperator: boolean; isOwner: boolean }>{
    const user = address || (await this.signer.getAddress());
    
    // Check cache first
    const cacheKey = user.toLowerCase();
    const cached = this.roleStatusCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }

    const contractAny = this.campaignManagerContract as any;
    let hasAdmin = false;
    let hasOperator = false;
    let isOwner = false;
    try {
      const adminRole = await contractAny.ADMIN_ROLE?.();
      if (adminRole) {
        hasAdmin = Boolean(await contractAny.hasRole?.(adminRole, user));
      }
    } catch {}
    try {
      const operatorRole = await contractAny.OPERATOR_ROLE?.();
      if (operatorRole) {
        hasOperator = Boolean(await contractAny.hasRole?.(operatorRole, user));
      }
    } catch {}
    try {
      const owner = await contractAny.owner?.();
      isOwner = owner ? owner.toLowerCase() === user.toLowerCase() : false;
    } catch {}
    
    const result = { hasAdmin, hasOperator, isOwner };
    
    // Cache the result
    this.roleStatusCache.set(cacheKey, { result, timestamp: Date.now() });
    
    return result;
  }
  private provider: ethers.providers.Web3Provider;
  private signer: ethers.Signer;
  private squdyTokenContract: ethers.Contract | null = null;
  private campaignManagerContract: ethers.Contract;
  private useMockToken: boolean;

  constructor(provider: ethers.providers.Web3Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    // Decide mock mode: explicit env flag OR missing/placeholder address
    const enableMock = String(import.meta.env.VITE_ENABLE_MOCK_FALLBACK || '').toLowerCase() === 'true';
    // Production safety: only enable mock mode via explicit flag
    this.useMockToken = enableMock;
    
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
        const { mockSqudyToken } = await loadMock();
        const balance = await mockSqudyToken.balanceOf(address);
        const decimals = await mockSqudyToken.decimals();
        return safeFormatUnits(balance.toString(), decimals);
      } else {
        const balance = await this.squdyTokenContract!.balanceOf(address);
        const decimals = await this.squdyTokenContract!.decimals();
        return safeFormatUnits(balance, decimals);
      }
    } catch (error) {
      console.error('Error getting token balance:', error);
      // Auto-recover if token address is misconfigured (e.g., pointing at manager)
      try {
        const cAny: any = this.campaignManagerContract;
        if (cAny && typeof cAny.squdyToken === 'function') {
          const onChainToken: string = await cAny.squdyToken();
          if (onChainToken && onChainToken !== ethers.constants.AddressZero) {
            // Rebind token contract to the on-chain address
            this.squdyTokenContract = new ethers.Contract(onChainToken, SQUDY_TOKEN_ABI, this.signer);
            const balance = await this.squdyTokenContract.balanceOf(address);
            const decimals = await this.squdyTokenContract.decimals();
            return safeFormatUnits(balance, decimals);
          }
        }
      } catch (_) {}
      throw error;
    }
  }

  async getTokenAllowance(owner: string, spender: string): Promise<string> {
    try {
      if (this.useMockToken) {
        const { mockSqudyToken } = await loadMock();
        const allowance = await mockSqudyToken.allowance(owner, spender);
        const decimals = await mockSqudyToken.decimals();
        return ethers.utils.formatUnits(allowance.toString(), decimals);
      } else {
        const allowance = await this.squdyTokenContract!.allowance(owner, spender);
        const decimals = await this.squdyTokenContract!.decimals();
        return ethers.utils.formatUnits(allowance, decimals);
      }
    } catch (error) {
      console.error('Error getting token allowance:', error);
      // Auto-recover if token address is misconfigured (e.g., pointing at manager)
      try {
        const cAny: any = this.campaignManagerContract;
        if (cAny && typeof cAny.squdyToken === 'function') {
          const onChainToken: string = await cAny.squdyToken();
          if (onChainToken && onChainToken !== ethers.constants.AddressZero) {
            this.squdyTokenContract = new ethers.Contract(onChainToken, SQUDY_TOKEN_ABI, this.signer);
            const allowance = await this.squdyTokenContract.allowance(owner, spender);
            const decimals = await this.squdyTokenContract.decimals();
            return ethers.utils.formatUnits(allowance, decimals);
          }
        }
      } catch (_) {}
      throw error;
    }
  }

  async approveToken(spender: string, amount: string): Promise<ethers.ContractTransaction | any> {
    try {
      if (this.useMockToken) {
        const { mockSqudyToken } = await loadMock();
        const userAddress = await this.signer.getAddress();
        const decimals = await mockSqudyToken.decimals();
        const amountBN = safeParseUnits(amount, decimals);
        const amountBig = BigInt(amountBN.toString());
        
        await mockSqudyToken.approve(userAddress, spender, amountBig);
        
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
        const { mockSqudyToken } = await loadMock();
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
        const { mockSqudyToken } = await loadMock();
        const userAddress = await this.signer.getAddress();
        const decimals = await mockSqudyToken.decimals();
        const amountBN = safeParseUnits(amount, decimals);
        
        // Check allowance first (get raw BigNumber instead of formatted string)
        const allowanceRaw = await mockSqudyToken.allowance(userAddress, CONTRACT_ADDRESSES.CAMPAIGN_MANAGER);
        const allowanceBN = ethers.BigNumber.from(allowanceRaw.toString());
        
        if (allowanceBN.lt(amountBN)) {
          throw new Error('Insufficient token allowance. Please approve tokens first.');
        }
        
        // Check balance
        const balanceRaw = await mockSqudyToken.balanceOf(userAddress);
        const balanceBN = ethers.BigNumber.from(balanceRaw.toString());
        if (balanceBN.lt(amountBN)) {
          throw new Error('Insufficient token balance for staking.');
        }
        
        // Simulate transfer to campaign manager (burning tokens for staking)
        await mockSqudyToken.transfer(
          userAddress,
          CONTRACT_ADDRESSES.CAMPAIGN_MANAGER || '0x0000000000000000000000000000000000000000',
          BigInt(amountBN.toString())
        );
        
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
      const { mockSqudyToken } = await loadMock();
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
        // Real smart contract implementation with overload handling
        console.log(`🔗 Real: Selecting winners for campaign ${campaignId}`);
        toast.info('Submitting transaction to blockchain...');

        const cAny: any = this.campaignManagerContract;
        const oneArgSig = 'selectWinners(uint256)';
        const twoArgSig = 'selectWinners(uint256,address[])';

        // Try single-arg via callStatic/estimateGas even if ABI lookup by signature fails
        try {
          const oneArg = cAny['selectWinners(uint256)'];
          const oneArgEstimate = cAny.estimateGas?.['selectWinners(uint256)'];
          if (oneArg) {
            let gasOne;
            try { gasOne = oneArgEstimate ? await oneArgEstimate(campaignId) : undefined; } catch {}
            const tx = await oneArg(campaignId, ...(gasOne ? [{ gasLimit: gasOne.mul(120).div(100) }] : []));
            toast.info(`Transaction sent (single-arg): ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);
            return tx;
          }
        } catch (e) {
          console.warn('Single-arg selectWinners path failed, trying two-arg:', (e as any)?.message || e);
        }

        // Two-arg overload fallback: gather participants and pick at least 1 winner
        let participants: string[] = [];
        try {
          if (cAny.getCampaignParticipants) {
            participants = await cAny.getCampaignParticipants(campaignId);
          }
        } catch (_) {}

        if (!participants || participants.length === 0) {
          throw new Error('No participants found to select winners');
        }

        const winners: string[] = [participants[0]]; // minimal winner list for testing
        if (cAny.estimateGas && cAny.estimateGas[twoArgSig]) {
          const g2 = await cAny.estimateGas[twoArgSig](campaignId, winners);
          const tx2 = await cAny[twoArgSig](campaignId, winners, { gasLimit: g2.mul(120).div(100) });
          toast.info(`Transaction sent: ${tx2.hash.slice(0, 10)}... Waiting for confirmation...`);
          return tx2;
        }

        // As a last resort try direct call without overload keys
        const txDirect = await cAny.selectWinners(campaignId, winners);
        toast.info(`Transaction sent: ${txDirect.hash.slice(0, 10)}... Waiting for confirmation...`);
        return txDirect;
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

  // Explicit single-arg selector for managers that expose only selectWinners(uint256)
  async selectWinnersSingle(campaignId: number): Promise<any> {
    try {
      if (this.useMockToken) {
        console.log(`🎲 Mock(single): Selecting winners for campaign ${campaignId}`);
        return {
          hash: '0x' + Math.random().toString(16).substring(2),
          wait: async () => ({ status: 1 })
        };
      }
      const cAny: any = this.campaignManagerContract;
      const fn = cAny['selectWinners(uint256)'];
      if (!fn) {
        throw new Error('Contract is missing selectWinners(uint256)');
      }
      let gas;
      try { gas = await cAny.estimateGas?.['selectWinners(uint256)']?.(campaignId); } catch {}
      const tx = await fn(campaignId, ...(gas ? [{ gasLimit: gas.mul(120).div(100) }] : []));
      toast.info(`Transaction sent (direct): ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);
      return tx;
    } catch (error: any) {
      console.error('❌ selectWinnersSingle failed:', error);
      toast.error(error.message || 'Failed to select winners (single)');
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

      // Prepare overload-aware invocations
      const automatedSig = 'createCampaign(string,string,string,uint256,uint256,uint256,uint256,uint256,string[])';
      const simpleSig = 'createCampaign(string,string,uint256,uint256,uint256,uint256,uint256,uint256)';
      const cAny: any = this.campaignManagerContract;
      
      // Validate contract and interface
      if (!cAny || !cAny.interface) {
        throw new Error('Campaign manager contract not properly initialized');
      }

      // Try automated signature first: (name, description, imageUrl, softCap, hardCap, ticketAmount, start, end, prizes)
      let tx;
      try {
        // Simulate first to surface revert reason
        try {
          if (cAny.callStatic && cAny.callStatic[automatedSig]) {
            await cAny.callStatic[automatedSig](
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
          } else {
            throw new Error('SIGNATURE_MISMATCH');
          }
        } catch (simErr: any) {
          const raw = simErr?.error?.message || simErr?.data?.message || simErr?.message || '';
          const msg = String(raw || 'Simulation reverted');
          // Only allow fallback if the error clearly indicates a signature mismatch
          const signatureMismatch = msg === 'SIGNATURE_MISMATCH' || /no matching function|matching function|too (few|many) arguments|missing arguments|fragment|is not a function/i.test(msg);
          if (!signatureMismatch) {
            throw new Error(msg);
          }
          // If signature mismatch, jump to fallback by rethrowing a sentinel
          throw Object.assign(new Error('SIGNATURE_MISMATCH'), { __fallback: true });
        }
        // Gas pre-estimation for clearer error reporting
        try {
          if (cAny.estimateGas && cAny.estimateGas[automatedSig]) {
            await cAny.estimateGas[automatedSig](
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
        } catch (estErr: any) {
          // Continue to try sending, ethers will throw if it truly reverts
          console.warn('Gas estimation failed for automated signature; will attempt send:', estErr?.message || estErr);
        }
        // Add 20% gas buffer if estimate succeeded
        const gasLimit1 = await (async () => {
          try {
            if (!cAny.estimateGas || !cAny.estimateGas[automatedSig]) return undefined;
            const g = await cAny.estimateGas[automatedSig](
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
        if (!cAny[automatedSig]) throw Object.assign(new Error('SIGNATURE_MISMATCH'), { __fallback: true });
        tx = await cAny[automatedSig](
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
      } catch (e: any) {
        // Fallback: simple signature (title, description, targetAmount, ticketPrice, startTime, endTime, maxParticipants, prizePool)
        // Map hardCap->targetAmount, ticketAmount->ticketPrice, use large maxParticipants, prizePool=hardCap
        if (!(e && e.__fallback)) {
          // If the automated path failed for a reason OTHER than signature mismatch, do not fallback.
          throw e;
        }
        try {
          if (cAny.callStatic && cAny.callStatic[simpleSig]) {
            await cAny.callStatic[simpleSig](
              data.name,
              data.description,
              hardCapBN,
              ticketAmountBN,
              startTs,
              endTs,
              1000000,
              hardCapBN
            );
          } else {
            throw new Error('No matching createCampaign overload on contract');
          }
        } catch (simErr2: any) {
          const msg = simErr2?.error?.message || simErr2?.data?.message || simErr2?.message || 'Simulation reverted';
          throw new Error(msg);
        }
        try {
          if (cAny.estimateGas && cAny.estimateGas[simpleSig]) {
            await cAny.estimateGas[simpleSig](
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
        } catch (estErr2: any) {
          console.warn('Gas estimation failed for simple signature; will attempt send:', estErr2?.message || estErr2);
        }
        const gasLimit2 = await (async () => {
          try {
            if (!cAny.estimateGas || !cAny.estimateGas[simpleSig]) return undefined;
            const g = await cAny.estimateGas[simpleSig](
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
        if (!cAny[simpleSig]) throw new Error('No matching createCampaign overload on contract');
        tx = await cAny[simpleSig](
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
      if (!receipt || !receipt.logs) {
        throw new Error('Transaction receipt is invalid or missing logs');
      }
      
      const logs = Array.isArray(receipt.logs) ? receipt.logs : [];
      for (const log of logs) {
        if (!log) continue;
        try {
          if (!this.campaignManagerContract?.interface?.parseLog) {
            console.warn('Contract interface parseLog not available');
            continue;
          }
          const parsed = this.campaignManagerContract.interface.parseLog(log);
          if (parsed && parsed.name === 'CampaignCreated' && parsed.args) {
            const idArg = parsed.args[0];
            if (idArg != null) {
              return Number(idArg.toString());
            }
          }
        } catch (parseErr) {
          console.warn('Failed to parse log:', parseErr);
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
        const { mockSqudyToken } = await loadMock();
        mockSqudyToken.burnCampaignTokens(campaignId);
        
        toast.success('🔥 All staked tokens have been burned!');
        
        // Return a mock transaction object
        return {
          hash: '0x' + Math.random().toString(16).substring(2),
          wait: async () => ({ status: 1 })
        };
      } else {
        // Real smart contract implementation with function name fallback
        console.log(`🔗 Real: Burning all staked tokens for campaign ${campaignId}`);
        toast.info('Submitting burn transaction to blockchain...');

        const cAny: any = this.campaignManagerContract;

        // Preflight checks to avoid blind reverts
        try {
          const state: any = (await (cAny.getCampaign?.(campaignId) || cAny.campaigns?.(campaignId))) || null;
          console.log('🔍 Campaign state:', state);
          if (state) {
            // Automated manager shape
            if (state.status !== undefined) {
              const status = Number(state.status);
              const tokensAreBurned = Boolean(state.tokensAreBurned ?? false);
              const currentAmount = ethers.BigNumber.from(state.currentAmount ?? 0);
              console.log('🔍 Status:', status, 'Burned:', tokensAreBurned, 'Amount:', currentAmount.toString());
              if (status !== 3) throw new Error('Cannot burn: winners not selected yet (status != Finished)');
              if (tokensAreBurned) throw new Error('Cannot burn: tokens already burned');
              if (currentAmount.lte(0)) throw new Error('Cannot burn: no staked tokens to burn');
            } else if (state.winnersSelected !== undefined) {
              // Legacy/simple manager shape - query total staked from contract
              const winnersSelected = Boolean(state.winnersSelected);
              let totalStaked = ethers.BigNumber.from(0);
              try {
                const ts = await (cAny.totalStaked?.(campaignId));
                if (ts != null) {
                  totalStaked = ethers.BigNumber.from(ts.toString?.() ?? ts);
                }
              } catch {}
              const prizePool = ethers.BigNumber.from(state.prizePool ?? 0);
              console.log("🔍 Winners selected:", winnersSelected, "Total staked:", totalStaked.toString(), "Prize pool:", prizePool.toString());
              if (!winnersSelected) throw new Error("Cannot burn: winners not selected yet");
              if (totalStaked.lte(0)) throw new Error("Cannot burn: no staked tokens to burn");
            }
          }
        } catch (preErr: any) {
          console.error('❌ Preflight check failed:', preErr);
          if (preErr?.message?.startsWith('Cannot burn')) {
            toast.error(preErr.message);
            throw preErr;
          }
        }

        // Optional: token linkage/pause check and auto-rebind
        try {
          const managerTokenAddr = await cAny.squdyToken?.();
          console.log('🔍 Manager token address:', managerTokenAddr);
          if (managerTokenAddr && this.squdyTokenContract?.address?.toLowerCase() !== managerTokenAddr.toLowerCase()) {
            console.log('🔍 Rebinding token from', this.squdyTokenContract?.address, 'to', managerTokenAddr);
            this.squdyTokenContract = new ethers.Contract(managerTokenAddr, SQUDY_TOKEN_ABI, this.signer);
          }
          const tAny: any = this.squdyTokenContract;
          console.log('🔍 Token contract:', tAny?.address);
          // V4 token has no campaignManager linkage – skip linkage checks
          if (tAny?.paused) {
            const isPaused = await tAny.paused();
            console.log('🔍 Token paused:', isPaused);
            if (isPaused) throw new Error('Token paused: unpause before burning');
          }
        } catch (tokenErr: any) {
          console.error('❌ Token check failed:', tokenErr);
          if (tokenErr?.message?.includes('paused')) {
            toast.error(tokenErr.message);
            throw tokenErr;
          }
        }

        // Do a staticcall first to capture revert reason before sending a tx
        const tryStatic = async (fnName: string) => {
          if (!fnName || !cAny[fnName] || !cAny.callStatic || !cAny.callStatic[fnName]) return false;
          try {
            console.log(`🔍 Testing ${fnName} with staticcall...`);
            await cAny.callStatic[fnName](campaignId);
            console.log(`✅ ${fnName} staticcall succeeded`);
            return true;
          } catch (e: any) {
            console.error(`❌ ${fnName} staticcall failed:`, e);
            const data = e?.data || e?.error?.data;
            if (typeof data === 'string' && data.startsWith('0x08c379a0')) {
              try {
                const reason = ethers.utils.defaultAbiCoder.decode(['string'], '0x' + data.slice(10))[0];
                toast.error(`Burn precheck failed: ${reason}`);
              } catch {}
            } else if (e?.reason) {
              toast.error(`Burn precheck failed: ${e.reason}`);
            }
            return false;
          }
        };

        const staticOk = await tryStatic('burnCampaignTokens') || await tryStatic('burnTokens') || await tryStatic('burnAllTokens');
        console.log('🔍 Staticcall results:', staticOk);
        if (!staticOk) {
          throw new Error('Burn reverted in simulation. Fix the reason shown and try again.');
        }

        const trySend = async (fnName: string) => {
          if (!fnName || !cAny[fnName]) return null;
          try {
            let gasLimit;
            try {
              if (cAny.estimateGas && cAny.estimateGas[fnName]) {
                const g = await cAny.estimateGas[fnName](campaignId);
                gasLimit = g.mul(120).div(100);
              }
            } catch (eg) {
              // Estimation failed; set a conservative cap to still surface revert reason
              gasLimit = ethers.BigNumber.from('300000');
            }
            console.log(`🚀 Sending ${fnName} with gas:`, gasLimit?.toString());
            const tx = await cAny[fnName](campaignId, ...(gasLimit ? [{ gasLimit }] : []));
            toast.info(`Burn tx sent: ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);
            return tx;
          } catch (e: any) {
            // Decode revert reason if present
            const data = e?.data || e?.error?.data;
            if (typeof data === 'string' && data.startsWith('0x08c379a0')) {
              try {
                const reason = ethers.utils.defaultAbiCoder.decode(['string'], '0x' + data.slice(10))[0];
                toast.error(`Burn failed: ${reason}`);
              } catch {}
            } else if (e?.reason) {
              toast.error(`Burn failed: ${e.reason}`);
            }
            return null;
          }
        };

        // Try the function that matches the detected contract type
        // Old SimpleSqudyCampaignManager uses burnCampaignTokens, new AutomatedSqudyCampaignManager uses burnTokens
        const tx = await trySend('burnCampaignTokens') || await trySend('burnTokens') || await trySend('burnAllTokens');
        if (!tx) {
          throw new Error('Burn reverted or function not available. Ensure winners selected, tokens not already burned, and token not paused.');
        }
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

  async endCampaignNow(campaignId: number): Promise<any> {
    try {
      // Set endDate to now + 30 seconds to pass the end check shortly
      const newEnd = Math.floor(Date.now() / 1000) + 30;
      const tx = await (this.campaignManagerContract as any).updateCampaignEndDate(campaignId, newEnd);
      toast.info('Updating campaign end time...');
      return tx;
    } catch (error: any) {
      console.error('❌ Update end date failed:', error);
      toast.error(error.message || 'Failed to update campaign end time');
      throw error;
    }
  }

  async pauseAll(): Promise<any> {
    try {
      const tx = await (this.campaignManagerContract as any).emergencyPause();
      toast.info('Pausing all campaign operations...');
      return tx;
    } catch (error: any) {
      toast.error(error.message || 'Failed to pause');
      throw error;
    }
  }

  async unpauseAll(): Promise<any> {
    try {
      const tx = await (this.campaignManagerContract as any).emergencyUnpause();
      toast.info('Resuming campaign operations...');
      return tx;
    } catch (error: any) {
      toast.error(error.message || 'Failed to unpause');
      throw error;
    }
  }

  async confirmUserSocialTasks(campaignId: number, userAddress: string): Promise<any> {
    try {
      const tx = await (this.campaignManagerContract as any).confirmSocialTasks(campaignId, userAddress);
      toast.info('Confirming user social tasks...');
      return tx;
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm social tasks');
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
    const toNum = (v: any): number => {
      try {
        if (v == null) return 0;
        if (typeof v === 'number') return v;
        if (typeof v === 'string') return Number(v) || 0;
        if (typeof v.toNumber === 'function') return v.toNumber();
        return Number(v) || 0;
      } catch { return 0; }
    };
    const fmt18 = (v: any): string => {
      try { return safeFormatUnits(v ?? '0', 18); } catch { return '0'; }
    };
    const getDateMs = (v: any): number => {
      // Supports seconds (BN), ms number/string, or Date
      if (v == null) return 0;
      try {
        if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber() * 1000;
        const n = Number(v);
        if (!Number.isFinite(n)) return 0;
        // Heuristic: treat > 10^12 as ms already
        return n > 1e12 ? n : n * 1000;
      } catch { return 0; }
    };

    const statusRaw = campaign?.status;
    const status = typeof statusRaw === 'string' ? statusRaw : this.getStatusString(toNum(statusRaw));
    const startMs = getDateMs(campaign?.startDate ?? campaign?.startTime);
    const endMs = getDateMs(campaign?.endDate ?? campaign?.endTime);
    const createdMs = getDateMs(campaign?.createdAt) || startMs || Date.now();
    const updatedMs = getDateMs(campaign?.updatedAt) || endMs || createdMs;

    return {
      id: toNum(campaign?.id ?? campaign?.campaignId),
      name: campaign?.name ?? '',
      description: campaign?.description ?? '',
      imageUrl: campaign?.imageUrl ?? '',
      softCap: fmt18(campaign?.softCap),
      hardCap: fmt18(campaign?.hardCap),
      ticketAmount: fmt18(campaign?.ticketAmount),
      currentAmount: fmt18(campaign?.currentAmount),
      startDate: new Date(startMs || Date.now()),
      endDate: new Date(endMs || Date.now()),
      participantCount: toNum(campaign?.participantCount),
      prizes: campaign?.prizes ?? [],
      winners: campaign?.winners ?? [],
      status,
      tokensAreBurned: Boolean(campaign?.tokensAreBurned),
      totalBurned: fmt18(campaign?.totalBurned),
      winnerSelectionTxHash: campaign?.winnerSelectionTxHash ?? '',
      createdAt: new Date(createdMs),
      updatedAt: new Date(updatedMs),
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