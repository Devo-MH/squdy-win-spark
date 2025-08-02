import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';

// Types
export interface Web3ContextType {
  // Connection state
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;

  // Methods
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToChain: (chainId: number) => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  
  // Network info
  networkName: string;
  isCorrectNetwork: boolean;
}

// Chain configurations
export const SUPPORTED_CHAINS = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.drpc.org',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  MAINNET: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://ethereum.drpc.org',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

// Get target chain based on environment
const TARGET_CHAIN = import.meta.env.MODE === 'production' 
  ? SUPPORTED_CHAINS.MAINNET 
  : SUPPORTED_CHAINS.SEPOLIA;

const Web3Context = createContext<Web3ContextType | null>(null);

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const networkName = chainId ? 
    Object.values(SUPPORTED_CHAINS).find(chain => chain.chainId === chainId)?.name || `Chain ${chainId}` :
    'Unknown';

  const isCorrectNetwork = chainId === TARGET_CHAIN.chainId;

  // Initialize provider and check for existing connection
  useEffect(() => {
    const initializeProvider = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);

        // Check if already connected
        try {
          const accounts = await web3Provider.listAccounts();
          if (accounts.length > 0) {
            const network = await web3Provider.getNetwork();
            // In ethers v6, accounts[0] might be an object, so we need to extract the address
            const accountAddress = typeof accounts[0] === 'string' ? accounts[0] : accounts[0].address;
            setAccount(accountAddress);
            setChainId(Number(network.chainId));
            setSigner(await web3Provider.getSigner());
            setIsConnected(true);
          }
        } catch (error) {
          console.error('Error checking existing connection:', error);
        }
      }
    };

    initializeProvider();
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          // Ensure we extract the address string properly
          const accountAddress = typeof accounts[0] === 'string' ? accounts[0] : accounts[0];
          setAccount(accountAddress);
          if (provider) {
            setSigner(provider.getSigner());
          }
        }
      };

      const handleChainChanged = (chainId: string) => {
        const newChainId = parseInt(chainId, 16);
        setChainId(newChainId);
        
        if (newChainId !== TARGET_CHAIN.chainId) {
          toast.warning(`Please switch to ${TARGET_CHAIN.name}`);
        }
      };

      const handleDisconnect = () => {
        disconnect();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
        window.ethereum?.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [provider]);

  const connect = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask to connect your wallet');
      return;
    }

    setIsConnecting(true);
    try {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const accounts = await web3Provider.listAccounts();
      const network = await web3Provider.getNetwork();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      setProvider(web3Provider);
      // In ethers v6, accounts[0] might be an object, so we need to extract the address
      const accountAddress = typeof accounts[0] === 'string' ? accounts[0] : accounts[0].address;
      setAccount(accountAddress);
      setChainId(Number(network.chainId));
      setSigner(await web3Provider.getSigner());
      setIsConnected(true);

      // Check if on correct network
      if (Number(network.chainId) !== TARGET_CHAIN.chainId) {
        toast.warning(`Please switch to ${TARGET_CHAIN.name}`);
        await switchToChain(TARGET_CHAIN.chainId);
      } else {
        toast.success('Wallet connected successfully!');
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    toast.info('Wallet disconnected');
  };

  const switchToChain = async (targetChainId: number) => {
    if (!window.ethereum || !provider) {
      toast.error('Wallet not connected');
      return;
    }

    const targetChain = Object.values(SUPPORTED_CHAINS).find(
      chain => chain.chainId === targetChainId
    );

    if (!targetChain) {
      toast.error('Unsupported network');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: targetChain.name,
                rpcUrls: [targetChain.rpcUrl],
                blockExplorerUrls: [targetChain.blockExplorer],
                nativeCurrency: targetChain.nativeCurrency,
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
          toast.error('Failed to add network to MetaMask');
        }
      } else {
        console.error('Failed to switch network:', switchError);
        toast.error('Failed to switch network');
      }
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error: any) {
      console.error('Failed to sign message:', error);
      throw new Error(error.message || 'Failed to sign message');
    }
  };

  const value: Web3ContextType = {
    provider,
    signer,
    account,
    chainId,
    isConnecting,
    isConnected,
    connect,
    disconnect,
    switchToChain,
    signMessage,
    networkName,
    isCorrectNetwork,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

// Hook for checking if MetaMask is installed
export const useMetaMask = () => {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(typeof window !== 'undefined' && !!window.ethereum);
  }, []);

  return { isInstalled };
};

// Global type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}