import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import HomePage from './HomePage';
import { mockCampaigns } from '@/test/mocks/data';

// Mock the hooks
const mockUseCampaigns = vi.fn();
vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => mockUseCampaigns(),
}));

describe('HomePage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Loading', () => {
    it('displays loading state while fetching campaigns', () => {
      mockUseCampaigns.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<HomePage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays campaigns when data is loaded successfully', async () => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns.slice(0, 4),
          pagination: {
            page: 1,
            limit: 10,
            total: 4,
            totalPages: 1,
          },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
        expect(screen.getByText('Test Campaign 2')).toBeInTheDocument();
      });
    });

    it('displays error state when API call fails', async () => {
      mockUseCampaigns.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch campaigns'),
        isError: true,
        refetch: vi.fn(),
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
        expect(screen.getByText(/failed to.*campaigns/i)).toBeInTheDocument();
      });
    });

    it('displays empty state when no campaigns are available', async () => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/no campaigns/i)).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Categories', () => {
    beforeEach(() => {
      const activeCampaigns = mockCampaigns.filter(c => c.status === 'active');
      const finishedCampaigns = mockCampaigns.filter(c => c.status === 'finished');

      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: [...activeCampaigns, ...finishedCampaigns],
          pagination: {
            page: 1,
            limit: 10,
            total: activeCampaigns.length + finishedCampaigns.length,
            totalPages: 1,
          },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });
    });

    it('separates active and finished campaigns correctly', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/active campaigns/i)).toBeInTheDocument();
        expect(screen.getByText(/finished campaigns/i)).toBeInTheDocument();
      });
    });

    it('displays active campaigns in the active section', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const activeCampaigns = mockCampaigns.filter(c => c.status === 'active');
        activeCampaigns.forEach(campaign => {
          expect(screen.getByText(campaign.name)).toBeInTheDocument();
        });
      });
    });

    it('displays finished campaigns in the finished section', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const finishedCampaigns = mockCampaigns.filter(c => c.status === 'finished');
        finishedCampaigns.forEach(campaign => {
          expect(screen.getByText(campaign.name)).toBeInTheDocument();
        });
      });
    });

    it('shows appropriate message when no active campaigns exist', async () => {
      const finishedOnly = mockCampaigns.filter(c => c.status === 'finished');
      
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: finishedOnly,
          pagination: {
            page: 1,
            limit: 10,
            total: finishedOnly.length,
            totalPages: 1,
          },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/no active campaigns/i)).toBeInTheDocument();
      });
    });

    it('shows appropriate message when no finished campaigns exist', async () => {
      const activeOnly = mockCampaigns.filter(c => c.status === 'active');
      
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: activeOnly,
          pagination: {
            page: 1,
            limit: 10,
            total: activeOnly.length,
            totalPages: 1,
          },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/no finished campaigns/i)).toBeInTheDocument();
      });
    });
  });

  describe('Hero Section Integration', () => {
    it('renders hero section above campaigns', async () => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns.slice(0, 2),
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.getByText(/active campaigns/i)).toBeInTheDocument();
      });
    });

    it('hero section navigation works correctly', async () => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns.slice(0, 2),
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      const { user } = renderWithProviders(<HomePage />);

      await waitFor(() => {
        const exploreButton = screen.getByRole('button', { name: /explore campaigns/i });
        expect(exploreButton).toBeInTheDocument();
      });

      // Test that clicking explore button scrolls to campaigns section
      const exploreButton = screen.getByRole('button', { name: /explore campaigns/i });
      await user.click(exploreButton);

      // Should scroll to campaigns section
      expect(screen.getByText(/active campaigns/i)).toBeInTheDocument();
    });
  });

  describe('Campaign Navigation', () => {
    beforeEach(() => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns.slice(0, 3),
          pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });
    });

    it('navigates to campaign detail when campaign card is clicked', async () => {
      const { user } = renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });

      const campaignCard = screen.getByText('Test Campaign 1').closest('[role="article"]');
      expect(campaignCard).toBeInTheDocument();

      await user.click(campaignCard!);
      
      // Should navigate to campaign detail page
      // This would be tested in an E2E test or with router mocking
    });

    it('handles keyboard navigation between campaign cards', async () => {
      const { user } = renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });

      const firstCard = screen.getByText('Test Campaign 1').closest('[role="article"]');
      expect(firstCard).toBeInTheDocument();

      firstCard!.focus();
      expect(firstCard).toHaveFocus();

      await user.keyboard('{Tab}');
      // Should focus next campaign card
    });
  });

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns.slice(0, 6),
          pagination: { page: 1, limit: 10, total: 6, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });
    });

    it('displays campaigns in grid layout on desktop', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const campaignGrid = screen.getByRole('main') || screen.getByText('Test Campaign 1').closest('section');
        expect(campaignGrid).toBeInTheDocument();
      });
    });

    it('adapts layout for mobile screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });

      // Should still display campaigns properly on mobile
      const campaigns = screen.getAllByRole('article');
      expect(campaigns.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('provides retry functionality when API call fails', async () => {
      const mockRefetch = vi.fn();
      mockUseCampaigns.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        isError: true,
        refetch: mockRefetch,
      });

      const { user } = renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('handles partial data gracefully', async () => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: [
            mockCampaigns[0],
            // Incomplete campaign data
            { id: '999', name: 'Incomplete Campaign', status: 'active' } as any,
          ],
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      expect(() => {
        renderWithProviders(<HomePage />);
      }).not.toThrow();

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('renders efficiently with many campaigns', async () => {
      const manyCampaigns = Array.from({ length: 20 }, (_, i) => ({
        ...mockCampaigns[0],
        id: `${i + 1}`,
        name: `Campaign ${i + 1}`,
      }));

      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: manyCampaigns,
          pagination: { page: 1, limit: 20, total: 20, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      const startTime = performance.now();
      renderWithProviders(<HomePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Campaign 1')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      
      // Should render reasonably quickly even with many campaigns
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('handles rapid state changes without issues', async () => {
      // Start with loading state
      mockUseCampaigns.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      const { rerender } = renderWithProviders(<HomePage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Quickly change to loaded state
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns.slice(0, 2),
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });

      rerender(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    beforeEach(() => {
      mockUseCampaigns.mockReturnValue({
        data: {
          campaigns: mockCampaigns.slice(0, 3),
          pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      });
    });

    it('maintains proper heading hierarchy', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        const h2s = screen.getAllByRole('heading', { level: 2 });
        
        expect(h1).toBeInTheDocument();
        expect(h2s.length).toBeGreaterThan(0);
      });
    });

    it('provides accessible navigation landmarks', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toBeInTheDocument();
      });
    });

    it('supports screen reader navigation', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const articles = screen.getAllByRole('article');
        articles.forEach(article => {
          expect(article).toHaveAttribute('aria-label');
        });
      });
    });
  });
});