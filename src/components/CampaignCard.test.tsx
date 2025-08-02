import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, generateTestCampaigns } from '@/test/utils';
import CampaignCard from './CampaignCard';
import { mockCampaign } from '@/test/mocks/data';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CampaignCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders campaign information correctly', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      expect(screen.getByText(/This is a test campaign 1/)).toBeInTheDocument();
    });

    it('displays campaign image with proper alt text', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const image = screen.getByRole('img', { name: /test campaign 1/i });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', campaign.image);
    });

    it('shows campaign status badge', () => {
      const activeCampaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={activeCampaign} />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('displays prize information when prizes exist', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('Prize 1')).toBeInTheDocument();
      expect(screen.getByText('Prize 2')).toBeInTheDocument();
    });

    it('shows fallback text when no prizes are available', () => {
      const campaign = { ...mockCampaign(1), prizes: undefined };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('Prizes to be announced')).toBeInTheDocument();
    });
  });

  describe('Campaign Status', () => {
    it('displays correct status for active campaigns', () => {
      const campaign = { ...mockCampaign(1), status: 'active' as const };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('displays correct status for paused campaigns', () => {
      const campaign = { ...mockCampaign(1), status: 'paused' as const };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('Paused')).toBeInTheDocument();
    });

    it('displays correct status for finished campaigns', () => {
      const campaign = { ...mockCampaign(1), status: 'finished' as const };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('Finished')).toBeInTheDocument();
    });

    it('shows appropriate styling for different statuses', () => {
      const activeCampaign = { ...mockCampaign(1), status: 'active' as const };
      const { rerender } = renderWithProviders(<CampaignCard campaign={activeCampaign} />);
      
      let statusBadge = screen.getByText('Active');
      expect(statusBadge).toHaveClass('bg-green-100');
      
      const pausedCampaign = { ...mockCampaign(1), status: 'paused' as const };
      rerender(<CampaignCard campaign={pausedCampaign} />);
      
      statusBadge = screen.getByText('Paused');
      expect(statusBadge).toHaveClass('bg-yellow-100');
    });
  });

  describe('Progress Tracking', () => {
    it('displays funding progress correctly', () => {
      const campaign = {
        ...mockCampaign(1),
        currentAmount: 5000,
        hardCap: 10000,
      };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('5,000 / 10,000 SQUDY')).toBeInTheDocument();
    });

    it('shows participant count', () => {
      const campaign = { ...mockCampaign(1), participants: 25 };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('25 participants')).toBeInTheDocument();
    });

    it('displays progress bar with correct percentage', () => {
      const campaign = {
        ...mockCampaign(1),
        currentAmount: 3000,
        hardCap: 10000,
      };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '30');
    });
  });

  describe('Time Display', () => {
    it('shows time remaining for active campaigns', () => {
      const now = new Date();
      const endDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      
      const campaign = {
        ...mockCampaign(1),
        status: 'active' as const,
        endDate: endDate.toISOString(),
      };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText(/days left/i)).toBeInTheDocument();
    });

    it('shows ended status for finished campaigns', () => {
      const campaign = {
        ...mockCampaign(1),
        status: 'finished' as const,
      };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('Ended')).toBeInTheDocument();
    });

    it('handles campaigns ending today', () => {
      const now = new Date();
      const endDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      
      const campaign = {
        ...mockCampaign(1),
        status: 'active' as const,
        endDate: endDate.toISOString(),
      };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText(/ends today/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to campaign detail page when clicked', async () => {
      const campaign = mockCampaign(1);
      const { user } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const card = screen.getByRole('article');
      await user.click(card);
      
      expect(mockNavigate).toHaveBeenCalledWith('/campaigns/1');
    });

    it('handles keyboard navigation', async () => {
      const campaign = mockCampaign(1);
      const { user } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const card = screen.getByRole('article');
      card.focus();
      
      await user.keyboard('{Enter}');
      expect(mockNavigate).toHaveBeenCalledWith('/campaigns/1');
      
      await user.keyboard('{Space}');
      expect(mockNavigate).toHaveBeenCalledWith('/campaigns/1');
    });

    it('uses contract ID when regular ID is not available', async () => {
      const campaign = { ...mockCampaign(1), id: undefined, contractId: 5 };
      const { user } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const card = screen.getByRole('article');
      await user.click(card);
      
      expect(mockNavigate).toHaveBeenCalledWith('/campaigns/5');
    });
  });

  describe('Prize Display', () => {
    it('shows first two prizes when available', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('Prize 1')).toBeInTheDocument();
      expect(screen.getByText('Prize 2')).toBeInTheDocument();
    });

    it('shows +X more indicator when there are more than 2 prizes', () => {
      const campaign = {
        ...mockCampaign(1),
        prizes: [
          { id: '1', name: 'Prize 1', value: 1000, currency: 'USD' as const, description: '', quantity: 1 },
          { id: '2', name: 'Prize 2', value: 500, currency: 'USD' as const, description: '', quantity: 1 },
          { id: '3', name: 'Prize 3', value: 250, currency: 'USD' as const, description: '', quantity: 1 },
          { id: '4', name: 'Prize 4', value: 100, currency: 'USD' as const, description: '', quantity: 1 },
        ],
      };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('handles empty prizes array gracefully', () => {
      const campaign = { ...mockCampaign(1), prizes: [] };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      expect(screen.getByText('Prizes to be announced')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Test Campaign 1');
    });

    it('has accessible image with proper alt text', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAccessibleName('Test Campaign 1');
    });

    it('has keyboard navigation support', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('has proper ARIA labels for progress bar', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Campaign funding progress');
    });

    it('provides accessible description for campaign card', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Test Campaign 1'));
    });
  });

  describe('Error Handling', () => {
    it('handles missing campaign data gracefully', () => {
      const incompleteCampaign = {
        id: '1',
        name: 'Test Campaign',
        status: 'active' as const,
        // Missing other required fields
      };
      
      expect(() => {
        renderWithProviders(<CampaignCard campaign={incompleteCampaign as any} />);
      }).not.toThrow();
    });

    it('handles invalid dates gracefully', () => {
      const campaign = {
        ...mockCampaign(1),
        endDate: 'invalid-date',
      };
      
      expect(() => {
        renderWithProviders(<CampaignCard campaign={campaign} />);
      }).not.toThrow();
    });

    it('handles missing image gracefully', () => {
      const campaign = { ...mockCampaign(1), image: '' };
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Should still render without crashing
      expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveClass('w-full');
    });

    it('maintains aspect ratio for campaign images', () => {
      const campaign = mockCampaign(1);
      renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const imageContainer = screen.getByRole('img').parentElement;
      expect(imageContainer).toHaveClass('aspect-video');
    });
  });

  describe('Performance', () => {
    it('renders multiple campaign cards efficiently', () => {
      const campaigns = generateTestCampaigns(10);
      
      const startTime = performance.now();
      renderWithProviders(
        <div>
          {campaigns.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      );
      const endTime = performance.now();
      
      // Should render quickly (less than 100ms for 10 cards)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});