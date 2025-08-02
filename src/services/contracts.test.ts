import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useContracts } from './contracts';
import { mockTransactionResponse, mockContractCampaign } from '@/test/mocks/data';

// Mock ethers
const mockContract = {
  balanceOf: vi.fn(),
  allowance: vi.fn(),
  approve: vi.fn(),
  transfer: vi.fn(),
  getCampaign: vi.fn(),
  getActiveCampaignCount: vi.fn(),
  stakeToCampaign: vi.fn(),
  getUserStake: vi.fn(),
  hasUserCompletedSocialTasks: vi.fn(),
  markSocialTaskComplete: vi.fn(),
  pauseCampaign: vi.fn(),
  resumeCampaign: vi.fn(),
  selectWinners: vi.fn(),
  burnStakedTokens: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  wait: vi.fn(),
};

const mockProvider = {
  getNetwork: vi.fn(),
  getBalance: vi.fn(),
  waitForTransaction: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

const mockSigner = {
  getAddress: vi.fn(),
  signMessage: vi.fn(),
  connect: vi.fn(),
};

vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn().mockImplementation(() => mockProvider),
    Contract: vi.fn().mockImplementation(() => mockContract),
    formatUnits: vi.fn().mockImplementation((value, decimals = 18) => {
      // Simple mock implementation
      const num = typeof value === 'string' ? parseInt(value) : value;
      return (num / Math.pow(10, decimals)).toString();
    }),
    parseUnits: vi.fn().mockImplementation((value, decimals = 18) => {
      // Simple mock implementation
      const num = parseFloat(value);
      return (num * Math.pow(10, decimals)).toString();
    }),
  },
}));

// Mock Web3 context
const mockWeb3Context = {
  provider: mockProvider,
  signer: mockSigner,
  account: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  chainId: 11155111, // Sepolia
};

vi.mock('@/contexts/Web3Context', () => ({
  useWeb3: () => mockWeb3Context,
}));

