import React, { useState } from 'react';
import { Twitter, CheckCircle, XCircle, Loader2, Check } from 'lucide-react';
import { TaskComponentProps } from '../../types';

interface TwitterFollowTaskProps extends TaskComponentProps {
  task: {
    type: 'twitter_follow';
    data: { username: string };
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

export function TwitterFollowTask({ 
  task, 
  userAddress, 
  onStatusChange,
  Card,
  Button,
  Badge,
  onToast,
  backendUrl = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') + '/api',
  enableMockMode = false
}: TwitterFollowTaskProps) {
  const [status, setStatus] = useState<TaskStatus>('waiting');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasClickedFollow, setHasClickedFollow] = useState(false);
  const [tabOpenedAt, setTabOpenedAt] = useState<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (onToast) {
      onToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  };

  const handleFollowOnTwitter = () => {
    const twitterUrl = `https://twitter.com/${task.data.username}`;
    window.open(twitterUrl, '_blank', 'noopener noreferrer');
    setHasClickedFollow(true);
    setTabOpenedAt(Date.now());
    console.log('[TwitterFollowTask] User clicked Follow on Twitter button');
  };

  const handleVerifyFollow = async () => {
    if (isVerifying) return;

    console.log('[TwitterFollowTask] Starting verification for task:', task);
    console.log('[TwitterFollowTask] User address:', userAddress);
    console.log('[TwitterFollowTask] Has clicked follow button:', hasClickedFollow);

    setIsVerifying(true);
    setStatus('verifying');

    try {
      // Enforce that user opened the task in a new tab before verifying
      if (!hasClickedFollow || !tabOpenedAt) {
        showToast('Please open the task in a new tab first, then click Verify.', 'error');
        setStatus('failed');
        onStatusChange('failed');
        setIsVerifying(false);
        return;
      }
      // Optional: require a minimal dwell time (e.g., 2 seconds) before allowing verification
      if (Date.now() - tabOpenedAt < 2000) {
        await new Promise(r => setTimeout(r, 2000 - (Date.now() - tabOpenedAt)));
      }
      // Mock mode for development/testing
      if (enableMockMode) {
        console.log('[TwitterFollowTask] Mock mode - checking if user clicked follow button');
        
        if (!hasClickedFollow) {
          console.log('[TwitterFollowTask] User has not clicked follow button yet');
          showToast('Please click "Follow on Twitter" first, then verify', 'error');
          setStatus('failed');
          onStatusChange('failed');
          return;
        }
        
        console.log('[TwitterFollowTask] Mock mode - simulating success after follow button click');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
        setStatus('success');
        onStatusChange('success');
        showToast('✅ Twitter follow verified successfully! (MOCK MODE)', 'success');
        return;
      }

      const accessToken = localStorage.getItem('twitter_access_token');
      const allowTokenless = String(import.meta.env.VITE_ALLOW_TOKENLESS_SOCIAL || '').toLowerCase() === 'true';
      console.log('[TwitterFollowTask] Twitter access token found:', !!accessToken, 'allowTokenless:', allowTokenless);
      
      if (!accessToken && !allowTokenless) {
        console.log('[TwitterFollowTask] No Twitter access token found');
        showToast('You must connect your Twitter account first. Please authenticate with Twitter to verify this task.', 'error');
        setStatus('failed');
        onStatusChange('failed');
        return;
      }

      const requestBody = {
        task: {
          type: 'twitter_follow',
          data: { username: task.data.username }
        },
        userAddress
      };
      
      console.log('[TwitterFollowTask] Making request to:', `${backendUrl}/api/tasks/verify`);
      console.log('[TwitterFollowTask] Request body:', requestBody);

      const response = await fetch(`${backendUrl}/api/tasks/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[TwitterFollowTask] Response status:', response.status);

      const result = await response.json();
      console.log('[TwitterFollowTask] Response body:', result);

      if (response.ok && result.success) {
        console.log('[TwitterFollowTask] Verification successful');
        setStatus('success');
        onStatusChange('success');
        showToast('✅ Twitter follow verified successfully!', 'success');
      } else {
        console.log('[TwitterFollowTask] Verification failed:', result.message || result.error);
        setStatus('failed');
        onStatusChange('failed');
        showToast(`❌ ${result.message || result.error || 'Failed to verify Twitter follow'}`, 'error');
      }
    } catch (error) {
      console.error('[TwitterFollowTask] Error during verification:', error);
      setStatus('failed');
      onStatusChange('failed');
      showToast('❌ An error occurred while verifying the Twitter follow', 'error');
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
        return <Twitter className="w-5 h-5 text-blue-400" />;
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

  return (
    <CardComponent className="w-full max-w-md">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusIcon />
            <div>
              <h3 className="font-semibold">Follow @{task.data.username}</h3>
              <p className="text-sm text-gray-600">Follow this Twitter account to complete the task</p>
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
            onClick={handleFollowOnTwitter}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <Twitter className="w-4 h-4" />
            Follow @{task.data.username}
          </ButtonComponent>

          <ButtonComponent
            onClick={handleVerifyFollow}
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
              'Verify Follow'
            )}
          </ButtonComponent>
        </div>

        {!hasClickedFollow && (
          <p className="text-xs text-gray-500 mt-2">
            💡 Click "Follow" first, then "Verify Follow"
          </p>
        )}
      </div>
    </CardComponent>
  );
}