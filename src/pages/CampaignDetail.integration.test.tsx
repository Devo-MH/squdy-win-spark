import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import CampaignDetail from './CampaignDetail';
import { mockCampaign, mockUserParticipation } from '@/test/mocks/data';

// Mock the hooks
const mockUseCampaign = vi.fn();
const mockUseMyCampaignStatus = vi.fn();
const mockUseParticipateCampaign = vi.fn();
const mockUseCompleteSocialTask = vi.fn();

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaign: () => mockUseCampaign(),
  useMyCampaignStatus: () => mockUseMyCampaignStatus(),
  useParticipateCampaign: () => mockUseParticipateCampaign(),
  useCompleteSocialTask: () => mockUseCompleteSocialTask(),
}));

// Mock contracts service
const mockContractService = {
  getTokenBalance: vi.fn(),
  getTokenAllowance: vi.fn(),
  approveTokens: vi.fn(),
  stakeToCampaign: vi.fn(),
};

vi.mock('@/services/contracts', () => ({
  useContracts: () => mockContractService,
}));

// Mock Web3 context
const mockWeb3Context = {
  account: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  chainId: 11155111,
  balance: '1500.0',
  signer: {},
  provider: {},
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchNetwork: vi.fn(),
};

vi.mock('@/contexts/Web3Context', () => ({
  useWeb3: () => mockWeb3Context,
}));

// Mock react-router-dom
const mockParams = { id: '1' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => vi.fn(),
  };
});

