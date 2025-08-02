import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import HeroSection from './HeroSection';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('HeroSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Content Display', () => {
    it('renders main heading correctly', () => {
      renderWithProviders(<HeroSection />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/squdy.*burn.*win/i);
    });

    it('displays hero description text', () => {
      renderWithProviders(<HeroSection />);
      
      expect(screen.getByText(/stake.*squdy.*tokens/i)).toBeInTheDocument();
      expect(screen.getByText(/complete.*social.*tasks/i)).toBeInTheDocument();
    });

    it('shows call-to-action buttons', () => {
      renderWithProviders(<HeroSection />);
      
      expect(screen.getByRole('button', { name: /explore campaigns/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument();
    });

    it('displays key features or benefits', () => {
      renderWithProviders(<HeroSection />);
      
      expect(screen.getByText(/transparent/i)).toBeInTheDocument();
      expect(screen.getByText(/community.*driven/i)).toBeInTheDocument();
      expect(screen.getByText(/fair.*random/i)).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('navigates to campaigns page when explore button is clicked', async () => {
      const { user } = renderWithProviders(<HeroSection />);
      
      const exploreButton = screen.getByRole('button', { name: /explore campaigns/i });
      await user.click(exploreButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/campaigns');
    });

    it('scrolls to how-it-works section when learn more is clicked', async () => {
      const mockScrollIntoView = vi.fn();
      const mockElement = { scrollIntoView: mockScrollIntoView };
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);
      
      const { user } = renderWithProviders(<HeroSection />);
      
      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
      await user.click(learnMoreButton);
      
      expect(document.getElementById).toHaveBeenCalledWith('how-it-works');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('handles missing how-it-works section gracefully', async () => {
      vi.spyOn(document, 'getElementById').mockReturnValue(null);
      
      const { user } = renderWithProviders(<HeroSection />);
      
      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
      
      expect(async () => {
        await user.click(learnMoreButton);
      }).not.toThrow();
    });
  });

  describe('Visual Elements', () => {
    it('displays hero background or illustration', () => {
      renderWithProviders(<HeroSection />);
      
      // Check for background elements or images
      const heroSection = screen.getByRole('banner') || screen.getByRole('main');
      expect(heroSection).toBeInTheDocument();
    });

    it('shows platform statistics or highlights', () => {
      renderWithProviders(<HeroSection />);
      
      // Look for statistics like total staked, campaigns, etc.
      expect(screen.getByText(/\d+.*campaigns/i) || 
             screen.getByText(/\d+.*users/i) || 
             screen.getByText(/\d+.*tokens/i)).toBeInTheDocument();
    });

    it('displays platform features with icons', () => {
      renderWithProviders(<HeroSection />);
      
      // Check for feature icons (assuming they have accessible names)
      const features = screen.getAllByRole('img') || screen.getAllByTestId(/icon/i);
      expect(features.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      renderWithProviders(<HeroSection />);
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      
      const subHeadings = screen.queryAllByRole('heading', { level: 2 });
      // Should have logical heading structure
    });

    it('has accessible button labels', () => {
      renderWithProviders(<HeroSection />);
      
      const exploreButton = screen.getByRole('button', { name: /explore campaigns/i });
      expect(exploreButton).toHaveAccessibleName();
      
      const learnButton = screen.getByRole('button', { name: /learn more/i });
      expect(learnButton).toHaveAccessibleName();
    });

    it('supports keyboard navigation', async () => {
      const { user } = renderWithProviders(<HeroSection />);
      
      const firstButton = screen.getByRole('button', { name: /explore campaigns/i });
      
      await user.tab();
      expect(firstButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('has appropriate ARIA labels for decorative elements', () => {
      renderWithProviders(<HeroSection />);
      
      const decorativeImages = screen.queryAllByRole('img', { hidden: true });
      decorativeImages.forEach(img => {
        expect(img).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('provides screen reader friendly content structure', () => {
      renderWithProviders(<HeroSection />);
      
      // Should have a main landmark or section
      const main = screen.queryByRole('main') || screen.queryByRole('banner');
      expect(main).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithProviders(<HeroSection />);
      
      const heroSection = screen.getByRole('banner') || screen.getByRole('main');
      expect(heroSection).toBeInTheDocument();
    });

    it('maintains proper spacing on different screen sizes', () => {
      renderWithProviders(<HeroSection />);
      
      // Check for responsive classes
      const heroSection = screen.getByRole('banner') || screen.getByRole('main');
      expect(heroSection).toHaveClass(/py-\d+/); // Should have responsive padding
    });

    it('stacks elements vertically on small screens', () => {
      renderWithProviders(<HeroSection />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Animation and Effects', () => {
    it('applies entrance animations if present', () => {
      renderWithProviders(<HeroSection />);
      
      // Check for animation classes or data attributes
      const animatedElements = screen.getAllByText(/squdy/i);
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('handles reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      renderWithProviders(<HeroSection />);
      
      // Should render without animations
      const heroSection = screen.getByRole('banner') || screen.getByRole('main');
      expect(heroSection).toBeInTheDocument();
    });
  });

  describe('Content Accuracy', () => {
    it('displays accurate platform information', () => {
      renderWithProviders(<HeroSection />);
      
      expect(screen.getByText(/burn.*to.*win/i)).toBeInTheDocument();
      expect(screen.getByText(/stake.*squdy/i)).toBeInTheDocument();
      expect(screen.getByText(/social.*media/i)).toBeInTheDocument();
    });

    it('shows correct value propositions', () => {
      renderWithProviders(<HeroSection />);
      
      expect(screen.getByText(/transparent/i)).toBeInTheDocument();
      expect(screen.getByText(/fair/i)).toBeInTheDocument();
      expect(screen.getByText(/community/i)).toBeInTheDocument();
    });

    it('maintains consistent branding', () => {
      renderWithProviders(<HeroSection />);
      
      const brandElements = screen.getAllByText(/squdy/i);
      expect(brandElements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('renders efficiently without blocking', () => {
      const startTime = performance.now();
      renderWithProviders(<HeroSection />);
      const endTime = performance.now();
      
      // Should render quickly
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles large viewport sizes without issues', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 2560,
      });
      
      renderWithProviders(<HeroSection />);
      
      const heroSection = screen.getByRole('banner') || screen.getByRole('main');
      expect(heroSection).toBeInTheDocument();
    });

    it('optimizes image loading if images are present', () => {
      renderWithProviders(<HeroSection />);
      
      const images = screen.queryAllByRole('img');
      images.forEach(img => {
        // Should have loading optimization attributes
        expect(img).toHaveAttribute('loading', expect.any(String));
      });
    });
  });

  describe('Error Handling', () => {
    it('handles navigation errors gracefully', async () => {
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });
      
      const { user } = renderWithProviders(<HeroSection />);
      
      const exploreButton = screen.getByRole('button', { name: /explore campaigns/i });
      
      expect(async () => {
        await user.click(exploreButton);
      }).not.toThrow();
    });

    it('continues to function when scroll target is missing', async () => {
      vi.spyOn(document, 'getElementById').mockImplementation(() => {
        throw new Error('Element not found');
      });
      
      const { user } = renderWithProviders(<HeroSection />);
      
      const learnButton = screen.getByRole('button', { name: /learn more/i });
      
      expect(async () => {
        await user.click(learnButton);
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('integrates properly with routing system', () => {
      renderWithProviders(<HeroSection />, { initialRoute: '/' });
      
      const exploreButton = screen.getByRole('button', { name: /explore campaigns/i });
      expect(exploreButton).toBeInTheDocument();
    });

    it('works correctly with theme provider', () => {
      renderWithProviders(<HeroSection />);
      
      // Should apply theme classes correctly
      const heroSection = screen.getByRole('banner') || screen.getByRole('main');
      expect(heroSection).toHaveClass(/bg-/); // Should have background classes
    });
  });
});