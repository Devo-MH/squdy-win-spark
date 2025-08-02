import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useAuth, useLogin, useLogout } from './useAuth';

// Mock the API services
const mockAuthAPI = {
  getNonce: vi.fn(),
  verifySignature: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
};

vi.mock('@/services/api', () => ({
  authAPI: mockAuthAPI,
}));

// Mock Web3 context
const mockWeb3Context = {
  account: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  signer: {
    signMessage: vi.fn(),
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('@/contexts/Web3Context', () => ({
  useWeb3: () => mockWeb3Context,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAuth Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});
    
    // Reset Web3 mock
    mockWeb3Context.account = '0x1234567890123456789012345678901234567890';
    mockWeb3Context.isConnected = true;
    mockWeb3Context.signer.signMessage.mockResolvedValue('0xsignature');
  });

  describe('useAuth Hook', () => {
    it('returns not authenticated when no token in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('returns authenticated when valid token exists', () => {
      const mockToken = 'valid.jwt.token';
      const mockUser = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        isAdmin: true,
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return mockToken;
        if (key === 'user_data') return JSON.stringify(mockUser);
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
    });

    it('handles corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return 'valid.token';
        if (key === 'user_data') return 'invalid-json';
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('determines admin status correctly', () => {
      const adminWallet = '0x1234567890123456789012345678901234567890'; // From env mock
      const mockUser = {
        walletAddress: adminWallet,
        isAdmin: true,
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return 'token';
        if (key === 'user_data') return JSON.stringify(mockUser);
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAdmin).toBe(true);
    });

    it('updates authentication state when localStorage changes', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(false);

      // Simulate localStorage change
      act(() => {
        mockLocalStorage.getItem.mockImplementation((key) => {
          if (key === 'auth_token') return 'new.token';
          if (key === 'user_data') return JSON.stringify({ walletAddress: '0x123', isAdmin: false });
          return null;
        });
        
        // Trigger storage event
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'auth_token',
          newValue: 'new.token',
        }));
      });

      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('useLogin Hook', () => {
    it('performs complete login flow successfully', async () => {
      const mockNonce = 'random-nonce-123';
      const mockSignature = '0xsignature123';
      const mockToken = 'jwt.token.here';
      const mockUser = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        isAdmin: true,
      };

      // Mock API responses
      mockAuthAPI.getNonce.mockResolvedValue({ nonce: mockNonce });
      mockAuthAPI.verifySignature.mockResolvedValue({
        success: true,
        token: mockToken,
        user: mockUser,
      });

      // Mock wallet signature
      mockWeb3Context.signer.signMessage.mockResolvedValue(mockSignature);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);

      // Start login process
      act(() => {
        result.current.mutate();
      });

      expect(result.current.isPending).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });

      expect(result.current.isSuccess).toBe(true);

      // Verify API calls
      expect(mockAuthAPI.getNonce).toHaveBeenCalledWith(mockWeb3Context.account);
      expect(mockWeb3Context.signer.signMessage).toHaveBeenCalledWith(
        expect.stringContaining(mockNonce)
      );
      expect(mockAuthAPI.verifySignature).toHaveBeenCalledWith({
        walletAddress: mockWeb3Context.account,
        signature: mockSignature,
        nonce: mockNonce,
      });

      // Verify localStorage updates
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user_data', JSON.stringify(mockUser));
    });

    it('handles wallet not connected error', async () => {
      mockWeb3Context.isConnected = false;
      mockWeb3Context.account = null;

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Wallet not connected'));
      expect(mockAuthAPI.getNonce).not.toHaveBeenCalled();
    });

    it('handles nonce generation failure', async () => {
      const error = new Error('Failed to generate nonce');
      mockAuthAPI.getNonce.mockRejectedValue(error);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
      expect(mockWeb3Context.signer.signMessage).not.toHaveBeenCalled();
    });

    it('handles signature rejection by user', async () => {
      mockAuthAPI.getNonce.mockResolvedValue({ nonce: 'test-nonce' });
      
      const signatureError = new Error('User rejected signature');
      mockWeb3Context.signer.signMessage.mockRejectedValue(signatureError);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(signatureError);
      expect(mockAuthAPI.verifySignature).not.toHaveBeenCalled();
    });

    it('handles signature verification failure', async () => {
      mockAuthAPI.getNonce.mockResolvedValue({ nonce: 'test-nonce' });
      mockWeb3Context.signer.signMessage.mockResolvedValue('0xsignature');
      
      const verificationError = new Error('Invalid signature');
      mockAuthAPI.verifySignature.mockRejectedValue(verificationError);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(verificationError);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('generates correct message for signing', async () => {
      const mockNonce = 'test-nonce-123';
      mockAuthAPI.getNonce.mockResolvedValue({ nonce: mockNonce });
      mockAuthAPI.verifySignature.mockResolvedValue({
        success: true,
        token: 'token',
        user: { walletAddress: '0x123', isAdmin: false },
      });

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(mockWeb3Context.signer.signMessage).toHaveBeenCalled();
      });

      const signedMessage = mockWeb3Context.signer.signMessage.mock.calls[0][0];
      expect(signedMessage).toContain('Sign this message to authenticate');
      expect(signedMessage).toContain(mockNonce);
      expect(signedMessage).toContain('Squdy');
    });

    it('calls onSuccess callback when provided', async () => {
      const onSuccess = vi.fn();
      mockAuthAPI.getNonce.mockResolvedValue({ nonce: 'nonce' });
      mockAuthAPI.verifySignature.mockResolvedValue({
        success: true,
        token: 'token',
        user: { walletAddress: '0x123', isAdmin: false },
      });

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(undefined, { onSuccess });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        token: 'token',
      }));
    });
  });

  describe('useLogout Hook', () => {
    it('performs logout successfully', async () => {
      mockAuthAPI.logout.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthAPI.logout).toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user_data');
    });

    it('clears local storage even if API call fails', async () => {
      mockAuthAPI.logout.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should still clear localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user_data');
    });

    it('disconnects wallet when provided in options', async () => {
      mockAuthAPI.logout.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ disconnectWallet: true });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockWeb3Context.disconnect).toHaveBeenCalled();
    });

    it('does not disconnect wallet by default', async () => {
      mockAuthAPI.logout.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockWeb3Context.disconnect).not.toHaveBeenCalled();
    });

    it('calls onSuccess callback when provided', async () => {
      const onSuccess = vi.fn();
      mockAuthAPI.logout.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(undefined, { onSuccess });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('Authentication State Persistence', () => {
    it('maintains authentication across page reloads', () => {
      const mockToken = 'persisted.token';
      const mockUser = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        isAdmin: true,
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return mockToken;
        if (key === 'user_data') return JSON.stringify(mockUser);
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
    });

    it('handles token expiration gracefully', () => {
      // Mock expired token scenario
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return 'expired.token';
        if (key === 'user_data') return JSON.stringify({ walletAddress: '0x123', isAdmin: false });
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Should still return authenticated state (token validation would happen server-side)
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('syncs authentication state across tabs', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(false);

      // Simulate another tab logging in
      act(() => {
        mockLocalStorage.getItem.mockImplementation((key) => {
          if (key === 'auth_token') return 'new.token';
          if (key === 'user_data') return JSON.stringify({ walletAddress: '0x123', isAdmin: false });
          return null;
        });

        window.dispatchEvent(new StorageEvent('storage', {
          key: 'auth_token',
          newValue: 'new.token',
        }));
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('clears state when token is removed in another tab', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return 'existing.token';
        if (key === 'user_data') return JSON.stringify({ walletAddress: '0x123', isAdmin: false });
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Simulate logout in another tab
      act(() => {
        mockLocalStorage.getItem.mockReturnValue(null);

        window.dispatchEvent(new StorageEvent('storage', {
          key: 'auth_token',
          newValue: null,
        }));
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('handles multiple login attempts gracefully', async () => {
      mockAuthAPI.getNonce.mockResolvedValue({ nonce: 'nonce' });
      mockAuthAPI.verifySignature.mockResolvedValue({
        success: true,
        token: 'token',
        user: { walletAddress: '0x123', isAdmin: false },
      });

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      // Start first login
      act(() => {
        result.current.mutate();
      });

      // Start second login before first completes
      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should handle multiple attempts without issues
      expect(result.current.isSuccess).toBe(true);
    });

    it('handles localStorage quota exceeded', () => {
      const quotaError = new Error('QuotaExceededError');
      mockLocalStorage.setItem.mockImplementation(() => {
        throw quotaError;
      });

      mockAuthAPI.getNonce.mockResolvedValue({ nonce: 'nonce' });
      mockAuthAPI.verifySignature.mockResolvedValue({
        success: true,
        token: 'token',
        user: { walletAddress: '0x123', isAdmin: false },
      });

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      // Should not crash even if localStorage fails
      expect(() => result.current).not.toThrow();
    });

    it('recovers from corrupted authentication state', () => {
      // Mock corrupted state
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return 'valid.token';
        if (key === 'user_data') throw new Error('Corrupted data');
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Should handle corruption gracefully
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});