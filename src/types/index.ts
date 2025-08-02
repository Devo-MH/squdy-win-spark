export interface SocialMediaStep {
  id: string;
  type: 'follow_x' | 'like_tweet' | 'retweet' | 'join_discord' | 'join_telegram' | 'subscribe_email' | 'follow_medium';
  title: string;
  description: string;
  link: string;
  required: boolean;
  completed?: boolean;
  completedAt?: string;
}

export interface Prize {
  id: string;
  name: string;
  description: string;
  value: number;
  currency: 'USD' | 'SQUDY' | 'NFT';
  quantity: number;
  image?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  image: string;
  status: 'draft' | 'active' | 'paused' | 'finished' | 'cancelled';
  softCap: number;
  hardCap: number;
  currentAmount: number;
  ticketAmount: number;
  participants: number;
  prizes: Prize[];
  socialMediaSteps: SocialMediaStep[];
  startDate: string;
  endDate: string;
  duration: number; // in days
  createdAt: string;
  updatedAt: string;
  createdBy: string; // admin wallet address
  contractAddress?: string;
  winners?: Winner[];
  totalBurned?: number;
  winnerSelectionTx?: string;
  bscScanUrl?: string;
}

export interface Winner {
  id: string;
  walletAddress: string;
  prize: Prize;
  selectedAt: string;
  transactionHash: string;
}

export interface User {
  id: string;
  walletAddress: string;
  email?: string;
  username?: string;
  avatar?: string;
  totalStaked: number;
  totalWon: number;
  campaignsParticipated: number;
  createdAt: string;
}

export interface UserParticipation {
  id: string;
  userId: string;
  campaignId: string;
  walletAddress: string;
  stakedAmount: number;
  ticketCount: number;
  socialMediaSteps: SocialMediaStep[];
  allStepsCompleted: boolean;
  joinedAt: string;
  isWinner: boolean;
  prize?: Prize;
}

export interface AdminWallet {
  address: string;
  name: string;
  role: 'owner' | 'admin';
  isActive: boolean;
  createdAt: string;
}

export interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  blockNumber: number;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  bscScanUrl: string;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalParticipants: number;
  totalStaked: number;
  totalBurned: number;
  totalPrizesAwarded: number;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: number;
  circulatingSupply: number;
  burnedAmount: number;
  contractAddress: string;
  pancakeSwapUrl: string;
  priceUSD?: number;
  marketCap?: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CampaignFilters {
  status?: Campaign['status'];
  minTicketAmount?: number;
  maxTicketAmount?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface UserFilters {
  walletAddress?: string;
  email?: string;
  minStaked?: number;
  maxStaked?: number;
  hasWon?: boolean;
  search?: string;
} 