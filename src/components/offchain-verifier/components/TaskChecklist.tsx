import React, { useState } from "react";
import { 
  CheckCircle, 
  Loader2, 
  XCircle, 
  Clock,
  MessageCircle,
  Mail,
  Send,
  Heart,
  Repeat,
  UserPlus,
  Play
} from "lucide-react";

import { Task, TaskChecklistProps, TaskStatus } from '../types';
import { TwitterFollowTask, TelegramTask, DiscordTask, EmailTask } from './tasks';

// Default UI components
const DefaultButton = ({ children, onClick, disabled, variant, className }: any) => (
  <button 
    onClick={onClick} 
    disabled={disabled} 
    className={`px-4 py-2 rounded font-medium ${
      variant === 'outline' 
        ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50' 
        : 'bg-blue-500 text-white hover:bg-blue-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
  >
    {children}
  </button>
);

const DefaultBadge = ({ children, className }: any) => (
  <span className={`px-2 py-1 text-xs rounded font-medium ${className}`}>{children}</span>
);

const DefaultCard = ({ children, className }: any) => (
  <div className={`border rounded-lg bg-white shadow-sm ${className}`}>{children}</div>
);

const DefaultProgress = ({ value, className }: any) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div 
      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${value}%` }}
    />
  </div>
);

// Status Badge Component
const StatusBadge = ({ status, className = "" }: { status: TaskStatus, className?: string }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return { icon: <Clock className="w-3 h-3" />, text: '⏳ Waiting', className: 'bg-yellow-100 text-yellow-800' };
      case 'verifying':
        return { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: '🔄 Verifying', className: 'bg-blue-100 text-blue-800' };
      case 'completed':
        return { icon: <CheckCircle className="w-3 h-3" />, text: '✅ Verified', className: 'bg-green-100 text-green-800' };
      case 'failed':
        return { icon: <XCircle className="w-3 h-3" />, text: '❌ Failed', className: 'bg-red-100 text-red-800' };
      default:
        return { icon: <Clock className="w-3 h-3" />, text: '⏳ Waiting', className: 'bg-gray-100 text-gray-800' };
    }
  };

  const { icon, text, className: badgeClass } = getStatusInfo();

  return (
    <DefaultBadge className={`${badgeClass} border-none text-xs font-medium flex items-center gap-1 ${className}`}>
      {icon}
      {text}
    </DefaultBadge>
  );
};

