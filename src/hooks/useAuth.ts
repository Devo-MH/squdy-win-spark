import { useState, useCallback, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { authAPI, storeWalletAuth, clearWalletAuth, getStoredWalletAuth } from '@/services/api';
import { toast } from 'sonner';

export interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  walletAddress: string | null;
  authError: string | null;
}

export const useAuth = () => {
  const { account, isConnected, signMessage } = useWeb3();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isAuthenticating: false,
    walletAddress: null,
    authError: null,
  });

  // Check for existing authentication on mount
  useEffect(() => {
    const checkExistingAuth = () => {
      const storedAuth = getStoredWalletAuth();
      if (storedAuth && storedAuth.walletAddress === account && isConnected) {
        setAuthState({
          isAuthenticated: true,
          isAuthenticating: false,
          walletAddress: account,
          authError: null,
        });
      } else if (!isConnected) {
        // Clear auth state if wallet is disconnected
        clearWalletAuth();
        setAuthState({
          isAuthenticated: false,
          isAuthenticating: false,
          walletAddress: null,
          authError: null,
        });
      }
    };

    checkExistingAuth();
  }, [account, isConnected]);

  const authenticate = useCallback(async () => {
    if (!account || !isConnected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setAuthState(prev => ({
      ...prev,
      isAuthenticating: true,
      authError: null,
    }));

    try {
      // Get nonce from backend
      const nonceResponse = await authAPI.getNonce(account);
      const { message, nonce, timestamp } = nonceResponse;

      // Sign the message
      const signature = await signMessage(message);

      // Verify signature with backend
      const authData = {
        message,
        signature,
        walletAddress: account,
      };

      const verifyResponse = await authAPI.verifySignature(authData);

      if (verifyResponse.verified) {
        // Store authentication data
        storeWalletAuth(authData);
        
        setAuthState({
          isAuthenticated: true,
          isAuthenticating: false,
          walletAddress: account,
          authError: null,
        });

        toast.success('Wallet authenticated successfully!');
        return true;
      } else {
        throw new Error('Signature verification failed');
      }
    } catch (error: any) {
      console.error('Authentication failed:', error);
      const errorMessage = error.message || 'Authentication failed';
      
      setAuthState(prev => ({
        ...prev,
        isAuthenticating: false,
        authError: errorMessage,
      }));

      // Don't show error toast for user rejection
      if (!error.message?.includes('User denied') && !error.code === 4001) {
        toast.error(errorMessage);
      }
      
      return false;
    }
  }, [account, isConnected, signMessage]);

  const logout = useCallback(() => {
    clearWalletAuth();
    setAuthState({
      isAuthenticated: false,
      isAuthenticating: false,
      walletAddress: null,
      authError: null,
    });
    toast.info('Logged out successfully');
  }, []);

  const requireAuth = useCallback(async () => {
    if (authState.isAuthenticated && authState.walletAddress === account) {
      return true;
    }
    
    return await authenticate();
  }, [authState.isAuthenticated, authState.walletAddress, account, authenticate]);

  return {
    ...authState,
    authenticate,
    logout,
    requireAuth,
  };
};

export default useAuth;