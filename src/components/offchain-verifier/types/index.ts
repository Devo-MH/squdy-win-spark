// Core types for off-chain task verification system
import React from 'react';

export interface Task {
  id: string;
  type: 'twitter_follow' | 'twitter_like' | 'twitter_retweet' | 'join_telegram' | 'submit_email' | 'youtube_sub' | 'discord_join' | 'join_discord' | 'visit_website' | 'blog_post' | 'defi_transaction' | 'video_creation' | 'custom' | 'text' | 'checkbox';
  label: string;
  description?: string;
  url?: string;
  required?: boolean;
  value?: string; // For Twitter handles, Telegram channels, etc.
  targetAccount?: string; // For Twitter tasks
  tweetId?: string; // For retweet tasks
  ctaUrl?: string;
  ctaLabel?: string;
  verificationUrl?: string; // Backend verification endpoint
}

export type TaskStatus = 'pending' | 'verifying' | 'completed' | 'failed';

export interface TaskVerificationRequest {
  task: {
    type: string;
    data: Record<string, any>;
  };
  userAddress: string;
}

export interface TaskVerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    verified: boolean;
    timestamp: number;
  };
}

export interface TaskDisplayInfo {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverColor: string;
}

export interface TaskComponentProps {
  task: {
    type: string;
    data: Record<string, any>;
  };
  userAddress: string;
  onStatusChange: (status: 'success' | 'failed') => void;
}

export interface TaskChecklistProps {
  tasks: Task[];
  completedTasks: string[];
  onTaskChange: (taskId: string, completed: boolean, value?: string) => void;
  campaignName?: string;
  rewardAmount?: string;
  highlightFirstIncompleteTask?: boolean;
  firstIncompleteTaskRef?: React.RefObject<HTMLDivElement>;
  campaignId?: string;
  onJoinSuccess?: (result: any) => void;
  // Configuration options
  backendUrl?: string;
  enableSimulation?: boolean;
  customTheme?: TaskTheme;
}

export interface TaskTheme {
  colors: {
    primary: string;
    success: string;
    error: string;
    warning: string;
    pending: string;
  };
  spacing: {
    cardPadding: string;
    taskGap: string;
  };
}

export interface VerificationConfig {
  backendUrl: string;
  enableMockMode: boolean;
  timeoutMs: number;
  retryAttempts: number;
}

export interface IPFSUploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUri?: string;
  error?: string;
}

export interface JoinCampaignResult {
  success: boolean;
  signature?: string;
  message?: string;
  timestamp?: string;
  nonce?: string;
  participant?: string;
  error?: string;
}