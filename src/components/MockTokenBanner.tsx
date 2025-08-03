import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWeb3 } from '@/contexts/Web3Context';
import { ContractService } from '@/services/contracts';
import { toast } from 'sonner';

interface MockTokenBannerProps {
  contractService?: ContractService;
}

export const MockTokenBanner: React.FC<MockTokenBannerProps> = ({ contractService }) => {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  const { isConnected, account } = useWeb3();
  const [balance, setBalance] = useState<string>('0');

  // Load balance when connected and contract service is available
  useEffect(() => {
    const loadBalance = async () => {
      if (!account || !contractService?.isUsingMockToken()) return;

      try {
        const currentBalance = await contractService.getTokenBalance(account);
        setBalance(currentBalance);
      } catch (error) {
        console.error('Error loading mock token balance:', error);
      }
    };

    loadBalance();
  }, [account, contractService]);

  const handleRequestTokens = async () => {
    if (!contractService) {
      toast.error('Contract service not available');
      return;
    }

    try {
      await contractService.requestTestTokens('1000');
      // Refresh balance after requesting tokens
      if (account) {
        const newBalance = await contractService.getTokenBalance(account);
        setBalance(newBalance);
      }
    } catch (error) {
      console.error('Error requesting test tokens:', error);
      toast.error('Failed to request test tokens');
    }
  };



  // Show debug info if connected but not using mock tokens
  if (isConnected && (!contractService || !contractService.isUsingMockToken())) {
    return (
      <Card className="border-blue-200 bg-blue-50 p-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          <div>
            <h3 className="font-semibold text-blue-800">Debug Info</h3>
            <p className="text-sm text-blue-600">
              Connected: {isConnected ? 'Yes' : 'No'} | 
              Contract Service: {contractService ? 'Available' : 'Not Available'} | 
              Using Mock: {contractService?.isUsingMockToken() ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Only show main banner if connected and using mock tokens
  if (!isConnected || !contractService?.isUsingMockToken()) {
    return null;
  }

  return (
    <Card className="relative bg-orange-50 text-orange-700 p-4 mb-4 rounded-lg">
      {/* Dismiss Button */}
      <button
        onClick={() => setVisible(false)}
        className="absolute top-2 right-2 text-orange-700 hover:text-orange-900"
        aria-label="Dismiss"
      >×</button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧪</span>
          <div>
            <h3 className="font-semibold text-orange-700">
              Mock SQUDY Token Mode
            </h3>
            <p className="text-sm text-orange-600">
              You have {Number(balance).toLocaleString()} mSQUDY tokens (dev only).
            </p>
          </div>
        </div>
        <Button
          onClick={handleRequestTokens}
          variant="outline"
          size="sm"
          className="border-orange-300 text-orange-700 hover:bg-orange-100 transition-shadow duration-200"
        >
          🎁 Get 1000 Test Tokens
        </Button>
      </div>
    </Card>
  );
};