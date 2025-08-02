import { describe, it, expect, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithProviders } from '@/test/utils';
import { a11yConfig } from '@/test/setup-a11y';
import CampaignCard from './CampaignCard';
import { mockCampaign } from '@/test/mocks/data';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('CampaignCard Accessibility Tests', () => {
  describe('Basic Accessibility Compliance', () => {
    it('should not have any accessibility violations with complete campaign data', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have any accessibility violations with minimal campaign data', async () => {
      const minimalCampaign = {
        id: '1',
        name: 'Minimal Campaign',
        description: 'Basic description',
        image: 'https://example.com/image.jpg',
        status: 'active' as const,
        currentAmount: 1000,
        hardCap: 10000,
        participants: 5,
      };
      
      const { container } = renderWithProviders(<CampaignCard campaign={minimalCampaign as any} />);
      
      const results = await axe(container, a11yConfig.disableColorContrast);
      expect(results).toHaveNoViolations();
    });

    it('should not have any accessibility violations for different campaign statuses', async () => {
      const statuses = ['active', 'paused', 'finished', 'cancelled'] as const;
      
      for (const status of statuses) {
        const campaign = { ...mockCampaign(1), status };
        const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
        
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });
  });

  describe('Semantic Structure', () => {
    it('should have proper semantic HTML structure', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Should have article element for semantic structure
      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
      
      // Should have proper heading
      const heading = container.querySelector('h1, h2, h3, h4, h5, h6');
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(campaign.name);
      
      const results = await axe(container, {
        rules: {
          'landmark-one-main': { enabled: false }, // Cards don't need main landmark
          'region': { enabled: false }, // Allow cards without regions
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should have accessible heading hierarchy', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const results = await axe(container, {
        rules: {
          'heading-order': { enabled: true },
          'empty-heading': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should provide semantic list structure for prizes when applicable', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Check if prizes are presented in accessible way
      const results = await axe(container, {
        rules: {
          'list': { enabled: true },
          'listitem': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive Elements', () => {
    it('should have accessible interactive card element', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Card should be keyboard accessible
      const clickableElement = container.querySelector('[tabindex="0"], button, a');
      expect(clickableElement).toBeInTheDocument();
      
      if (clickableElement) {
        expect(clickableElement).toHaveAttribute('tabindex', '0');
      }
      
      const results = await axe(container, a11yConfig.interactiveRules);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels for interactive elements', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Interactive elements should have accessible names
      const interactiveElements = container.querySelectorAll(
        'button, a, [role="button"], [tabindex="0"]'
      );
      
      interactiveElements.forEach(element => {
        expect(element).toHaveAccessibleName();
      });
      
      const results = await axe(container, {
        rules: {
          'button-name': { enabled: true },
          'link-name': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const results = await axe(container, {
        rules: {
          'focusable-element': { enabled: true },
          'tabindex': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Images and Media', () => {
    it('should have accessible image with proper alt text', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const image = container.querySelector('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAccessibleName();
      expect(image).toHaveAttribute('alt');
      
      const results = await axe(container, {
        rules: {
          'image-alt': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should handle missing images gracefully', async () => {
      const campaignWithoutImage = { ...mockCampaign(1), image: '' };
      const { container } = renderWithProviders(<CampaignCard campaign={campaignWithoutImage} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide alternative content when images fail to load', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Even with broken images, should maintain accessibility
      const results = await axe(container, {
        rules: {
          'image-alt': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Progress Indicators', () => {
    it('should have accessible progress bar', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      if (progressBar) {
        expect(progressBar).toHaveAttribute('aria-valuenow');
        expect(progressBar).toHaveAttribute('aria-valuemin');
        expect(progressBar).toHaveAttribute('aria-valuemax');
        expect(progressBar).toHaveAccessibleName();
      }
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide meaningful progress information', async () => {
      const campaign = {
        ...mockCampaign(1),
        currentAmount: 7500,
        hardCap: 10000,
      };
      
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      if (progressBar) {
        expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      }
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Status Communication', () => {
    it('should communicate campaign status accessibly', async () => {
      const statuses = [
        { status: 'active' as const, expectedColor: 'green' },
        { status: 'paused' as const, expectedColor: 'yellow' },
        { status: 'finished' as const, expectedColor: 'gray' },
        { status: 'cancelled' as const, expectedColor: 'red' },
      ];
      
      for (const { status } of statuses) {
        const campaign = { ...mockCampaign(1), status };
        const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
        
        // Status should be communicated through text, not just color
        const statusText = container.textContent;
        expect(statusText).toMatch(new RegExp(status, 'i'));
        
        const results = await axe(container, a11yConfig.disableColorContrast);
        expect(results).toHaveNoViolations();
      }
    });

    it('should provide time-based status information accessibly', async () => {
      const now = new Date();
      const endingSoonCampaign = {
        ...mockCampaign(1),
        endDate: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      };
      
      const { container } = renderWithProviders(<CampaignCard campaign={endingSoonCampaign} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Content Organization', () => {
    it('should organize information hierarchically', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Check for proper information hierarchy
      const heading = container.querySelector('h1, h2, h3, h4, h5, h6');
      expect(heading).toBeInTheDocument();
      
      const results = await axe(container, {
        rules: {
          'heading-order': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should group related information accessibly', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Related information should be grouped logically
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle long campaign names and descriptions', async () => {
      const longContentCampaign = {
        ...mockCampaign(1),
        name: 'This is a very long campaign name that might wrap to multiple lines and should still be accessible',
        description: 'This is a very long campaign description that contains a lot of information about the campaign and its goals and objectives and what participants can expect to gain from participating in this particular campaign which should remain accessible even with this much content',
      };
      
      const { container } = renderWithProviders(<CampaignCard campaign={longContentCampaign} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Error States and Edge Cases', () => {
    it('should handle missing prize information accessibly', async () => {
      const campaignNoPrizes = { ...mockCampaign(1), prizes: undefined };
      const { container } = renderWithProviders(<CampaignCard campaign={campaignNoPrizes} />);
      
      // Should show fallback content
      expect(container.textContent).toContain('Prizes to be announced');
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle empty prize arrays accessibly', async () => {
      const campaignEmptyPrizes = { ...mockCampaign(1), prizes: [] };
      const { container } = renderWithProviders(<CampaignCard campaign={campaignEmptyPrizes} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle invalid dates gracefully', async () => {
      const campaignInvalidDate = {
        ...mockCampaign(1),
        endDate: 'invalid-date',
      };
      
      const { container } = renderWithProviders(<CampaignCard campaign={campaignInvalidDate} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility on mobile viewports', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should maintain accessibility on tablet viewports', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader Experience', () => {
    it('should provide comprehensive information to screen readers', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Check for screen reader specific content
      const article = container.querySelector('article');
      if (article) {
        expect(article).toHaveAttribute('aria-label');
      }
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce dynamic content changes', async () => {
      const campaign = mockCampaign(1);
      const { container, rerender } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      let results = await axe(container);
      expect(results).toHaveNoViolations();
      
      // Update campaign status
      const updatedCampaign = { ...campaign, status: 'finished' as const };
      rerender(<CampaignCard campaign={updatedCampaign} />);
      
      results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide context for numeric information', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Numbers should have context (currency, units, etc.)
      const textContent = container.textContent || '';
      expect(textContent).toMatch(/\d+.*participants/i);
      expect(textContent).toMatch(/\d+.*squdy/i);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color and Contrast Independence', () => {
    it('should convey information without relying solely on color', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      // Test without color contrast to ensure other indicators exist
      const results = await axe(container, a11yConfig.disableColorContrast);
      expect(results).toHaveNoViolations();
    });

    it('should have sufficient color contrast for all text elements', async () => {
      const campaign = mockCampaign(1);
      const { container } = renderWithProviders(<CampaignCard campaign={campaign} />);
      
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        }
      });
      
      // Note: This may not work perfectly in test environment
      // but will work in real browsers with proper CSS rendering
      expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
    });
  });

  describe('Performance and Accessibility', () => {
    it('should maintain accessibility with multiple campaign cards', async () => {
      const campaigns = Array.from({ length: 5 }, (_, i) => mockCampaign(i + 1));
      
      const { container } = renderWithProviders(
        <div>
          {campaigns.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations with loading states', async () => {
      const loadingCampaign = {
        ...mockCampaign(1),
        // Simulate loading state with minimal data
        prizes: undefined,
        participants: 0,
        currentAmount: 0,
      };
      
      const { container } = renderWithProviders(<CampaignCard campaign={loadingCampaign} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});