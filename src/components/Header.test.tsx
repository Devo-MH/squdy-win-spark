import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import Header from './Header';

// Mock the Web3Context
const mockWeb3Context = {
  account: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  balance: '0',
  signer: null,
  provider: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchNetwork: vi.fn(),
};

vi.mock('@/contexts/Web3Context', () => ({
  useWeb3: () => mockWeb3Context,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
  };
});

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Web3 context to default state
    Object.assign(mockWeb3Context, {
      account: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      balance: '0',
      signer: null,
      provider: null,
    });
  });

  describe('Navigation', () => {
    it('renders navigation links correctly', () => {
      renderWithProviders(<Header />);
      
      expect(screen.getByText('Squdy')).toBeInTheDocument();
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
      expect(screen.getByText('How it Works')).toBeInTheDocument();
    });

    it('navigates to campaigns page when campaigns link is clicked', async () => {
      const { user } = renderWithProviders(<Header />);
      
      const campaignsLink = screen.getByText('Campaigns');
      await user.click(campaignsLink);
      
      expect(mockNavigate).toHaveBeenCalledWith('/campaigns');
    });

    it('scrolls to how-it-works section when link is clicked', async () => {
      const mockScrollIntoView = vi.fn();
      const mockElement = { scrollIntoView: mockScrollIntoView };
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);
      
      const { user } = renderWithProviders(<Header />);
      
      const howItWorksLink = screen.getByText('How it Works');
      await user.click(howItWorksLink);
      
      expect(document.getElementById).toHaveBeenCalledWith('how-it-works');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('shows mobile menu toggle button on mobile', () => {
      renderWithProviders(<Header />);
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toBeInTheDocument();
    });
  });

  describe('Wallet Connection', () => {
    it('shows connect wallet button when not connected', () => {
      renderWithProviders(<Header />);
      
      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      expect(connectButton).toBeInTheDocument();
    });

    it('calls connect function when connect wallet button is clicked', async () => {
      const { user } = renderWithProviders(<Header />);
      
      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      await user.click(connectButton);
      
      expect(mockWeb3Context.connect).toHaveBeenCalled();
    });

    it('shows connecting state when wallet is connecting', () => {
      mockWeb3Context.isConnecting = true;
      
      renderWithProviders(<Header />);
      
      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });

    it('shows wallet address and balance when connected', () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.account = '0x1234567890123456789012345678901234567890';
      mockWeb3Context.balance = '1500.5';
      
      renderWithProviders(<Header />);
      
      expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
      expect(screen.getByText('1,500.5 SQUDY')).toBeInTheDocument();
    });

    it('shows wallet dropdown menu when connected', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.account = '0x1234567890123456789012345678901234567890';
      mockWeb3Context.balance = '1500.5';
      
      const { user } = renderWithProviders(<Header />);
      
      const walletButton = screen.getByRole('button', { name: /0x1234/i });
      await user.click(walletButton);
      
      expect(screen.getByText('View on Etherscan')).toBeInTheDocument();
      expect(screen.getByText('Copy Address')).toBeInTheDocument();
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });

    it('copies address to clipboard when copy button is clicked', async () => {
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText },
      });

      mockWeb3Context.isConnected = true;
      mockWeb3Context.account = '0x1234567890123456789012345678901234567890';
      
      const { user } = renderWithProviders(<Header />);
      
      const walletButton = screen.getByRole('button', { name: /0x1234/i });
      await user.click(walletButton);
      
      const copyButton = screen.getByText('Copy Address');
      await user.click(copyButton);
      
      expect(mockWriteText).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
    });

    it('disconnects wallet when disconnect button is clicked', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.account = '0x1234567890123456789012345678901234567890';
      
      const { user } = renderWithProviders(<Header />);
      
      const walletButton = screen.getByRole('button', { name: /0x1234/i });
      await user.click(walletButton);
      
      const disconnectButton = screen.getByText('Disconnect');
      await user.click(disconnectButton);
      
      expect(mockWeb3Context.disconnect).toHaveBeenCalled();
    });
  });

  describe('Network Management', () => {
    it('shows wrong network warning when on incorrect chain', () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.chainId = 1; // Wrong network (mainnet instead of sepolia)
      
      renderWithProviders(<Header />);
      
      expect(screen.getByText(/wrong network/i)).toBeInTheDocument();
    });

    it('shows switch network button when on wrong network', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.chainId = 1;
      
      const { user } = renderWithProviders(<Header />);
      
      const switchButton = screen.getByRole('button', { name: /switch to sepolia/i });
      expect(switchButton).toBeInTheDocument();
      
      await user.click(switchButton);
      expect(mockWeb3Context.switchNetwork).toHaveBeenCalledWith(11155111);
    });

    it('does not show network warning when on correct chain', () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.chainId = 11155111; // Correct network (sepolia)
      
      renderWithProviders(<Header />);
      
      expect(screen.queryByText(/wrong network/i)).not.toBeInTheDocument();
    });
  });

  describe('Admin Access', () => {
    it('shows admin panel link for admin wallets', () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.account = '0x1234567890123456789012345678901234567890'; // Admin wallet from env
      
      renderWithProviders(<Header />);
      
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('does not show admin panel link for non-admin wallets', () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.account = '0x9999999999999999999999999999999999999999'; // Non-admin wallet
      
      renderWithProviders(<Header />);
      
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('navigates to admin panel when admin link is clicked', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.account = '0x1234567890123456789012345678901234567890';
      
      const { user } = renderWithProviders(<Header />);
      
      const adminLink = screen.getByText('Admin');
      await user.click(adminLink);
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  describe('Mobile Navigation', () => {
    it('opens mobile menu when menu button is clicked', async () => {
      const { user } = renderWithProviders(<Header />);
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      await user.click(menuButton);
      
      // Check if mobile menu items are visible
      const mobileLinks = screen.getAllByText('Campaigns');
      expect(mobileLinks.length).toBeGreaterThan(1); // Desktop + mobile versions
    });

    it('closes mobile menu when a navigation link is clicked', async () => {
      const { user } = renderWithProviders(<Header />);
      
      // Open menu
      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      await user.click(menuButton);
      
      // Click a mobile navigation link
      const mobileLinks = screen.getAllByText('Campaigns');
      await user.click(mobileLinks[1]); // Click mobile version
      
      // Menu should close
      await waitFor(() => {
        const visibleMobileLinks = screen.getAllByText('Campaigns');
        expect(visibleMobileLinks.length).toBe(1); // Only desktop version visible
      });
    });
  });

  describe('Error Handling', () => {
    it('handles wallet connection errors gracefully', async () => {
      mockWeb3Context.connect.mockRejectedValue(new Error('Connection failed'));
      
      const { user } = renderWithProviders(<Header />);
      
      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      await user.click(connectButton);
      
      // Should not crash and should still show connect button
      expect(connectButton).toBeInTheDocument();
    });

    it('handles network switching errors gracefully', async () => {
      mockWeb3Context.isConnected = true;
      mockWeb3Context.chainId = 1;
      mockWeb3Context.switchNetwork.mockRejectedValue(new Error('Network switch failed'));
      
      const { user } = renderWithProviders(<Header />);
      
      const switchButton = screen.getByRole('button', { name: /switch to sepolia/i });
      await user.click(switchButton);
      
      // Should not crash and button should still be available
      expect(switchButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      renderWithProviders(<Header />);
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toHaveAttribute('aria-label');
      
      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      expect(connectButton).toBeInTheDocument();
    });

    it('has proper navigation structure', () => {
      renderWithProviders(<Header />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const { user } = renderWithProviders(<Header />);
      
      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      
      await user.tab();
      expect(connectButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockWeb3Context.connect).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('shows desktop navigation on larger screens', () => {
      renderWithProviders(<Header />);
      
      const desktopNav = screen.getByRole('navigation');
      expect(desktopNav).toBeInTheDocument();
    });

    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithProviders(<Header />);
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toBeInTheDocument();
    });
  });
});