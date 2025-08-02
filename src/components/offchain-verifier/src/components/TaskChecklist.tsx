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
  Play,
  Sparkles,
  Trophy,
  Target,
  ArrowRight,
  ExternalLink
} from "lucide-react";

import { Task, TaskChecklistProps, TaskStatus } from '../types';
import { TwitterFollowTask, TelegramTask, DiscordTask, EmailTask } from './tasks';

// Enhanced UI components with Web3 styling
const DefaultButton = ({ children, onClick, disabled, variant, className, size = "default" }: any) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    default: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl hover:scale-105",
    outline: "border border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm",
    ghost: "bg-transparent hover:bg-white/5 text-white",
    success: "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl",
    warning: "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const DefaultBadge = ({ children, className, variant = "default" }: any) => {
  const variantClasses = {
    default: "bg-white/10 border border-white/20 text-white",
    success: "bg-green-500/20 border border-green-500/30 text-green-400",
    warning: "bg-yellow-500/20 border border-yellow-500/30 text-yellow-400",
    error: "bg-red-500/20 border border-red-500/30 text-red-400",
    info: "bg-blue-500/20 border border-blue-500/30 text-blue-400"
  };
  
  return (
    <span className={`px-3 py-1 text-xs rounded-full font-medium backdrop-blur-sm ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

const DefaultCard = ({ children, className, hover = true }: any) => (
  <div className={`bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm shadow-lg transition-all duration-300 ${
    hover ? 'hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:scale-[1.02]' : ''
  } ${className}`}>
    {children}
  </div>
);

const DefaultProgress = ({ value, className }: any) => (
  <div className={`w-full bg-white/10 rounded-full h-3 overflow-hidden ${className}`}>
    <div 
      className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out relative"
      style={{ width: `${value}%` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
    </div>
  </div>
);

// Enhanced Status Badge Component
const StatusBadge = ({ status, className = "" }: { status: TaskStatus, className?: string }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return { 
          icon: <Clock className="w-3 h-3" />, 
          text: '⏳ Waiting', 
          variant: 'warning',
          className: 'animate-pulse' 
        };
      case 'verifying':
        return { 
          icon: <Loader2 className="w-3 h-3 animate-spin" />, 
          text: '🔄 Verifying', 
          variant: 'info',
          className: 'animate-pulse' 
        };
      case 'completed':
        return { 
          icon: <CheckCircle className="w-3 h-3" />, 
          text: '✅ Verified', 
          variant: 'success',
          className: 'animate-bounce' 
        };
      case 'failed':
        return { 
          icon: <XCircle className="w-3 h-3" />, 
          text: '❌ Failed', 
          variant: 'error',
          className: '' 
        };
      default:
        return { 
          icon: <Clock className="w-3 h-3" />, 
          text: '⏳ Waiting', 
          variant: 'default',
          className: '' 
        };
    }
  };

  const { icon, text, variant, className: statusClass } = getStatusInfo();

  return (
    <DefaultBadge variant={variant} className={`flex items-center gap-1.5 ${statusClass} ${className}`}>
      {icon}
      <span className="font-medium">{text}</span>
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

  // Find first incomplete task for highlighting
  const firstIncompleteTaskId = requiredTasks.find((t) => !completedTasks.includes(t.id))?.id;

  const getTaskDisplayInfo = (task: Task) => {
    const baseClasses = "w-8 h-8 flex items-center justify-center rounded-lg";
    
    switch (task.type) {
      case 'twitter_follow':
        return {
          icon: <MessageCircle className="w-5 h-5 text-blue-400" />,
          bgColor: 'bg-blue-500/20 border border-blue-500/30',
          color: 'text-blue-400',
          hoverColor: 'hover:bg-blue-500/5'
        };
      case 'join_telegram':
        return {
          icon: <Send className="w-5 h-5 text-blue-400" />,
          bgColor: 'bg-blue-500/20 border border-blue-500/30',
          color: 'text-blue-400',
          hoverColor: 'hover:bg-blue-500/5'
        };
      case 'discord_join':
        return {
          icon: <MessageCircle className="w-5 h-5 text-indigo-400" />,
          bgColor: 'bg-indigo-500/20 border border-indigo-500/30',
          color: 'text-indigo-400',
          hoverColor: 'hover:bg-indigo-500/5'
        };
      case 'submit_email':
        return {
          icon: <Mail className="w-5 h-5 text-green-400" />,
          bgColor: 'bg-green-500/20 border border-green-500/30',
          color: 'text-green-400',
          hoverColor: 'hover:bg-green-500/5'
        };
      case 'like_tweet':
        return {
          icon: <Heart className="w-5 h-5 text-pink-400" />,
          bgColor: 'bg-pink-500/20 border border-pink-500/30',
          color: 'text-pink-400',
          hoverColor: 'hover:bg-pink-500/5'
        };
      default:
        return {
          icon: <Target className="w-5 h-5 text-gray-400" />,
          bgColor: 'bg-gray-500/20 border border-gray-500/30',
          color: 'text-gray-400',
          hoverColor: 'hover:bg-gray-500/5'
        };
    }
  };

  const handleTaskComplete = async (taskId: string, completed: boolean, value?: string) => {
    setVerificationStatus(prev => ({ ...prev, [taskId]: 'verifying' }));
    
    // Simulate verification delay
    setTimeout(() => {
      setVerificationStatus(prev => ({ 
        ...prev, 
        [taskId]: completed ? 'completed' : 'failed' 
      }));
      onTaskChange(taskId, completed, value);
    }, 1500);
  };

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

  // Enhanced generic task rendering
  const renderGenericTask = (task: Task, index: number) => {
    const isCompleted = completedTasks.includes(task.id);
    const taskStatus = verificationStatus[task.id] || (isCompleted ? 'completed' : 'pending');
    const displayInfo = getTaskDisplayInfo(task);
    const isHighlighted = highlightFirstIncompleteTask && task.id === firstIncompleteTaskId;

    return (
      <DefaultCard
        key={task.id}
        className={`p-6 transition-all duration-300 ${
          isHighlighted ? 'ring-2 ring-primary shadow-2xl shadow-primary/20 scale-105' : ''
        } ${displayInfo.hoverColor}`}
        ref={isHighlighted ? firstIncompleteTaskRef : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Task Icon */}
            <div className={`p-3 rounded-xl ${displayInfo.bgColor} flex-shrink-0`}>
              {displayInfo.icon}
            </div>
            
            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className={`font-semibold text-lg ${displayInfo.color}`}>
                  {task.label}
                </h3>
                {isCompleted && (
                  <div className="flex items-center gap-1 text-green-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-medium">Completed</span>
                  </div>
                )}
              </div>
              
              {task.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {task.description}
                </p>
              )}
              
              {/* Task Hint */}
              {task.hint && !isCompleted && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <p className="text-sm text-yellow-300 font-medium">
                    💡 {task.hint}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Task Actions */}
          <div className="flex flex-col items-end gap-3 ml-4">
            <StatusBadge status={taskStatus} />
            
            {!isCompleted && (
              <DefaultButton
                onClick={() => handleTaskComplete(task.id, true)}
                disabled={taskStatus === 'verifying'}
                variant={taskStatus === 'verifying' ? 'warning' : 'primary'}
                size="sm"
                className="min-w-[120px]"
              >
                {taskStatus === 'verifying' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </>
                )}
              </DefaultButton>
            )}
            
            {isCompleted && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Task Complete!</span>
              </div>
            )}
          </div>
        </div>
      </DefaultCard>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Enhanced Progress Header */}
      <div className="text-center space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Complete Tasks to Join {campaignName}
            </h2>
          </div>
          <p className="text-lg text-muted-foreground">
            Complete <span className="font-semibold text-primary">{requiredTasks.length}</span> required tasks to earn{' '}
            <span className="font-bold text-yellow-400">{rewardAmount}</span>
          </p>
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{completedRequired}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-white font-bold">{requiredTasks.length}</span>
              <span className="text-muted-foreground">completed</span>
            </div>
          </div>
          <div className="relative">
            <DefaultProgress value={progress} className="h-4" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse rounded-full" />
          </div>
          
          {/* Progress Percentage */}
          <div className="text-center">
            <span className="text-2xl font-bold text-primary">
              {progress.toFixed(0)}%
            </span>
            <span className="text-sm text-muted-foreground ml-2">Complete</span>
          </div>
        </div>
      </div>

      {/* Enhanced Task List */}
      <div className="space-y-6">
        {tasks.map((task, index) => {
          // Check if we have a specialized component for this task type
          const specializedComponent = renderTaskComponent(task);
          
          if (specializedComponent) {
            return (
              <div 
                key={task.id}
                className={highlightFirstIncompleteTask && task.id === firstIncompleteTaskId ? 'ring-2 ring-primary rounded-xl shadow-2xl shadow-primary/20' : ''}
                ref={highlightFirstIncompleteTask && task.id === firstIncompleteTaskId ? firstIncompleteTaskRef : undefined}
              >
                {specializedComponent}
              </div>
            );
          }
          
          // Fallback to enhanced generic task rendering
          return renderGenericTask(task, index);
        })}
      </div>

      {/* Enhanced Join Button */}
      {allRequiredComplete && onJoinSuccess && (
        <div className="text-center pt-8">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Trophy className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-400">
                  🎉 All Tasks Completed!
                </h3>
                <p className="text-sm text-green-300">
                  You're ready to join the campaign and claim your reward
                </p>
              </div>
            </div>
            
            <DefaultButton
              onClick={() => onJoinSuccess({ campaignId, completed: true })}
              variant="success"
              size="lg"
              className="px-8 py-4 text-lg font-bold shadow-2xl hover:shadow-green-500/25"
            >
              <Trophy className="w-6 h-6 mr-3" />
              Join Campaign & Claim {rewardAmount}
              <ArrowRight className="w-5 h-5 ml-3" />
            </DefaultButton>
          </div>
        </div>
      )}
    </div>
  );
}