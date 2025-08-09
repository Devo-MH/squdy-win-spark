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

// Enhanced UI components with modern campaign styling
const DefaultButton = ({ children, onClick, disabled, variant, className, size = "default" }: any) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-campaign-primary/50";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    default: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  const variantClasses = {
    primary: "bg-campaign-primary hover:bg-campaign-primary/90 text-white shadow-lg hover:shadow-xl hover:scale-105 glow-campaign",
    outline: "border border-border/50 bg-muted/50 hover:bg-muted/70 text-foreground backdrop-blur-sm",
    ghost: "bg-transparent hover:bg-muted/50 text-foreground",
    success: "bg-campaign-success hover:bg-campaign-success/90 text-white shadow-lg hover:shadow-xl disabled:opacity-50",
    warning: "bg-campaign-warning hover:bg-campaign-warning/90 text-white shadow-lg hover:shadow-xl"
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
    default: "bg-muted/50 border border-border/50 text-muted-foreground",
    success: "bg-campaign-success/20 border border-campaign-success/30 text-campaign-success",
    warning: "bg-campaign-warning/20 border border-campaign-warning/30 text-campaign-warning",
    error: "bg-destructive/20 border border-destructive/30 text-destructive",
    info: "bg-campaign-info/20 border border-campaign-info/30 text-campaign-info"
  };
  
  return (
    <span className={`px-3 py-1 text-xs rounded-lg font-medium transition-all duration-300 ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

const DefaultCard = ({ children, className, hover = true }: any) => (
  <div className={`bg-muted/50 border border-border/50 rounded-lg shadow-lg transition-all duration-300 ${
    hover ? 'hover:bg-muted/70 hover:scale-105 hover:shadow-neon' : ''
  } ${className}`}>
    {children}
  </div>
);

const DefaultProgress = ({ value, className }: any) => (
  <div className={`w-full bg-secondary rounded-full h-2 overflow-hidden ${className}`}>
    <div 
      className="h-full bg-gradient-campaign rounded-full transition-all duration-500 ease-out relative"
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
          text: 'Pending', 
          variant: 'warning',
          className: 'animate-pulse' 
        };
      case 'verifying':
        return { 
          icon: <Loader2 className="w-3 h-3 animate-spin" />, 
          text: 'Verifying', 
          variant: 'info',
          className: 'animate-pulse' 
        };
      case 'completed':
        return { 
          icon: <CheckCircle className="w-3 h-3" />, 
          text: 'Verified', 
          variant: 'success',
          className: 'animate-bounce' 
        };
      case 'failed':
        return { 
          icon: <XCircle className="w-3 h-3" />, 
          text: 'Failed', 
          variant: 'error',
          className: '' 
        };
      default:
        return { 
          icon: <Clock className="w-3 h-3" />, 
          text: 'Pending', 
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
  backendUrl,
  enableSimulation = false,
  customTheme: _customTheme
}: TaskChecklistProps) {
  // Resolve backend URL: default to current origin (tasks append /api/... themselves)
  const resolvedBackendUrl = backendUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  
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
          icon: <MessageCircle className="w-5 h-5 text-campaign-info" />,
          bgColor: 'bg-campaign-info/20 border border-campaign-info/30',
          color: 'text-campaign-info',
          hoverColor: 'hover:bg-campaign-info/5'
        };
      case 'join_telegram':
        return {
          icon: <Send className="w-5 h-5 text-campaign-info" />,
          bgColor: 'bg-campaign-info/20 border border-campaign-info/30',
          color: 'text-campaign-info',
          hoverColor: 'hover:bg-campaign-info/5'
        };
      case 'discord_join':
        return {
          icon: <MessageCircle className="w-5 h-5 text-campaign-secondary" />,
          bgColor: 'bg-campaign-secondary/20 border border-campaign-secondary/30',
          color: 'text-campaign-secondary',
          hoverColor: 'hover:bg-campaign-secondary/5'
        };
      case 'submit_email':
        return {
          icon: <Mail className="w-5 h-5 text-campaign-success" />,
          bgColor: 'bg-campaign-success/20 border border-campaign-success/30',
          color: 'text-campaign-success',
          hoverColor: 'hover:bg-campaign-success/5'
        };
      case 'like_tweet':
        return {
          icon: <Heart className="w-5 h-5 text-campaign-accent" />,
          bgColor: 'bg-campaign-accent/20 border border-campaign-accent/30',
          color: 'text-campaign-accent',
          hoverColor: 'hover:bg-campaign-accent/5'
        };
      default:
        return {
          icon: <Target className="w-5 h-5 text-campaign-primary" />,
          bgColor: 'bg-campaign-primary/20 border border-campaign-primary/30',
          color: 'text-campaign-primary',
          hoverColor: 'hover:bg-campaign-primary/5'
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
      userAddress: (typeof window !== 'undefined' ? (window as any).selectedWalletAddress : undefined) || campaignId || 'demo-user',
      onStatusChange: (status: 'success' | 'failed') => handleTaskComplete(task.id, status === 'success'),
      Card: DefaultCard,
      Button: DefaultButton,
      Badge: DefaultBadge,
      backendUrl: resolvedBackendUrl,
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

  // Enhanced generic task rendering with consistent sizing
  const renderGenericTask = (task: Task, index: number) => {
    const isCompleted = completedTasks.includes(task.id);
    const taskStatus = verificationStatus[task.id] || (isCompleted ? 'completed' : 'pending');
    const displayInfo = getTaskDisplayInfo(task);
    const isHighlighted = highlightFirstIncompleteTask && task.id === firstIncompleteTaskId;

    return (
      <DefaultCard
        key={task.id}
        className={`min-h-[120px] p-6 transition-all duration-300 bg-card border-border/50 ${
          isHighlighted ? 'ring-2 ring-campaign-primary shadow-2xl shadow-campaign-primary/20 scale-105' : ''
        } hover:scale-105 hover:shadow-neon`}
        ref={isHighlighted ? firstIncompleteTaskRef : undefined}
      >
        <div className="flex items-center justify-between h-full">
          {/* Left side: Icon and content */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Task Icon */}
            <div className={`p-3 rounded-lg ${displayInfo.bgColor} flex-shrink-0`}>
              {displayInfo.icon}
            </div>
            
            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">
                {task.label}
              </h3>
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Right side: Status badge, reward amount, and action button */}
          <div className="flex flex-col items-end justify-between gap-3 ml-6 flex-shrink-0 h-full py-1">
            <StatusBadge status={taskStatus} />
            
            {/* Reward amount */}
            <div className="text-right">
              <p className="text-sm font-bold text-campaign-success">+{task.reward || '10'} SQUDY</p>
              <p className="text-xs text-muted-foreground">Reward</p>
            </div>
            
            {/* Action Button */}
            {!isCompleted ? (
              <DefaultButton
                onClick={() => handleTaskComplete(task.id, true)}
                disabled={taskStatus === 'verifying'}
                variant={taskStatus === 'verifying' ? 'warning' : 'primary'}
                size="sm"
                className="min-w-[120px] transition-all duration-300"
              >
                {taskStatus === 'verifying' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Complete Task
                  </>
                )}
              </DefaultButton>
            ) : (
              <DefaultButton
                disabled
                variant="success"
                size="sm"
                className="min-w-[120px]"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Completed
              </DefaultButton>
            )}
          </div>
        </div>
      </DefaultCard>
    );
  };

  return (
    <DefaultCard className="w-full max-w-4xl mx-auto p-6 bg-gradient-secondary border-border/50 shadow-xl">
      {/* Progress Header */}
      <div className="mb-4 font-mono text-sm">
        {`[ ${Array.from({ length: tasks.length }, (_, i) => i < completedTasks.length ? '■' : '□').join('')} ] ${completedTasks.length}/${tasks.length} tasks done`}
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tasks.map((task, index) => {
          const specializedComponent = renderTaskComponent(task);
          if (specializedComponent) {
            // Specialized task wrapped in styled card
            return (
              <DefaultCard
                key={task.id}
                className={`relative task-card min-h-[180px] p-5 rounded-2xl bg-card border-border/50 flex flex-col justify-between hover:shadow-lg focus:shadow-lg transition-shadow duration-200 ${
                  highlightFirstIncompleteTask && task.id === firstIncompleteTaskId ? 'ring-2 ring-campaign-primary shadow-2xl shadow-campaign-primary/20' : ''
                }`}
                ref={highlightFirstIncompleteTask && task.id === firstIncompleteTaskId ? firstIncompleteTaskRef : undefined}
              >
                {/* Status Badge */}
                <span className={`absolute top-4 right-4 px-2 py-1 text-xs rounded-full ${
                  completedTasks.includes(task.id) ? 'bg-green-500' : 'bg-orange-500'
                } text-white`}>
                  {completedTasks.includes(task.id) ? 'Done' : 'Pending'}
                </span>
                {specializedComponent}
              </DefaultCard>
            );
          }
          return renderGenericTask(task, index);
        })}
      </div>
     
      {/* Success State */}
      {allRequiredComplete && onJoinSuccess && (
        <div className="mt-6 p-4 bg-campaign-success/10 border border-campaign-success/20 rounded-lg text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-campaign-success/20 rounded-lg">
              <Trophy className="w-8 h-8 text-campaign-success" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-campaign-success">
                🎉 All tasks completed!
              </h3>
              <p className="text-sm text-muted-foreground">
                You're ready to join the campaign and claim your reward
              </p>
            </div>
          </div>
          
          <DefaultButton
            onClick={() => onJoinSuccess({ campaignId, completed: true })}
            variant="success"
            size="lg"
            className="px-8 py-4 text-lg font-bold shadow-xl glow-campaign-lg"
          >
            <Trophy className="w-6 h-6 mr-3" />
            Join Campaign & Claim {rewardAmount}
            <ArrowRight className="w-5 h-5 ml-3" />
          </DefaultButton>
        </div>
      )}
    </DefaultCard>
  );
}