describe('CampaignDetail Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset to default values
    mockContractService.getTokenBalance.mockResolvedValue('1500.0');
    mockContractService.getTokenAllowance.mockResolvedValue('0.0');
    mockContractService.approveTokens.mockResolvedValue({ hash: '0xtxhash' });
    mockContractService.stakeToCampaign.mockResolvedValue({ hash: '0xtxhash' });
    
    mockUseParticipateCampaign.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
    
    mockUseCompleteSocialTask.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
  });

  describe('Campaign Data Loading', () => {
    it('displays loading state while fetching campaign data', () => {
      mockUseCampaign.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
      });

      renderWithProviders(<CampaignDetail />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays campaign details when data is loaded', async () => {
      mockUseCampaign.mockReturnValue({
        data: { campaign: mockCampaign(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: mockUserParticipation(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
        expect(screen.getByText(/This is a test campaign 1/)).toBeInTheDocument();
      });
    });

    it('displays error state when campaign fetch fails', async () => {
      mockUseCampaign.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Campaign not found'),
        isError: true,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        isError: false,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
        expect(screen.getByText(/campaign not found/i)).toBeInTheDocument();
      });
    });

    it('handles missing campaign ID gracefully', async () => {
      mockParams.id = undefined as any;

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/invalid campaign/i)).toBeInTheDocument();
      });
    });
  });

  describe('Wallet Connection Integration', () => {
    beforeEach(() => {
      mockUseCampaign.mockReturnValue({
        data: { campaign: mockCampaign(1) },
        isLoading: false,
        error: null,
        isError: false,
      });
    });

    it('shows connect wallet prompt when not connected', async () => {
      mockWeb3Context.isConnected = false;
      mockWeb3Context.account = null;

      mockUseMyCampaignStatus.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        isError: false,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/connect.*wallet/i)).toBeInTheDocument();
      });
    });

    it('displays staking interface when wallet is connected', async () => {
      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: null },
        isLoading: false,
        error: null,
        isError: false,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/stake.*squdy/i)).toBeInTheDocument();
        expect(screen.getByRole('spinbutton', { name: /amount/i })).toBeInTheDocument();
      });
    });

    it('shows network warning when on wrong chain', async () => {
      mockWeb3Context.chainId = 1; // Wrong network

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: null },
        isLoading: false,
        error: null,
        isError: false,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/wrong network/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /switch.*network/i })).toBeInTheDocument();
      });
    });
  });

  describe('Token Balance and Allowance', () => {
    beforeEach(() => {
      mockUseCampaign.mockReturnValue({
        data: { campaign: mockCampaign(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: null },
        isLoading: false,
        error: null,
        isError: false,
      });
    });

    it('displays user token balance', async () => {
      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/balance.*1,500.*squdy/i)).toBeInTheDocument();
      });
    });

    it('shows approval button when allowance is insufficient', async () => {
      mockContractService.getTokenAllowance.mockResolvedValue('0.0');

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve.*squdy/i })).toBeInTheDocument();
      });
    });

    it('shows stake button when allowance is sufficient', async () => {
      mockContractService.getTokenAllowance.mockResolvedValue('10000.0');

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stake.*tokens/i })).toBeInTheDocument();
      });
    });

    it('handles insufficient balance gracefully', async () => {
      mockContractService.getTokenBalance.mockResolvedValue('50.0');

      const { user } = renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        const amountInput = screen.getByRole('spinbutton', { name: /amount/i });
        expect(amountInput).toBeInTheDocument();
      });

      const amountInput = screen.getByRole('spinbutton', { name: /amount/i });
      await user.clear(amountInput);
      await user.type(amountInput, '100');

      await waitFor(() => {
        expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
      });
    });
  });

  describe('Staking Process', () => {
    beforeEach(() => {
      mockUseCampaign.mockReturnValue({
        data: { campaign: mockCampaign(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: null },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockContractService.getTokenAllowance.mockResolvedValue('10000.0');
    });

    it('performs complete staking workflow', async () => {
      const { user } = renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByRole('spinbutton', { name: /amount/i })).toBeInTheDocument();
      });

      // Enter staking amount
      const amountInput = screen.getByRole('spinbutton', { name: /amount/i });
      await user.clear(amountInput);
      await user.type(amountInput, '500');

      // Click stake button
      const stakeButton = screen.getByRole('button', { name: /stake.*tokens/i });
      await user.click(stakeButton);

      expect(mockContractService.stakeToCampaign).toHaveBeenCalledWith('500');
    });

    it('shows approval step when needed', async () => {
      mockContractService.getTokenAllowance.mockResolvedValue('0.0');

      const { user } = renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve.*squdy/i })).toBeInTheDocument();
      });

      const approveButton = screen.getByRole('button', { name: /approve.*squdy/i });
      await user.click(approveButton);

      expect(mockContractService.approveTokens).toHaveBeenCalled();
    });

    it('validates minimum staking amount', async () => {
      const { user } = renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        const amountInput = screen.getByRole('spinbutton', { name: /amount/i });
        expect(amountInput).toBeInTheDocument();
      });

      const amountInput = screen.getByRole('spinbutton', { name: /amount/i });
      await user.clear(amountInput);
      await user.type(amountInput, '50'); // Less than minimum ticket amount (100)

      await waitFor(() => {
        expect(screen.getByText(/minimum.*100.*squdy/i)).toBeInTheDocument();
      });
    });

    it('calculates ticket count correctly', async () => {
      const { user } = renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        const amountInput = screen.getByRole('spinbutton', { name: /amount/i });
        expect(amountInput).toBeInTheDocument();
      });

      const amountInput = screen.getByRole('spinbutton', { name: /amount/i });
      await user.clear(amountInput);
      await user.type(amountInput, '500');

      await waitFor(() => {
        expect(screen.getByText(/5.*tickets/i)).toBeInTheDocument();
      });
    });
  });

  describe('Social Media Tasks', () => {
    beforeEach(() => {
      mockUseCampaign.mockReturnValue({
        data: { campaign: mockCampaign(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: mockUserParticipation(1) },
        isLoading: false,
        error: null,
        isError: false,
      });
    });

    it('displays all social media tasks', async () => {
      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/follow.*twitter/i)).toBeInTheDocument();
        expect(screen.getByText(/like.*tweet/i)).toBeInTheDocument();
        expect(screen.getByText(/retweet/i)).toBeInTheDocument();
        expect(screen.getByText(/join.*discord/i)).toBeInTheDocument();
        expect(screen.getByText(/join.*telegram/i)).toBeInTheDocument();
        expect(screen.getByText(/subscribe.*newsletter/i)).toBeInTheDocument();
        expect(screen.getByText(/follow.*medium/i)).toBeInTheDocument();
      });
    });

    it('shows completion status for each task', async () => {
      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        // Check for completed tasks (based on mockUserParticipation)
        const completedTasks = screen.getAllByText(/completed/i);
        expect(completedTasks.length).toBeGreaterThan(0);

        // Check for pending tasks
        const pendingTasks = screen.getAllByText(/complete/i);
        expect(pendingTasks.length).toBeGreaterThan(0);
      });
    });

    it('handles social task completion', async () => {
      const mockMutate = vi.fn();
      mockUseCompleteSocialTask.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      const { user } = renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        const completeButton = screen.getAllByRole('button', { name: /complete/i })[0];
        expect(completeButton).toBeInTheDocument();
      });

      const completeButton = screen.getAllByRole('button', { name: /complete/i })[0];
      await user.click(completeButton);

      expect(mockMutate).toHaveBeenCalled();
    });

    it('opens external links for social tasks', async () => {
      const { user } = renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        const externalLinks = screen.getAllByRole('link', { name: /open/i });
        expect(externalLinks.length).toBeGreaterThan(0);
      });

      const firstLink = screen.getAllByRole('link', { name: /open/i })[0];
      expect(firstLink).toHaveAttribute('target', '_blank');
      expect(firstLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Campaign Status Display', () => {
    it('shows appropriate interface for active campaigns', async () => {
      const activeCampaign = { ...mockCampaign(1), status: 'active' as const };
      
      mockUseCampaign.mockReturnValue({
        data: { campaign: activeCampaign },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: null },
        isLoading: false,
        error: null,
        isError: false,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/stake.*squdy/i)).toBeInTheDocument();
        expect(screen.getByRole('spinbutton', { name: /amount/i })).toBeInTheDocument();
      });
    });

    it('shows read-only interface for finished campaigns', async () => {
      const finishedCampaign = { ...mockCampaign(1), status: 'finished' as const };
      
      mockUseCampaign.mockReturnValue({
        data: { campaign: finishedCampaign },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: mockUserParticipation(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/campaign.*ended/i)).toBeInTheDocument();
        expect(screen.queryByRole('spinbutton', { name: /amount/i })).not.toBeInTheDocument();
      });
    });

    it('shows paused campaign message', async () => {
      const pausedCampaign = { ...mockCampaign(1), status: 'paused' as const };
      
      mockUseCampaign.mockReturnValue({
        data: { campaign: pausedCampaign },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: null },
        isLoading: false,
        error: null,
        isError: false,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/campaign.*paused/i)).toBeInTheDocument();
      });
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(() => {
      mockUseCampaign.mockReturnValue({
        data: { campaign: mockCampaign(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: null },
        isLoading: false,
        error: null,
        isError: false,
      });
    });

    it('displays campaign funding progress', async () => {
      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/5,000.*\/.*10,000.*squdy/i)).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('shows participant count', async () => {
      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/25.*participants/i)).toBeInTheDocument();
      });
    });

    it('displays time remaining for active campaigns', async () => {
      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/days.*left/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles contract interaction errors gracefully', async () => {
      mockContractService.stakeToCampaign.mockRejectedValue(new Error('Transaction failed'));

      mockUseCampaign.mockReturnValue({
        data: { campaign: mockCampaign(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: null },
        isLoading: false,
        error: null,
        isError: false,
      });

      const { user } = renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        const amountInput = screen.getByRole('spinbutton', { name: /amount/i });
        expect(amountInput).toBeInTheDocument();
      });

      const amountInput = screen.getByRole('spinbutton', { name: /amount/i });
      await user.clear(amountInput);
      await user.type(amountInput, '500');

      const stakeButton = screen.getByRole('button', { name: /stake.*tokens/i });
      await user.click(stakeButton);

      await waitFor(() => {
        expect(screen.getByText(/transaction.*failed/i)).toBeInTheDocument();
      });
    });

    it('handles API errors for social task completion', async () => {
      mockUseCompleteSocialTask.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: new Error('Social task verification failed'),
      });

      mockUseCampaign.mockReturnValue({
        data: { campaign: mockCampaign(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: mockUserParticipation(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText(/verification.*failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockUseCampaign.mockReturnValue({
        data: { campaign: mockCampaign(1) },
        isLoading: false,
        error: null,
        isError: false,
      });

      mockUseMyCampaignStatus.mockReturnValue({
        data: { participation: null },
        isLoading: false,
        error: null,
        isError: false,
      });
    });

    it('adapts layout for mobile screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });

      // Should maintain functionality on mobile
      expect(screen.getByRole('spinbutton', { name: /amount/i })).toBeInTheDocument();
    });

    it('maintains proper layout on tablet screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(<CampaignDetail />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });
    });
  });
});