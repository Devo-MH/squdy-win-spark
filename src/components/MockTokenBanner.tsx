import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWeb3 } from '@/contexts/Web3Context';
import { ContractService } from '@/services/contracts';
import { toast } from 'sonner';

interface MockTokenBannerProps {
  contractService?: ContractService;
}

export const MockTokenBanner: React.FC<MockTokenBannerProps> = ({ contractService }) => {
  const { isConnected } = useWeb3();

  const handleRequestTokens = async () => {
    if (!contractService) {
      toast.error('Contract service not available');
      return;
    }

    try {
      await contractService.requestTestTokens('1000');
    } catch (error) {
      console.error('Error requesting test tokens:', error);
      toast.error('Failed to request test tokens');
    }
  };

  // Only show if connected and using mock tokens
  if (!isConnected || !contractService?.isUsingMockToken()) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧪</span>
          <div>
            <h3 className="font-semibold text-orange-800">
              Mock SQUDY Token Mode
            </h3>
            <p className="text-sm text-orange-600">
              You're using test tokens. This is for development purposes only.
            </p>
          </div>
        </div>
        <Button
          onClick={handleRequestTokens}
          variant="outline"
          size="sm"
          className="border-orange-300 text-orange-700 hover:bg-orange-100"
        >
          🎁 Get 1000 Test Tokens
        </Button>
      </div>
    </Card>
  );
};