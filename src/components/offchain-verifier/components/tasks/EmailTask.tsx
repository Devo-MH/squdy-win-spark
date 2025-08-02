import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Check, Mail } from 'lucide-react';
import { TaskComponentProps } from '../../types';

interface EmailTaskProps extends TaskComponentProps {
  task: {
    type: 'submit_email';
    data: { requireVerification?: boolean };
  };
  // UI component props - can be injected
  Card?: React.ComponentType<any>;
  Button?: React.ComponentType<any>;
  Badge?: React.ComponentType<any>;
  Input?: React.ComponentType<any>;
  onToast?: (message: string, type: 'success' | 'error') => void;
  backendUrl?: string;
  enableMockMode?: boolean;
}

type TaskStatus = 'waiting' | 'verifying' | 'success' | 'failed';

export function EmailTask({ 
  task, 
  userAddress, 
  onStatusChange,
  Card,
  Button,
  Badge,
  Input,
  onToast,
  backendUrl = 'http://localhost:4000',
  enableMockMode = false
}: EmailTaskProps) {
  const [status, setStatus] = useState<TaskStatus>('waiting');
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    if (onToast) {
      onToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError('');
  };

  const handleVerifyEmail = async () => {
    if (isVerifying) return;

    // Validate email format
    if (!email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    console.log('[EmailTask] Starting verification for task:', task);
    console.log('[EmailTask] User address:', userAddress);
    console.log('[EmailTask] Email:', email);

    setIsVerifying(true);
    setStatus('verifying');

    try {
      // Mock mode for development/testing
      if (enableMockMode) {
        console.log('[EmailTask] Mock mode - simulating email verification');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
        setStatus('success');
        onStatusChange('success');
        showToast('✅ Email verified successfully! (MOCK MODE)', 'success');
        return;
      }

      const requestBody = {
        task: {
          type: 'submit_email',
          data: { 
            email,
            requireVerification: task.data.requireVerification || false
          }
        },
        userAddress
      };
      
      console.log('[EmailTask] Making request to:', `${backendUrl}/api/tasks/verify`);
      console.log('[EmailTask] Request body:', requestBody);

      const response = await fetch(`${backendUrl}/api/tasks/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[EmailTask] Response status:', response.status);

      const result = await response.json();
      console.log('[EmailTask] Response body:', result);

      if (response.ok && result.success) {
        console.log('[EmailTask] Verification successful');
        setStatus('success');
        onStatusChange('success');
        if (task.data.requireVerification) {
          showToast('✅ Email submitted successfully! Please check your inbox for verification.', 'success');
        } else {
          showToast('✅ Email verified successfully!', 'success');
        }
      } else {
        console.log('[EmailTask] Verification failed:', result.message || result.error);
        setStatus('failed');
        onStatusChange('failed');
        showToast(`❌ ${result.message || result.error || 'Failed to verify email'}`, 'error');
      }
    } catch (error) {
      console.error('[EmailTask] Error during verification:', error);
      setStatus('failed');
      onStatusChange('failed');
      showToast('❌ An error occurred while verifying the email', 'error');
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
        return <Mail className="w-5 h-5 text-blue-400" />;
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

  const DefaultInput = ({ value, onChange, placeholder, type, className }: any) => (
    <input 
      type={type || 'text'}
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded ${className || ''}`}
    />
  );

  const CardComponent = Card || DefaultCard;
  const ButtonComponent = Button || DefaultButton;
  const BadgeComponent = Badge || DefaultBadge;
  const InputComponent = Input || DefaultInput;

  return (
    <CardComponent className="w-full max-w-md">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusIcon />
            <div>
              <h3 className="font-semibold">Submit Email</h3>
              <p className="text-sm text-gray-600">
                {task.data.requireVerification 
                  ? 'Submit and verify your email address' 
                  : 'Submit your email address'
                }
              </p>
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
          <div>
            <InputComponent
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="your@email.com"
              className={emailError ? 'border-red-500' : ''}
            />
            {emailError && (
              <p className="text-red-500 text-xs mt-1">{emailError}</p>
            )}
          </div>

          <ButtonComponent
            onClick={handleVerifyEmail}
            disabled={isVerifying || status === 'success' || !email}
            className="w-full flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {task.data.requireVerification ? 'Submitting...' : 'Verifying...'}
              </>
            ) : status === 'success' ? (
              <>
                <Check className="w-4 h-4" />
                Verified
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                {task.data.requireVerification ? 'Submit Email' : 'Verify Email'}
              </>
            )}
          </ButtonComponent>
        </div>

        {task.data.requireVerification && (
          <p className="text-xs text-gray-500 mt-2">
            📧 You'll receive a verification email after submission
          </p>
        )}
      </div>
    </CardComponent>
  );
}