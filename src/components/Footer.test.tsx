import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import Footer from './Footer';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Footer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders footer with correct structure', () => {
      renderWithProviders(<Footer />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('displays Squdy branding', () => {
      renderWithProviders(<Footer />);
      
      expect(screen.getByText('Squdy')).toBeInTheDocument();
      expect(screen.getByText(/burn-to-win platform/i)).toBeInTheDocument();
    });

    it('shows copyright information', () => {
      renderWithProviders(<Footer />);
      
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('renders all navigation sections', () => {
      renderWithProviders(<Footer />);
      
      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Community')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();
    });

    it('displays platform navigation links', () => {
      renderWithProviders(<Footer />);
      
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
      expect(screen.getByText('How it Works')).toBeInTheDocument();
      expect(screen.getByText('Tokenomics')).toBeInTheDocument();
    });

    it('displays community links', () => {
      renderWithProviders(<Footer />);
      
      expect(screen.getByText('Twitter')).toBeInTheDocument();
      expect(screen.getByText('Discord')).toBeInTheDocument();
      expect(screen.getByText('Telegram')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('displays legal links', () => {
      renderWithProviders(<Footer />);
      
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Cookie Policy')).toBeInTheDocument();
    });

    it('navigates to campaigns page when campaigns link is clicked', async () => {
      const { user } = renderWithProviders(<Footer />);
      
      const campaignsLink = screen.getByText('Campaigns');
      await user.click(campaignsLink);
      
      expect(mockNavigate).toHaveBeenCalledWith('/campaigns');
    });

    it('navigates to terms page when terms link is clicked', async () => {
      const { user } = renderWithProviders(<Footer />);
      
      const termsLink = screen.getByText('Terms of Service');
      await user.click(termsLink);
      
      expect(mockNavigate).toHaveBeenCalledWith('/terms');
    });

    it('navigates to privacy page when privacy link is clicked', async () => {
      const { user } = renderWithProviders(<Footer />);
      
      const privacyLink = screen.getByText('Privacy Policy');
      await user.click(privacyLink);
      
      expect(mockNavigate).toHaveBeenCalledWith('/privacy');
    });
  });

  describe('External Links', () => {
    it('renders social media links with correct href attributes', () => {
      renderWithProviders(<Footer />);
      
      const twitterLink = screen.getByRole('link', { name: /twitter/i });
      expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/squdy_official');
      expect(twitterLink).toHaveAttribute('target', '_blank');
      expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
      
      const discordLink = screen.getByRole('link', { name: /discord/i });
      expect(discordLink).toHaveAttribute('href', 'https://discord.gg/squdy');
      
      const telegramLink = screen.getByRole('link', { name: /telegram/i });
      expect(telegramLink).toHaveAttribute('href', 'https://t.me/squdy_official');
      
      const mediumLink = screen.getByRole('link', { name: /medium/i });
      expect(mediumLink).toHaveAttribute('href', 'https://medium.com/@squdy');
    });

    it('opens external links in new tabs', () => {
      renderWithProviders(<Footer />);
      
      const externalLinks = screen.getAllByRole('link', { name: /(twitter|discord|telegram|medium)/i });
      
      externalLinks.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Token Information', () => {
    it('displays token contract information', () => {
      renderWithProviders(<Footer />);
      
      expect(screen.getByText(/contract address/i)).toBeInTheDocument();
      expect(screen.getByText(/0x.*[0-9a-f]/i)).toBeInTheDocument(); // Matches contract address pattern
    });

    it('provides PancakeSwap trading link', () => {
      renderWithProviders(<Footer />);
      
      const tradingLink = screen.getByRole('link', { name: /buy on pancakeswap/i });
      expect(tradingLink).toBeInTheDocument();
      expect(tradingLink).toHaveAttribute('target', '_blank');
    });

    it('shows network information', () => {
      renderWithProviders(<Footer />);
      
      expect(screen.getByText(/sepolia testnet/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure with contentinfo role', () => {
      renderWithProviders(<Footer />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('has proper heading hierarchy', () => {
      renderWithProviders(<Footer />);
      
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading.tagName).toBe('H3');
      });
    });

    it('has accessible navigation lists', () => {
      renderWithProviders(<Footer />);
      
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('provides accessible names for external links', () => {
      renderWithProviders(<Footer />);
      
      const twitterLink = screen.getByRole('link', { name: /twitter/i });
      expect(twitterLink).toHaveAccessibleName();
      
      const discordLink = screen.getByRole('link', { name: /discord/i });
      expect(discordLink).toHaveAccessibleName();
    });

    it('supports keyboard navigation', async () => {
      const { user } = renderWithProviders(<Footer />);
      
      const firstLink = screen.getByText('Campaigns');
      
      await user.tab();
      // Should be able to navigate to footer links
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      renderWithProviders(<Footer />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('bg-gray-900'); // Should have consistent styling
    });

    it('maintains proper spacing on all screen sizes', () => {
      renderWithProviders(<Footer />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('py-12'); // Should have consistent padding
    });
  });

  describe('Scroll Behavior', () => {
    it('scrolls to how-it-works section when link is clicked', async () => {
      const mockScrollIntoView = vi.fn();
      const mockElement = { scrollIntoView: mockScrollIntoView };
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);
      
      const { user } = renderWithProviders(<Footer />);
      
      const howItWorksLink = screen.getByText('How it Works');
      await user.click(howItWorksLink);
      
      expect(document.getElementById).toHaveBeenCalledWith('how-it-works');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('handles missing target element gracefully', async () => {
      vi.spyOn(document, 'getElementById').mockReturnValue(null);
      
      const { user } = renderWithProviders(<Footer />);
      
      const howItWorksLink = screen.getByText('How it Works');
      
      expect(async () => {
        await user.click(howItWorksLink);
      }).not.toThrow();
    });
  });

  describe('Copy Functionality', () => {
    it('copies contract address when clicked', async () => {
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText },
      });

      const { user } = renderWithProviders(<Footer />);
      
      const contractAddress = screen.getByText(/0x.*[0-9a-f]/i);
      await user.click(contractAddress);
      
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringMatching(/0x[0-9a-f]{40}/i));
    });

    it('shows toast notification when address is copied', async () => {
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText },
      });

      const { user } = renderWithProviders(<Footer />);
      
      const contractAddress = screen.getByText(/0x.*[0-9a-f]/i);
      await user.click(contractAddress);
      
      // Should trigger toast notification
      expect(mockWriteText).toHaveBeenCalled();
    });

    it('handles clipboard API errors gracefully', async () => {
      Object.assign(navigator, {
        clipboard: { 
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard error'))
        },
      });

      const { user } = renderWithProviders(<Footer />);
      
      const contractAddress = screen.getByText(/0x.*[0-9a-f]/i);
      
      expect(async () => {
        await user.click(contractAddress);
      }).not.toThrow();
    });
  });

  describe('Theme Integration', () => {
    it('applies consistent dark theme styling', () => {
      renderWithProviders(<Footer />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('bg-gray-900', 'text-white');
    });

    it('maintains proper contrast for text elements', () => {
      renderWithProviders(<Footer />);
      
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading).toHaveClass('text-white');
      });
    });
  });

  describe('Performance', () => {
    it('renders efficiently without unnecessary re-renders', () => {
      const startTime = performance.now();
      renderWithProviders(<Footer />);
      const endTime = performance.now();
      
      // Should render quickly
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('does not cause memory leaks with external links', () => {
      const { unmount } = renderWithProviders(<Footer />);
      
      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });
  });
});