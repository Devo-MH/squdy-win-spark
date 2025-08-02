import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import AdminPanel from './AdminPanel';
import { mockCampaigns } from '@/test/mocks/data';

// Mock the hooks
const mockUseCampaigns = vi.fn();
const mockUseCreateCampaign = vi.fn();
const mockUseUpdateCampaign = vi.fn();
const mockUsePauseCampaign = vi.fn();
const mockUseResumeCampaign = vi.fn();
const mockUseSelectWinners = vi.fn();

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => mockUseCampaigns(),
}));

vi.mock('@/hooks/useAdminCampaigns', () => ({
  useCreateCampaign: () => mockUseCreateCampaign(),
  useUpdateCampaign: () => mockUseUpdateCampaign(),
  usePauseCampaign: () => mockUsePauseCampaign(),
  useResumeCampaign: () => mockUseResumeCampaign(),
  useSelectWinners: () => mockUseSelectWinners(),
}));

// Mock Web3 context
const mockWeb3Context = {
  account: '0x1234567890123456789012345678901234567890', // Admin wallet
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

// Mock contracts service
const mockContractService = {
  getCampaignCount: vi.fn(),
  createCampaign: vi.fn(),
  pauseCampaign: vi.fn(),
  resumeCampaign: vi.fn(),
  selectWinners: vi.fn(),
};

vi.mock('@/services/contracts', () => ({
  useContracts: () => mockContractService,
}));

describe('AdminPanel Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseCreateCampaign.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
    
    mockUseUpdateCampaign.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
    
    mockUsePauseCampaign.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
    
    mockUseResumeCampaign.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
    
    mockUseSelectWinners.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });

    mockContractService.getCampaignCount.mockResolvedValue(5);
    mockContractService.createCampaign.mockResolvedValue({ hash: '0xtxhash' });
    mockContractService.pauseCampaign.mockResolvedValue({ hash: '0xtxhash' });
    mockContractService.resumeCampaign.mockResolvedValue({ hash: '0xtxhash' });
    mockContractService.selectWinners.mockResolvedValue({ hash: '0xtxhash' });
  });

  describe('Admin Authentication', () => {
    it('displays admin panel when connected with admin wallet', async () => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns,
          pagination: { page: 1, limit: 10, total: mockCampaigns.length, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
      });

      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
        expect(screen.getByText(/campaign management/i)).toBeInTheDocument();
      });
    });

    it('shows access denied when connected with non-admin wallet', async () => {
      mockWeb3Context.account = '0x9999999999999999999999999999999999999999'; // Non-admin wallet

      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
      });
    });

    it('prompts to connect wallet when not connected', async () => {
      mockWeb3Context.isConnected = false;
      mockWeb3Context.account = null;

      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText(/connect.*wallet/i)).toBeInTheDocument();
      });
    });

    it('shows network warning when on wrong chain', async () => {
      mockWeb3Context.chainId = 1; // Wrong network

      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText(/wrong network/i)).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Management Dashboard', () => {
    beforeEach(() => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns,
          pagination: { page: 1, limit: 10, total: mockCampaigns.length, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
      });
    });

    it('displays overview statistics', async () => {
      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText(/total campaigns/i)).toBeInTheDocument();
        expect(screen.getByText(/active campaigns/i)).toBeInTheDocument();
        expect(screen.getByText(/total participants/i)).toBeInTheDocument();
      });
    });

    it('shows campaign list with management actions', async () => {
      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
        expect(screen.getByText('Test Campaign 2')).toBeInTheDocument();
      });

      // Check for action buttons
      expect(screen.getAllByRole('button', { name: /edit/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /pause/i }).length).toBeGreaterThan(0);
    });

    it('filters campaigns by status', async () => {
      const { user } = renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /status filter/i })).toBeInTheDocument();
      });

      const statusFilter = screen.getByRole('combobox', { name: /status filter/i });
      await user.click(statusFilter);
      
      const activeOption = screen.getByText('Active');
      await user.click(activeOption);

      // Should filter to show only active campaigns
      await waitFor(() => {
        const activeCampaigns = mockCampaigns.filter(c => c.status === 'active');
        activeCampaigns.forEach(campaign => {
          expect(screen.getByText(campaign.name)).toBeInTheDocument();
        });
      });
    });

    it('supports search functionality', async () => {
      const { user } = renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox', { name: /search campaigns/i })).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox', { name: /search campaigns/i });
      await user.type(searchInput, 'Campaign 1');

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Campaign 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Campaign Creation', () => {
    beforeEach(() => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
        isLoading: false,
        error: null,
        isError: false,
      });
    });

    it('opens campaign creation modal', async () => {
      const { user } = renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create.*campaign/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create.*campaign/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/new campaign/i)).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /campaign name/i })).toBeInTheDocument();
      });
    });

    it('validates campaign form inputs', async () => {
      const { user } = renderWithProviders(<AdminPanel />);

      const createButton = screen.getByRole('button', { name: /create.*campaign/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create campaign/i })).toBeInTheDocument();
      });

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /create campaign/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/campaign name.*required/i)).toBeInTheDocument();
        expect(screen.getByText(/description.*required/i)).toBeInTheDocument();
      });
    });

    it('submits campaign creation form successfully', async () => {
      const mockMutate = vi.fn();
      mockUseCreateCampaign.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      const { user } = renderWithProviders(<AdminPanel />);

      const createButton = screen.getByRole('button', { name: /create.*campaign/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /campaign name/i })).toBeInTheDocument();
      });

      // Fill form
      await user.type(screen.getByRole('textbox', { name: /campaign name/i }), 'New Test Campaign');
      await user.type(screen.getByRole('textbox', { name: /description/i }), 'Campaign description');
      await user.type(screen.getByRole('spinbutton', { name: /soft cap/i }), '1000');
      await user.type(screen.getByRole('spinbutton', { name: /hard cap/i }), '10000');
      await user.type(screen.getByRole('spinbutton', { name: /ticket amount/i }), '100');

      const submitButton = screen.getByRole('button', { name: /create campaign/i });
      await user.click(submitButton);

      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Test Campaign',
        description: 'Campaign description',
        softCap: 1000,
        hardCap: 10000,
        ticketAmount: 100,
      }));
    });

    it('handles campaign creation errors', async () => {
      mockUseCreateCampaign.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: new Error('Campaign creation failed'),
      });

      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText(/creation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Actions', () => {
    beforeEach(() => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns,
          pagination: { page: 1, limit: 10, total: mockCampaigns.length, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
      });
    });

    it('pauses active campaigns', async () => {
      const mockMutate = vi.fn();
      mockUsePauseCampaign.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      const { user } = renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        const pauseButtons = screen.getAllByRole('button', { name: /pause/i });
        expect(pauseButtons.length).toBeGreaterThan(0);
      });

      const pauseButton = screen.getAllByRole('button', { name: /pause/i })[0];
      await user.click(pauseButton);

      // Confirm action
      await waitFor(() => {
        expect(screen.getByText(/confirm pause/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockMutate).toHaveBeenCalled();
    });

    it('resumes paused campaigns', async () => {
      const mockMutate = vi.fn();
      mockUseResumeCampaign.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      const { user } = renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        const resumeButtons = screen.getAllByRole('button', { name: /resume/i });
        expect(resumeButtons.length).toBeGreaterThan(0);
      });

      const resumeButton = screen.getAllByRole('button', { name: /resume/i })[0];
      await user.click(resumeButton);

      expect(mockMutate).toHaveBeenCalled();
    });

    it('selects winners for completed campaigns', async () => {
      const mockMutate = vi.fn();
      mockUseSelectWinners.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      const { user } = renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        const selectWinnersButtons = screen.getAllByRole('button', { name: /select winners/i });
        expect(selectWinnersButtons.length).toBeGreaterThan(0);
      });

      const selectWinnersButton = screen.getAllByRole('button', { name: /select winners/i })[0];
      await user.click(selectWinnersButton);

      // Confirm action
      await waitFor(() => {
        expect(screen.getByText(/confirm winner selection/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockMutate).toHaveBeenCalled();
    });

    it('prevents unauthorized actions', async () => {
      mockWeb3Context.account = '0x9999999999999999999999999999999999999999'; // Non-admin

      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /select winners/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Campaign Editing', () => {
    beforeEach(() => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns,
          pagination: { page: 1, limit: 10, total: mockCampaigns.length, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
      });
    });

    it('opens campaign edit modal', async () => {
      const { user } = renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        expect(editButtons.length).toBeGreaterThan(0);
      });

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText(/edit campaign/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Campaign 1')).toBeInTheDocument();
      });
    });

    it('pre-fills form with existing campaign data', async () => {
      const { user } = renderWithProviders(<AdminPanel />);

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Campaign 1')).toBeInTheDocument();
        expect(screen.getByDisplayValue(/This is a test campaign 1/)).toBeInTheDocument();
      });
    });

    it('submits campaign updates successfully', async () => {
      const mockMutate = vi.fn();
      mockUseUpdateCampaign.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      const { user } = renderWithProviders(<AdminPanel />);

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Campaign 1')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test Campaign 1');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Campaign Name');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Campaign Name',
      }));
    });
  });

  describe('Real-time Updates', () => {
    it('refreshes data when campaigns are updated', async () => {
      const mockRefetch = vi.fn();
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns,
          pagination: { page: 1, limit: 10, total: mockCampaigns.length, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });

      // Simulate successful campaign update
      const mockMutate = vi.fn().mockImplementation((data, { onSuccess }) => {
        onSuccess?.();
      });
      
      mockUseUpdateCampaign.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('handles contract state synchronization', async () => {
      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(mockContractService.getCampaignCount).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error when campaigns fail to load', async () => {
      mockUseCampaigns.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load campaigns'),
        isError: true,
      });

      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it('handles contract interaction errors', async () => {
      mockContractService.pauseCampaign.mockRejectedValue(new Error('Transaction failed'));

      const mockMutate = vi.fn().mockImplementation((data, { onError }) => {
        onError?.(new Error('Transaction failed'));
      });

      mockUsePauseCampaign.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns,
          pagination: { page: 1, limit: 10, total: mockCampaigns.length, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
      });

      const { user } = renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        const pauseButton = screen.getAllByRole('button', { name: /pause/i })[0];
        expect(pauseButton).toBeInTheDocument();
      });

      const pauseButton = screen.getAllByRole('button', { name: /pause/i })[0];
      await user.click(pauseButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns,
          pagination: { page: 1, limit: 10, total: mockCampaigns.length, totalPages: 1 },
        },
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

      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
      });

      // Should maintain functionality on mobile
      expect(screen.getByRole('button', { name: /create.*campaign/i })).toBeInTheDocument();
    });

    it('maintains table functionality on tablet screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });

      // Should show campaign management actions
      expect(screen.getAllByRole('button', { name: /edit/i }).length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('handles large numbers of campaigns efficiently', async () => {
      const manyCampaigns = Array.from({ length: 100 }, (_, i) => ({
        ...mockCampaigns[0],
        id: `${i + 1}`,
        name: `Campaign ${i + 1}`,
      }));

      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: manyCampaigns,
          pagination: { page: 1, limit: 50, total: 100, totalPages: 2 },
        },
        isLoading: false,
        error: null,
        isError: false,
      });

      const startTime = performance.now();
      renderWithProviders(<AdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Campaign 1')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      
      // Should render reasonably quickly even with many campaigns
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});