describe('Contracts Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockContract.balanceOf.mockResolvedValue('1000000000000000000000'); // 1000 tokens
    mockContract.allowance.mockResolvedValue('0');
    mockContract.approve.mockResolvedValue(mockTransactionResponse);
    mockContract.transfer.mockResolvedValue(mockTransactionResponse);
    mockContract.getCampaign.mockResolvedValue(mockContractCampaign);
    mockContract.getActiveCampaignCount.mockResolvedValue(5);
    mockContract.stakeToCampaign.mockResolvedValue(mockTransactionResponse);
    mockContract.getUserStake.mockResolvedValue(['500000000000000000000', 5]); // 500 tokens, 5 tickets
    mockContract.hasUserCompletedSocialTasks.mockResolvedValue(false);
    mockContract.markSocialTaskComplete.mockResolvedValue(mockTransactionResponse);
    mockContract.pauseCampaign.mockResolvedValue(mockTransactionResponse);
    mockContract.resumeCampaign.mockResolvedValue(mockTransactionResponse);
    mockContract.selectWinners.mockResolvedValue(mockTransactionResponse);
    mockContract.burnStakedTokens.mockResolvedValue(mockTransactionResponse);
    mockContract.createCampaign.mockResolvedValue(mockTransactionResponse);
    mockContract.updateCampaign.mockResolvedValue(mockTransactionResponse);
    
    mockSigner.getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
    mockProvider.getNetwork.mockResolvedValue({ chainId: 11155111 });
  });

  describe('useContracts Hook', () => {
    it('initializes contracts correctly when Web3 is connected', () => {
      const { result } = renderHook(() => useContracts());
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.getTokenBalance).toBe('function');
      expect(typeof result.current.getTokenAllowance).toBe('function');
      expect(typeof result.current.approveTokens).toBe('function');
    });

    it('handles disconnected Web3 state gracefully', () => {
      mockWeb3Context.isConnected = false;
      mockWeb3Context.provider = null;
      mockWeb3Context.signer = null;
      
      const { result } = renderHook(() => useContracts());
      
      expect(result.current).toBeDefined();
      // Functions should still exist but may throw when called
      expect(typeof result.current.getTokenBalance).toBe('function');
    });
  });

  describe('Token Operations', () => {
    describe('getTokenBalance', () => {
      it('fetches token balance successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const balance = await result.current.getTokenBalance('0x1234567890123456789012345678901234567890');
        
        expect(mockContract.balanceOf).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
        expect(balance).toBe('1000.0');
      });

      it('handles balance fetch errors', async () => {
        mockContract.balanceOf.mockRejectedValue(new Error('Contract error'));
        
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.getTokenBalance('0x1234567890123456789012345678901234567890'))
          .rejects.toThrow('Contract error');
      });

      it('validates wallet address parameter', async () => {
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.getTokenBalance(''))
          .rejects.toThrow();
        
        await expect(result.current.getTokenBalance('invalid-address'))
          .rejects.toThrow();
      });
    });

    describe('getTokenAllowance', () => {
      it('fetches token allowance successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const allowance = await result.current.getTokenAllowance(
          '0x1234567890123456789012345678901234567890',
          '0x0987654321098765432109876543210987654321'
        );
        
        expect(mockContract.allowance).toHaveBeenCalledWith(
          '0x1234567890123456789012345678901234567890',
          '0x0987654321098765432109876543210987654321'
        );
        expect(allowance).toBe('0.0');
      });

      it('handles allowance fetch errors', async () => {
        mockContract.allowance.mockRejectedValue(new Error('Contract error'));
        
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.getTokenAllowance(
          '0x1234567890123456789012345678901234567890',
          '0x0987654321098765432109876543210987654321'
        )).rejects.toThrow('Contract error');
      });
    });

    describe('approveTokens', () => {
      it('approves tokens successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const tx = await result.current.approveTokens(
          '0x0987654321098765432109876543210987654321',
          '1000'
        );
        
        expect(mockContract.approve).toHaveBeenCalledWith(
          '0x0987654321098765432109876543210987654321',
          '1000000000000000000000'
        );
        expect(tx).toEqual(mockTransactionResponse);
      });

      it('handles approval errors', async () => {
        mockContract.approve.mockRejectedValue(new Error('User rejected transaction'));
        
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.approveTokens(
          '0x0987654321098765432109876543210987654321',
          '1000'
        )).rejects.toThrow('User rejected transaction');
      });

      it('validates approval parameters', async () => {
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.approveTokens('', '1000'))
          .rejects.toThrow();
        
        await expect(result.current.approveTokens(
          '0x0987654321098765432109876543210987654321',
          '0'
        )).rejects.toThrow();
        
        await expect(result.current.approveTokens(
          '0x0987654321098765432109876543210987654321',
          '-100'
        )).rejects.toThrow();
      });
    });
  });

  describe('Campaign Operations', () => {
    describe('getCampaignData', () => {
      it('fetches campaign data successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const campaignData = await result.current.getCampaignData(1);
        
        expect(mockContract.getCampaign).toHaveBeenCalledWith(1);
        expect(campaignData).toEqual({
          name: 'Test Campaign',
          description: 'Campaign description',
          softCap: '1000.0',
          hardCap: '10000.0',
          ticketAmount: '100.0',
          currentAmount: '5000.0',
          isActive: true,
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        });
      });

      it('handles invalid campaign ID', async () => {
        mockContract.getCampaign.mockRejectedValue(new Error('Campaign does not exist'));
        
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.getCampaignData(999))
          .rejects.toThrow('Campaign does not exist');
      });

      it('validates campaign ID parameter', async () => {
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.getCampaignData(0))
          .rejects.toThrow();
        
        await expect(result.current.getCampaignData(-1))
          .rejects.toThrow();
      });
    });

    describe('getActiveCampaignCount', () => {
      it('fetches active campaign count successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const count = await result.current.getActiveCampaignCount();
        
        expect(mockContract.getActiveCampaignCount).toHaveBeenCalled();
        expect(count).toBe(5);
      });
    });

    describe('stakeToCampaign', () => {
      it('stakes tokens to campaign successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const tx = await result.current.stakeToCampaign(1, '500');
        
        expect(mockContract.stakeToCampaign).toHaveBeenCalledWith(
          1,
          '500000000000000000000'
        );
        expect(tx).toEqual(mockTransactionResponse);
      });

      it('handles staking errors', async () => {
        mockContract.stakeToCampaign.mockRejectedValue(new Error('Insufficient balance'));
        
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.stakeToCampaign(1, '500'))
          .rejects.toThrow('Insufficient balance');
      });

      it('validates staking parameters', async () => {
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.stakeToCampaign(0, '500'))
          .rejects.toThrow();
        
        await expect(result.current.stakeToCampaign(1, '0'))
          .rejects.toThrow();
        
        await expect(result.current.stakeToCampaign(1, '-100'))
          .rejects.toThrow();
      });
    });

    describe('getUserStake', () => {
      it('fetches user stake successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const stake = await result.current.getUserStake(
          1,
          '0x1234567890123456789012345678901234567890'
        );
        
        expect(mockContract.getUserStake).toHaveBeenCalledWith(
          1,
          '0x1234567890123456789012345678901234567890'
        );
        expect(stake).toEqual({
          amount: '500.0',
          ticketCount: 5,
        });
      });

      it('handles user with no stake', async () => {
        mockContract.getUserStake.mockResolvedValue(['0', 0]);
        
        const { result } = renderHook(() => useContracts());
        
        const stake = await result.current.getUserStake(
          1,
          '0x1234567890123456789012345678901234567890'
        );
        
        expect(stake).toEqual({
          amount: '0.0',
          ticketCount: 0,
        });
      });
    });
  });

  describe('Social Task Operations', () => {
    describe('hasUserCompletedSocialTasks', () => {
      it('checks social task completion successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const completed = await result.current.hasUserCompletedSocialTasks(
          1,
          '0x1234567890123456789012345678901234567890'
        );
        
        expect(mockContract.hasUserCompletedSocialTasks).toHaveBeenCalledWith(
          1,
          '0x1234567890123456789012345678901234567890'
        );
        expect(completed).toBe(false);
      });
    });

    describe('markSocialTaskComplete', () => {
      it('marks social task as complete successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const tx = await result.current.markSocialTaskComplete(
          1,
          '0x1234567890123456789012345678901234567890'
        );
        
        expect(mockContract.markSocialTaskComplete).toHaveBeenCalledWith(
          1,
          '0x1234567890123456789012345678901234567890'
        );
        expect(tx).toEqual(mockTransactionResponse);
      });

      it('handles already completed tasks', async () => {
        mockContract.markSocialTaskComplete.mockRejectedValue(
          new Error('Tasks already completed')
        );
        
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.markSocialTaskComplete(
          1,
          '0x1234567890123456789012345678901234567890'
        )).rejects.toThrow('Tasks already completed');
      });
    });
  });

  describe('Admin Operations', () => {
    describe('createCampaign', () => {
      it('creates campaign successfully', async () => {
        const campaignData = {
          name: 'New Campaign',
          description: 'Campaign description',
          softCap: '1000',
          hardCap: '10000',
          ticketAmount: '100',
          duration: 7,
        };
        
        const { result } = renderHook(() => useContracts());
        
        const tx = await result.current.createCampaign(campaignData);
        
        expect(mockContract.createCampaign).toHaveBeenCalledWith(
          'New Campaign',
          'Campaign description',
          '1000000000000000000000',
          '10000000000000000000000',
          '100000000000000000000',
          7 * 24 * 60 * 60
        );
        expect(tx).toEqual(mockTransactionResponse);
      });

      it('validates campaign creation parameters', async () => {
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.createCampaign({
          name: '',
          description: 'Description',
          softCap: '1000',
          hardCap: '10000',
          ticketAmount: '100',
          duration: 7,
        })).rejects.toThrow();
        
        await expect(result.current.createCampaign({
          name: 'Campaign',
          description: 'Description',
          softCap: '10000',
          hardCap: '1000', // Hard cap less than soft cap
          ticketAmount: '100',
          duration: 7,
        })).rejects.toThrow();
      });
    });

    describe('pauseCampaign', () => {
      it('pauses campaign successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const tx = await result.current.pauseCampaign(1);
        
        expect(mockContract.pauseCampaign).toHaveBeenCalledWith(1);
        expect(tx).toEqual(mockTransactionResponse);
      });

      it('handles non-existent campaign', async () => {
        mockContract.pauseCampaign.mockRejectedValue(
          new Error('Campaign does not exist')
        );
        
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.pauseCampaign(999))
          .rejects.toThrow('Campaign does not exist');
      });
    });

    describe('resumeCampaign', () => {
      it('resumes campaign successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const tx = await result.current.resumeCampaign(1);
        
        expect(mockContract.resumeCampaign).toHaveBeenCalledWith(1);
        expect(tx).toEqual(mockTransactionResponse);
      });
    });

    describe('selectWinners', () => {
      it('selects winners successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const tx = await result.current.selectWinners(1);
        
        expect(mockContract.selectWinners).toHaveBeenCalledWith(1);
        expect(tx).toEqual(mockTransactionResponse);
      });

      it('handles campaigns not ready for winner selection', async () => {
        mockContract.selectWinners.mockRejectedValue(
          new Error('Campaign not ended or insufficient participants')
        );
        
        const { result } = renderHook(() => useContracts());
        
        await expect(result.current.selectWinners(1))
          .rejects.toThrow('Campaign not ended or insufficient participants');
      });
    });

    describe('burnStakedTokens', () => {
      it('burns staked tokens successfully', async () => {
        const { result } = renderHook(() => useContracts());
        
        const tx = await result.current.burnStakedTokens(1);
        
        expect(mockContract.burnStakedTokens).toHaveBeenCalledWith(1);
        expect(tx).toEqual(mockTransactionResponse);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles contract not deployed error', async () => {
      mockContract.balanceOf.mockRejectedValue(
        new Error('Contract not deployed')
      );
      
      const { result } = renderHook(() => useContracts());
      
      await expect(result.current.getTokenBalance('0x1234567890123456789012345678901234567890'))
        .rejects.toThrow('Contract not deployed');
    });

    it('handles user rejection errors', async () => {
      mockContract.approve.mockRejectedValue(
        new Error('User denied transaction signature')
      );
      
      const { result } = renderHook(() => useContracts());
      
      await expect(result.current.approveTokens(
        '0x0987654321098765432109876543210987654321',
        '1000'
      )).rejects.toThrow('User denied transaction signature');
    });

    it('handles insufficient gas errors', async () => {
      mockContract.stakeToCampaign.mockRejectedValue(
        new Error('Insufficient gas')
      );
      
      const { result } = renderHook(() => useContracts());
      
      await expect(result.current.stakeToCampaign(1, '500'))
        .rejects.toThrow('Insufficient gas');
    });

    it('handles network errors', async () => {
      mockContract.getCampaign.mockRejectedValue(
        new Error('Network error')
      );
      
      const { result } = renderHook(() => useContracts());
      
      await expect(result.current.getCampaignData(1))
        .rejects.toThrow('Network error');
    });

    it('handles contract execution reverts', async () => {
      mockContract.stakeToCampaign.mockRejectedValue(
        new Error('execution reverted: Campaign not active')
      );
      
      const { result } = renderHook(() => useContracts());
      
      await expect(result.current.stakeToCampaign(1, '500'))
        .rejects.toThrow('execution reverted: Campaign not active');
    });
  });

  describe('Transaction Management', () => {
    it('handles pending transactions correctly', async () => {
      let resolveTx: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveTx = resolve;
      });
      
      mockContract.stakeToCampaign.mockReturnValue(pendingPromise);
      
      const { result } = renderHook(() => useContracts());
      
      const txPromise = result.current.stakeToCampaign(1, '500');
      
      // Should be pending
      expect(txPromise).toBeInstanceOf(Promise);
      
      resolveTx!(mockTransactionResponse);
      
      const tx = await txPromise;
      expect(tx).toEqual(mockTransactionResponse);
    });

    it('provides transaction receipt after confirmation', async () => {
      const mockReceipt = {
        status: 1,
        blockNumber: 12345678,
        gasUsed: '21000',
        effectiveGasPrice: '20000000000',
      };
      
      mockTransactionResponse.wait.mockResolvedValue(mockReceipt);
      
      const { result } = renderHook(() => useContracts());
      
      const tx = await result.current.stakeToCampaign(1, '500');
      const receipt = await tx.wait();
      
      expect(receipt).toEqual(mockReceipt);
    });

    it('handles transaction confirmation timeouts', async () => {
      mockTransactionResponse.wait.mockRejectedValue(
        new Error('Transaction confirmation timeout')
      );
      
      const { result } = renderHook(() => useContracts());
      
      const tx = await result.current.stakeToCampaign(1, '500');
      
      await expect(tx.wait()).rejects.toThrow('Transaction confirmation timeout');
    });
  });

  describe('Input Validation', () => {
    it('validates addresses correctly', async () => {
      const { result } = renderHook(() => useContracts());
      
      const validAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
        '0x0000000000000000000000000000000000000000',
      ];
      
      const invalidAddresses = [
        '',
        '0x123',
        '1234567890123456789012345678901234567890',
        '0xGHIJKL1234567890123456789012345678901234',
        null,
        undefined,
      ];
      
      // Valid addresses should not throw during validation
      for (const address of validAddresses) {
        await expect(result.current.getTokenBalance(address)).resolves.toBeDefined();
      }
      
      // Invalid addresses should throw
      for (const address of invalidAddresses) {
        await expect(result.current.getTokenBalance(address as any)).rejects.toThrow();
      }
    });

    it('validates amounts correctly', async () => {
      const { result } = renderHook(() => useContracts());
      
      const validAmounts = ['1', '100', '1000.5', '0.1'];
      const invalidAmounts = ['0', '-100', '', 'abc', null, undefined];
      
      // Valid amounts should not throw during validation
      for (const amount of validAmounts) {
        await expect(result.current.approveTokens(
          '0x1234567890123456789012345678901234567890',
          amount
        )).resolves.toBeDefined();
      }
      
      // Invalid amounts should throw
      for (const amount of invalidAmounts) {
        await expect(result.current.approveTokens(
          '0x1234567890123456789012345678901234567890',
          amount as any
        )).rejects.toThrow();
      }
    });
  });

  describe('Unit Conversion', () => {
    it('converts token amounts correctly', async () => {
      const { result } = renderHook(() => useContracts());
      
      // Test balance conversion (wei to ether)
      mockContract.balanceOf.mockResolvedValue('1500000000000000000000'); // 1500 tokens
      const balance = await result.current.getTokenBalance('0x1234567890123456789012345678901234567890');
      expect(balance).toBe('1500.0');
      
      // Test amount conversion (ether to wei) in approval
      await result.current.approveTokens('0x1234567890123456789012345678901234567890', '250.5');
      expect(mockContract.approve).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        '250500000000000000000'
      );
    });

    it('handles decimal precision correctly', async () => {
      const { result } = renderHook(() => useContracts());
      
      // Test very small amounts
      await result.current.approveTokens('0x1234567890123456789012345678901234567890', '0.001');
      expect(mockContract.approve).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        '1000000000000000'
      );
      
      // Test very large amounts
      await result.current.approveTokens('0x1234567890123456789012345678901234567890', '1000000');
      expect(mockContract.approve).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        '1000000000000000000000000'
      );
    });
  });
});