export function TaskChecklist({ 
  tasks, 
  completedTasks, 
  onTaskChange, 
  campaignName = "Campaign",
  rewardAmount = "100 USDC",
  highlightFirstIncompleteTask = false,
  firstIncompleteTaskRef,
  campaignId,
  onJoinSuccess,
  backendUrl = 'http://localhost:4000',
  enableSimulation = false,
  customTheme: _customTheme
}: TaskChecklistProps) {
  
  const [verificationStatus, setVerificationStatus] = useState<{ [key: string]: TaskStatus }>({});

  // Progress calculation
  const requiredTasks = tasks.filter((t) => t.required !== false);
  const completedRequired = requiredTasks.filter((t) => completedTasks.includes(t.id)).length;
  const progress = requiredTasks.length > 0 ? (completedRequired / requiredTasks.length) * 100 : 0;
  const allRequiredComplete = requiredTasks.every((t) => completedTasks.includes(t.id));

  // Find first incomplete required task
  const firstIncompleteTaskId = requiredTasks.find((t) => !completedTasks.includes(t.id))?.id;

  // Enhanced task type handling with specific icons and colors
  const getTaskDisplayInfo = (task: Task) => {
    const baseInfo = {
      icon: <CheckCircle className="w-6 h-6 text-gray-400" />,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-200",
      hoverColor: "hover:bg-gray-200"
    };

    switch (task.type) {
      case 'twitter_follow':
        return {
          ...baseInfo,
          icon: <UserPlus className="w-6 h-6 text-sky-500" />,
          color: "text-sky-600",
          bgColor: "bg-sky-100",
          borderColor: "border-sky-200",
          hoverColor: "hover:bg-sky-200"
        };
      case 'twitter_like':
        return {
          ...baseInfo,
          icon: <Heart className="w-6 h-6 text-pink-500" />,
          color: "text-pink-600",
          bgColor: "bg-pink-100",
          borderColor: "border-pink-200",
          hoverColor: "hover:bg-pink-200"
        };
      case 'twitter_retweet':
        return {
          ...baseInfo,
          icon: <Repeat className="w-6 h-6 text-green-500" />,
          color: "text-green-600",
          bgColor: "bg-green-100",
          borderColor: "border-green-200",
          hoverColor: "hover:bg-green-200"
        };
      case 'join_telegram':
        return {
          ...baseInfo,
          icon: <Send className="w-6 h-6 text-blue-500" />,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          borderColor: "border-blue-200",
          hoverColor: "hover:bg-blue-200"
        };
      case 'submit_email':
        return {
          ...baseInfo,
          icon: <Mail className="w-6 h-6 text-purple-500" />,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
          borderColor: "border-purple-200",
          hoverColor: "hover:bg-purple-200"
        };
      case 'discord_join':
        return {
          ...baseInfo,
          icon: <MessageCircle className="w-6 h-6 text-indigo-500" />,
          color: "text-indigo-600",
          bgColor: "bg-indigo-100",
          borderColor: "border-indigo-200",
          hoverColor: "hover:bg-indigo-200"
        };
      case 'youtube_sub':
        return {
          ...baseInfo,
          icon: <Play className="w-6 h-6 text-red-500" />,
          color: "text-red-600",
          bgColor: "bg-red-100",
          borderColor: "border-red-200",
          hoverColor: "hover:bg-red-200"
        };
      default:
        return baseInfo;
    }
  };

  // Handle task completion
  const handleTaskComplete = async (taskId: string, completed: boolean, value?: string) => {
    setVerificationStatus(prev => ({ ...prev, [taskId]: completed ? 'completed' : 'failed' }));
    onTaskChange(taskId, completed, value);
  };

  // Render specialized task components
  const renderTaskComponent = (task: Task) => {
    const commonProps = {
      userAddress: campaignId || 'demo-user',
      onStatusChange: (status: 'success' | 'failed') => handleTaskComplete(task.id, status === 'success'),
      Card: DefaultCard,
      Button: DefaultButton,
      Badge: DefaultBadge,
      backendUrl,
      enableMockMode: enableSimulation,
      onToast: (message: string, type: 'success' | 'error') => {
        console.log(`[TOAST ${type.toUpperCase()}] ${message}`);
      }
    };

    switch (task.type) {
      case 'twitter_follow':
        return (
          <TwitterFollowTask
            {...commonProps}
            task={{
              type: 'twitter_follow',
              data: { username: task.targetAccount || task.value || 'example' }
            }}
          />
        );
      
      case 'join_telegram':
        return (
          <TelegramTask
            {...commonProps}
            task={{
              type: 'join_telegram',
              data: { 
                inviteUrl: task.url || task.value || 'https://t.me/example',
                channelName: task.label.replace('Join ', '') || 'Telegram Channel'
              }
            }}
          />
        );
      
      case 'discord_join':
        return (
          <DiscordTask
            {...commonProps}
            task={{
              type: 'discord_join',
              data: { 
                inviteUrl: task.url || task.value || 'https://discord.gg/example',
                serverName: task.label.replace('Join ', '') || 'Discord Server'
              }
            }}
          />
        );
      
      case 'submit_email':
        return (
          <EmailTask
            {...commonProps}
            task={{
              type: 'submit_email',
              data: { requireVerification: true }
            }}
          />
        );
      
      default:
        return null;
    }
  };

  // Render generic task item for unsupported types
  const renderGenericTask = (task: Task, _index: number) => {
    const isCompleted = completedTasks.includes(task.id);
    const taskStatus = verificationStatus[task.id] || (isCompleted ? 'completed' : 'pending');
    const displayInfo = getTaskDisplayInfo(task);

    const isHighlighted = highlightFirstIncompleteTask && task.id === firstIncompleteTaskId;

    return (
      <DefaultCard
        key={task.id}
        className={`p-4 transition-all duration-200 ${
          isHighlighted ? 'ring-2 ring-blue-500 shadow-md' : ''
        } ${displayInfo.hoverColor}`}
        ref={isHighlighted ? firstIncompleteTaskRef : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${displayInfo.bgColor}`}>
              {displayInfo.icon}
            </div>
            <div className="flex-1">
              <h3 className={`font-medium ${displayInfo.color}`}>
                {task.label}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <StatusBadge status={taskStatus} />
            {!isCompleted && (
              <DefaultButton
                onClick={() => handleTaskComplete(task.id, true)}
                disabled={taskStatus === 'verifying'}
                variant="outline"
                className="text-sm"
              >
                {taskStatus === 'verifying' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Mark Complete'
                )}
              </DefaultButton>
            )}
          </div>
        </div>
      </DefaultCard>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Complete Tasks to Join {campaignName}
        </h2>
        <p className="text-gray-600">
          Complete {requiredTasks.length} required tasks to earn {rewardAmount}
        </p>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{completedRequired}/{requiredTasks.length} completed</span>
          </div>
          <DefaultProgress value={progress} />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.map((task, index) => {
          // Check if we have a specialized component for this task type
          const specializedComponent = renderTaskComponent(task);
          
          if (specializedComponent) {
            return (
              <div 
                key={task.id}
                className={highlightFirstIncompleteTask && task.id === firstIncompleteTaskId ? 'ring-2 ring-blue-500 rounded-lg' : ''}
                ref={highlightFirstIncompleteTask && task.id === firstIncompleteTaskId ? firstIncompleteTaskRef : undefined}
              >
                {specializedComponent}
              </div>
            );
          }
          
          // Fallback to generic task rendering
          return renderGenericTask(task, index);
        })}
      </div>

      {/* Join Button */}
      {allRequiredComplete && onJoinSuccess && (
        <div className="text-center pt-6">
          <DefaultButton
            onClick={() => onJoinSuccess({ campaignId, completed: true })}
            className="px-8 py-3 text-lg font-semibold"
          >
            🎉 Join Campaign & Claim Reward
          </DefaultButton>
        </div>
      )}
    </div>
  );
}