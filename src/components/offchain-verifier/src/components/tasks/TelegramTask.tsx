import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Check, Send } from 'lucide-react';
import { TaskComponentProps } from '../../types';
import { generateQRCodeSVG } from '../../utils/qrCode';

interface TelegramTaskProps extends TaskComponentProps {
  task: {
    type: 'join_telegram';
    data: { inviteUrl: string; channelName?: string };
  };
  // UI component props - can be injected
  Card?: React.ComponentType<any>;
  Button?: React.ComponentType<any>;
  Badge?: React.ComponentType<any>;
  Dialog?: React.ComponentType<any>;
  onToast?: (message: string, type: 'success' | 'error') => void;
  backendUrl?: string;
  enableMockMode?: boolean;
  showQRCode?: boolean;
}

type TaskStatus = 'waiting' | 'verifying' | 'success' | 'failed';

// Simple Telegram Icon SVG
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.08-.65.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
);

export function TelegramTask({ 
  task, 
  userAddress, 
  onStatusChange,
  Card,
  Button,
  Badge,
  Dialog: _Dialog,
  onToast,
  backendUrl = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') + '/api',
  enableMockMode = false,
  showQRCode = true
}: TelegramTaskProps) {
  const [status, setStatus] = useState<TaskStatus>('waiting');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasClickedJoin, setHasClickedJoin] = useState(false);
  const [tabOpenedAt, setTabOpenedAt] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error') => {
    if (onToast) {
      onToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  };

  // Generate QR code for the invite URL
  React.useEffect(() => {
    if (showQRCode && task.data.inviteUrl && !qrCode) {
      try {
        const qrSvg = generateQRCodeSVG({ text: task.data.inviteUrl });
        setQrCode(qrSvg);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  }, [task.data.inviteUrl, showQRCode, qrCode]);

  const handleJoinTelegram = () => {
    console.log('[TelegramTask] User clicked Join Telegram button');
    setHasClickedJoin(true);
    
    if (task.data.inviteUrl) {
      const inviteUrl = task.data.inviteUrl;
      const inviteCode = inviteUrl?.split('/').pop();
      
      if (inviteCode) {
        // Try deep link first for mobile devices
        const deepLink = `tg://join?invite=${inviteCode}`;
        
        // Create a temporary link element to trigger the deep link
        const link = document.createElement('a');
        link.href = deepLink;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Fallback to web URL after a short delay
        setTimeout(() => {
          window.open(inviteUrl, '_blank', 'noopener noreferrer');
        }, 1000);
        setTabOpenedAt(Date.now());
        
        showToast('Opening Telegram...', 'success');
      } else {
        // Fallback to web URL
        window.open(inviteUrl, '_blank', 'noopener noreferrer');
        setTabOpenedAt(Date.now());
        showToast('Opening Telegram...', 'success');
      }
    } else {
      showToast('No Telegram invite URL provided', 'error');
    }
  };

  const handleVerifyJoin = async () => {
    if (isVerifying) return;

    console.log('[TelegramTask] Starting verification for task:', task);
    console.log('[TelegramTask] User address:', userAddress);
    console.log('[TelegramTask] Has clicked join button:', hasClickedJoin);

    setIsVerifying(true);
    setStatus('verifying');

    try {
      // Require that the task link was opened before verification
      if (!hasClickedJoin || !tabOpenedAt) {
        showToast('Please open the Telegram invite in a new tab first, then click Verify.', 'error');
        setStatus('failed');
        onStatusChange('failed');
        setIsVerifying(false);
        return;
      }
      if (Date.now() - tabOpenedAt < 2000) {
        await new Promise(r => setTimeout(r, 2000 - (Date.now() - tabOpenedAt)));
      }
      // Mock mode for development/testing
      if (enableMockMode) {
        console.log('[TelegramTask] Mock mode - checking if user clicked join button');
        
        if (!hasClickedJoin) {
          console.log('[TelegramTask] User has not clicked join button yet');
          showToast('Please click "Join Telegram" first, then verify', 'error');
          setStatus('failed');
          onStatusChange('failed');
          return;
        }
        
        console.log('[TelegramTask] Mock mode - simulating success after join button click');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
        setStatus('success');
        onStatusChange('success');
        showToast('✅ Telegram join verified successfully! (MOCK MODE)', 'success');
        return;
      }

      const accessToken = localStorage.getItem('telegram_access_token');
      const allowTokenless = String(import.meta.env.VITE_ALLOW_TOKENLESS_SOCIAL || '').toLowerCase() === 'true';
      console.log('[TelegramTask] Telegram access token found:', !!accessToken, 'allowTokenless:', allowTokenless);
      
      if (!accessToken && !allowTokenless) {
        console.log('[TelegramTask] No Telegram access token found');
        showToast('You must connect your Telegram account first. Please authenticate with Telegram to verify this task.', 'error');
        setStatus('failed');
        onStatusChange('failed');
        return;
      }

      const requestBody = {
        task: {
          type: 'join_telegram',
          data: { inviteUrl: task.data.inviteUrl, channelName: task.data.channelName }
        },
        userAddress
      };
      
      console.log('[TelegramTask] Making request to:', `${backendUrl}/api/tasks/verify`);
      console.log('[TelegramTask] Request body:', requestBody);

      const response = await fetch(`${backendUrl}/api/tasks/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[TelegramTask] Response status:', response.status);

      const result = await response.json();
      console.log('[TelegramTask] Response body:', result);

      if (response.ok && result.success) {
        console.log('[TelegramTask] Verification successful');
        setStatus('success');
        onStatusChange('success');
        showToast('✅ Telegram join verified successfully!', 'success');
      } else {
        console.log('[TelegramTask] Verification failed:', result.message || result.error);
        setStatus('failed');
        onStatusChange('failed');
        showToast(`❌ ${result.message || result.error || 'Failed to verify Telegram join'}`, 'error');
      }
    } catch (error) {
      console.error('[TelegramTask] Error during verification:', error);
      setStatus('failed');
      onStatusChange('failed');
      showToast('❌ An error occurred while verifying the Telegram join', 'error');
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
        return <TelegramIcon className="w-5 h-5 text-blue-400" />;
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

  const channelName = task.data.channelName || 'Telegram Channel';

  return (
    <CardComponent className="w-full max-w-md">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusIcon />
            <div>
              <h3 className="font-semibold">Join {channelName}</h3>
              <p className="text-sm text-gray-600">Join our Telegram channel to complete the task</p>
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
            onClick={handleJoinTelegram}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Join {channelName}
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

        {showQRCode && qrCode && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 mb-2">Scan QR code on mobile:</p>
            <div 
              className="flex justify-center"
              dangerouslySetInnerHTML={{ __html: qrCode }}
            />
          </div>
        )}

        {!hasClickedJoin && (
          <p className="text-xs text-gray-500 mt-2">
            💡 Click "Join" first, then "Verify Join"
          </p>
        )}
      </div>
    </CardComponent>
  );
}