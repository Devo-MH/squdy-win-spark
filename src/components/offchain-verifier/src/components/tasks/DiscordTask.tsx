import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Check, MessageCircle } from 'lucide-react';
import { TaskComponentProps } from '../../types';

interface DiscordTaskProps extends TaskComponentProps {
  task: {
    type: 'discord_join';
    data: { inviteUrl: string; serverName?: string };
  };
  // UI component props - can be injected
  Card?: React.ComponentType<any>;
  Button?: React.ComponentType<any>;
  Badge?: React.ComponentType<any>;
  onToast?: (message: string, type: 'success' | 'error') => void;
  backendUrl?: string;
  enableMockMode?: boolean;
}

type TaskStatus = 'waiting' | 'verifying' | 'success' | 'failed';

export function DiscordTask({ 
  task, 
  userAddress, 
  onStatusChange,
  Card,
  Button,
  Badge,
  onToast,
  backendUrl = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') + '/api',
  enableMockMode = false
}: DiscordTaskProps) {
  const [status, setStatus] = useState<TaskStatus>('waiting');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasClickedJoin, setHasClickedJoin] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (onToast) {
      onToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  };

  const handleJoinDiscord = () => {
    if (task.data.inviteUrl) {
      window.open(task.data.inviteUrl, '_blank', 'noopener noreferrer');
    }
    setHasClickedJoin(true);
    console.log('[DiscordTask] User clicked Join Discord button');
  };

  const handleVerifyJoin = async () => {
    if (isVerifying) return;

    console.log('[DiscordTask] Starting verification for task:', task);
    console.log('[DiscordTask] User address:', userAddress);
    console.log('[DiscordTask] Has clicked join button:', hasClickedJoin);

    setIsVerifying(true);
    setStatus('verifying');

    try {
      // Mock mode for development/testing
      if (enableMockMode) {
        console.log('[DiscordTask] Mock mode - checking if user clicked join button');
        
        if (!hasClickedJoin) {
          console.log('[DiscordTask] User has not clicked join button yet');
          showToast('Please click "Join Discord" first, then verify', 'error');
          setStatus('failed');
          onStatusChange('failed');
          return;
        }
        
        console.log('[DiscordTask] Mock mode - simulating success after join button click');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
        setStatus('success');
        onStatusChange('success');
        showToast('✅ Discord join verified successfully! (MOCK MODE)', 'success');
        return;
      }

      const accessToken = localStorage.getItem('discord_access_token');
      const allowTokenless = String(import.meta.env.VITE_ALLOW_TOKENLESS_SOCIAL || '').toLowerCase() === 'true';
      console.log('[DiscordTask] Discord access token found:', !!accessToken, 'allowTokenless:', allowTokenless);
      
      if (!accessToken && !allowTokenless) {
        console.log('[DiscordTask] No Discord access token found');
        showToast('You must connect your Discord account first. Please authenticate with Discord to verify this task.', 'error');
        setStatus('failed');
        onStatusChange('failed');
        return;
      }

      const requestBody = {
        task: {
          type: 'discord_join',
          data: { inviteUrl: task.data.inviteUrl, serverName: task.data.serverName }
        },
        userAddress
      };
      
      console.log('[DiscordTask] Making request to:', `${backendUrl}/api/tasks/verify`);
      console.log('[DiscordTask] Request body:', requestBody);

      const response = await fetch(`${backendUrl}/api/tasks/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[DiscordTask] Response status:', response.status);

      const result = await response.json();
      console.log('[DiscordTask] Response body:', result);

      if (response.ok && result.success) {
        console.log('[DiscordTask] Verification successful');
        setStatus('success');
        onStatusChange('success');
        showToast('✅ Discord join verified successfully!', 'success');
      } else {
        console.log('[DiscordTask] Verification failed:', result.message || result.error);
        setStatus('failed');
        onStatusChange('failed');
        showToast(`❌ ${result.message || result.error || 'Failed to verify Discord join'}`, 'error');
      }
    } catch (error) {
      console.error('[DiscordTask] Error during verification:', error);
      setStatus('failed');
      onStatusChange('failed');
      showToast('❌ An error occurred while verifying the Discord join', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const StatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'verifying':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <MessageCircle className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'success':
        return 'Verified ✅';
      case 'failed':
        return 'Failed ❌';
      case 'verifying':
        return 'Verifying...';
      default:
        return 'Pending';
    }
  };

  const DefaultCard = ({ children, className }: any) => (
    <div className={`border rounded-lg p-4 ${className}`}>{children}</div>
  );

  const DefaultButton = ({ children, onClick, disabled, variant, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`px-4 py-2 rounded ${variant === 'outline' ? 'border border-gray-300' : 'bg-blue-500 text-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'} ${className}`}
    >
      {children}
    </button>
  );

  const DefaultBadge = ({ children, className }: any) => (
    <span className={`px-2 py-1 text-xs rounded ${className}`}>{children}</span>
  );

  const CardComponent = Card || DefaultCard;
  const ButtonComponent = Button || DefaultButton;
  const BadgeComponent = Badge || DefaultBadge;

  const serverName = task.data.serverName || 'Discord Server';

  return (
    <CardComponent className="w-full max-w-md">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusIcon />
            <div>
              <h3 className="font-semibold">Join {serverName}</h3>
              <p className="text-sm text-gray-600">Join our Discord server to complete the task</p>
            </div>
          </div>
          <BadgeComponent className={`
            ${status === 'success' ? 'bg-green-100 text-green-800' : ''}
            ${status === 'failed' ? 'bg-red-100 text-red-800' : ''}
            ${status === 'verifying' ? 'bg-blue-100 text-blue-800' : ''}
            ${status === 'waiting' ? 'bg-gray-100 text-gray-800' : ''}
          `}>
            {getStatusText()}
          </BadgeComponent>
        </div>

        <div className="space-y-3">
          <ButtonComponent
            onClick={handleJoinDiscord}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Join {serverName}
          </ButtonComponent>

          <ButtonComponent
            onClick={handleVerifyJoin}
            disabled={isVerifying || status === 'success'}
            className="w-full flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : status === 'success' ? (
              <>
                <Check className="w-4 h-4" />
                Verified
              </>
            ) : (
              'Verify Join'
            )}
          </ButtonComponent>
        </div>

        {!hasClickedJoin && (
          <p className="text-xs text-gray-500 mt-2">
            💡 Click "Join" first, then "Verify Join"
          </p>
        )}
      </div>
    </CardComponent>
  );
}