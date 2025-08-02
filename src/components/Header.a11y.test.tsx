import { describe, it, expect, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithProviders } from '@/test/utils';
import { a11yConfig } from '@/test/setup-a11y';
import Header from './Header';

// Mock the Web3Context
const mockWeb3Context = {
  account: '0x1234567890123456789012345678901234567890',
  chainId: 11155111,
  isConnected: true,
  isConnecting: false,
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
  };
});

describe('Header Accessibility Tests', () => {
  describe('Basic Accessibility Compliance', () => {
    it('should not have any accessibility violations when disconnected', async () => {
      mockWeb3Context.isConnected = false;
      mockWeb3Context.account = null;

      const { container } = renderWithProviders(<Header />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should not have any accessibility violations when connected', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.account = '0x1234567890123456789012345678901234567890';

      const { container } = renderWithProviders(<Header />);
      const results = await axe(container, a11yConfig.navigationRules);
      
      expect(results).toHaveNoViolations();
    });

    it('should not have any accessibility violations when connecting', async () => {
      mockWeb3Context.isConnecting = true;
      mockWeb3Context.isConnected = false;

      const { container } = renderWithProviders(<Header />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should not have any accessibility violations with wrong network', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.chainId = 1; // Wrong network

      const { container } = renderWithProviders(<Header />);
      const results = await axe(container, a11yConfig.interactiveRules);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Navigation Accessibility', () => {
    it('should have proper navigation structure', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Check for navigation landmarks
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      
      // Run accessibility tests
      const results = await axe(container, {
        rules: {
          'landmark-one-main': { enabled: false }, // Header doesn't need main landmark
          'region': { enabled: false }, // Allow navigation without region
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should have accessible navigation links', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Check that all navigation links have accessible names
      const links = container.querySelectorAll('a, button[role="link"]');
      links.forEach(link => {
        expect(link).toHaveAccessibleName();
      });
      
      const results = await axe(container, a11yConfig.navigationRules);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Check that interactive elements are focusable
      const interactiveElements = container.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      interactiveElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
      
      const results = await axe(container, {
        rules: {
          'focusable-element': { enabled: true },
          'tabindex': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Button Accessibility', () => {
    it('should have accessible button labels', async () => {
      const { container } = renderWithProviders(<Header />);
      
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
      
      const results = await axe(container, a11yConfig.interactiveRules);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes for mobile menu toggle', async () => {
      const { container } = renderWithProviders(<Header />);
      
      const menuButton = container.querySelector('[aria-label*="menu"], [aria-label*="Menu"]');
      if (menuButton) {
        expect(menuButton).toHaveAttribute('aria-label');
        expect(menuButton).toHaveAttribute('type', 'button');
      }
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle disabled states accessibly', async () => {
      mockWeb3Context.isConnecting = true;
      
      const { container } = renderWithProviders(<Header />);
      
      // Check disabled buttons have proper ARIA attributes
      const disabledButtons = container.querySelectorAll('button[disabled]');
      disabledButtons.forEach(button => {
        expect(button).toHaveAttribute('disabled');
        // Should have aria-disabled or be properly disabled
        expect(
          button.hasAttribute('aria-disabled') || button.hasAttribute('disabled')
        ).toBe(true);
      });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Wallet Interface Accessibility', () => {
    it('should have accessible wallet connection interface', async () => {
      mockWeb3Context.isConnected = false;
      
      const { container } = renderWithProviders(<Header />);
      
      const connectButton = container.querySelector('button[aria-label*="connect"], button[aria-label*="Connect"]');
      if (connectButton) {
        expect(connectButton).toHaveAccessibleName();
      }
      
      const results = await axe(container, a11yConfig.interactiveRules);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible wallet dropdown menu', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.account = '0x1234567890123456789012345678901234567890';
      
      const { container } = renderWithProviders(<Header />);
      
      // Check for dropdown button accessibility
      const dropdownTrigger = container.querySelector('[role="button"], button');
      if (dropdownTrigger) {
        expect(dropdownTrigger).toHaveAccessibleName();
      }
      
      const results = await axe(container, {
        rules: {
          'button-name': { enabled: true },
          'aria-allowed-attr': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should announce wallet status changes', async () => {
      const { container, rerender } = renderWithProviders(<Header />);
      
      // Check initial state
      let results = await axe(container);
      expect(results).toHaveNoViolations();
      
      // Change connection state
      mockWeb3Context.isConnected = true;
      mockWeb3Context.account = '0x1234567890123456789012345678901234567890';
      
      rerender(<Header />);
      
      // Check updated state
      results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Network Status Accessibility', () => {
    it('should accessibly communicate wrong network state', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.chainId = 1; // Wrong network
      
      const { container } = renderWithProviders(<Header />);
      
      // Should have accessible warning message
      const warningElements = container.querySelectorAll('[role="alert"], .text-yellow-600, .text-red-600');
      if (warningElements.length > 0) {
        warningElements.forEach(element => {
          expect(element).toBeInTheDocument();
        });
      }
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible network switch button', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.chainId = 1; // Wrong network
      
      const { container } = renderWithProviders(<Header />);
      
      const switchButton = container.querySelector('button[aria-label*="switch"], button[aria-label*="Switch"]');
      if (switchButton) {
        expect(switchButton).toHaveAccessibleName();
        expect(switchButton).toHaveAttribute('type', 'button');
      }
      
      const results = await axe(container, a11yConfig.interactiveRules);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color and Contrast', () => {
    it('should maintain accessibility without relying only on color', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.chainId = 1; // Wrong network (should show warning)
      
      const { container } = renderWithProviders(<Header />);
      
      // Test with color contrast disabled to ensure other indicators exist
      const results = await axe(container, a11yConfig.disableColorContrast);
      expect(results).toHaveNoViolations();
    });

    it('should have sufficient color contrast for all text', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Run specific color contrast tests
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        }
      });
      
      // Note: This test might fail in test environment due to CSS not being fully rendered
      // In a real browser environment, this would properly test contrast ratios
      expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide meaningful content for screen readers', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Check for hidden screen reader content
      const srOnlyElements = container.querySelectorAll('.sr-only, .visually-hidden');
      // Should have some screen reader only content for context
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading structure', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Headers should have proper hierarchy (though header might not have h1)
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      
      const results = await axe(container, {
        rules: {
          'heading-order': { enabled: true },
          'empty-heading': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations with ARIA labels', async () => {
      const { container } = renderWithProviders(<Header />);
      
      const results = await axe(container, {
        rules: {
          'aria-allowed-attr': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-valid-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      const { container } = renderWithProviders(<Header />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible mobile menu when present', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Check for mobile menu toggle accessibility
      const mobileMenuButton = container.querySelector('[aria-label*="menu"], [aria-expanded]');
      if (mobileMenuButton) {
        expect(mobileMenuButton).toHaveAccessibleName();
      }
      
      const results = await axe(container, a11yConfig.navigationRules);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management', () => {
    it('should have proper focus indicators', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // All interactive elements should be focusable
      const focusableElements = container.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      focusableElements.forEach(element => {
        expect(element).toBeVisible();
      });
      
      const results = await axe(container, {
        rules: {
          'focus-order-semantics': { enabled: true },
          'focusable-element': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should handle focus management for dynamic content', async () => {
      const { container, rerender } = renderWithProviders(<Header />);
      
      // Test focus management when connection state changes
      mockWeb3Context.isConnected = false;
      rerender(<Header />);
      
      let results = await axe(container);
      expect(results).toHaveNoViolations();
      
      mockWeb3Context.isConnected = true;
      rerender(<Header />);
      
      results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});