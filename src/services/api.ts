import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { toast } from 'sonner';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle backend connection issues
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      console.warn('Backend API not available, using mock data');
      // Return a mock response to prevent errors
      return Promise.resolve({
        data: {
          success: false,
          message: 'Backend not available',
          data: null
        },
        status: 503
      });
    }
    return Promise.reject(error);
  }
);

// Types
export interface Campaign {
  contractId: number;
  name: string;
  description: string;
  imageUrl: string;
  softCap: number;
  hardCap: number;
  ticketAmount: number;
  currentAmount: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'paused' | 'finished' | 'burned';
  participantCount: number;
  socialRequirements: {
    twitter: {
      followAccount: string;
      likePostId: string;
      retweetPostId: string;
    };
    discord: {
      serverId: string;
      inviteLink: string;
    };
    telegram: {
      groupId: string;
      inviteLink: string;
    };
    medium: {
      profileUrl: string;
    };
    newsletter: {
      endpoint: string;
    };
  };
  prizes: Array<{
    name: string;
    description: string;
    value: number;
    currency: string;
    quantity: number;
  }>;
  winners: Array<{
    walletAddress: string;
    prizeIndex: number;
    prizeName: string;
  }>;
  totalBurned: number;
  bscScanUrl: string;
  createdAt: string;
  updatedAt: string;
  daysLeft?: number;
  progressPercentage?: number;
}

export interface Participant {
  walletAddress: string;
  campaignId: string;
  socialTasksCompleted: {
    twitterFollow: boolean;
    twitterLike: boolean;
    twitterRetweet: boolean;
    discordJoined: boolean;
    telegramJoined: boolean;
    mediumFollowed: boolean;
    newsletterSubscribed: boolean;
    emailAddress: string;
  };
  stakeTxHash: string;
  ticketCount: number;
  stakedAmount: number;
  isWinner: boolean;
  prizeIndex: number;
  prizeName: string;
  joinedAt: string;
  allSocialTasksCompleted?: boolean;
  socialCompletionPercentage?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    statusCode: number;
    details?: any[];
  };
}

export interface WalletAuthRequest {
  message: string;
  signature: string;
  walletAddress: string;
}

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    // Add wallet authentication if available
    const walletAuth = localStorage.getItem('walletAuth');
    if (walletAuth) {
      try {
        const authData = JSON.parse(walletAuth);
        // Add auth data to request body for POST requests
        if (config.method === 'post' || config.method === 'put') {
          config.data = {
            ...config.data,
            ...authData,
          };
        }
      } catch (error) {
        console.error('Error parsing wallet auth:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const message = error.response?.data?.error?.message || error.message || 'Something went wrong';
    
    // Don't show toast for authentication errors (handled by components)
    if (error.response?.status !== 401) {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  getNonce: async (walletAddress: string) => {
    const response = await apiClient.get(`/auth/nonce/${walletAddress}`);
    return response.data;
  },

  verifySignature: async (authData: WalletAuthRequest) => {
    const response = await apiClient.post('/auth/verify-signature', authData);
    return response.data;
  },
};

// Campaign API
export const campaignAPI = {
  getCampaigns: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ campaigns: Campaign[]; pagination: any }> => {
    const response = await apiClient.get('/campaigns', { params });
    return response.data;
  },

  getCampaignById: async (id: number): Promise<{ campaign: Campaign }> => {
    const response = await apiClient.get(`/campaigns/${id}`);
    return response.data;
  },

  getCampaignParticipants: async (
    id: number,
    params?: { page?: number; limit?: number }
  ): Promise<{ participants: Participant[]; pagination: any }> => {
    const response = await apiClient.get(`/campaigns/${id}/participants`, { params });
    return response.data;
  },

  getCampaignWinners: async (id: number): Promise<{ winners: any[] }> => {
    const response = await apiClient.get(`/campaigns/${id}/winners`);
    return response.data;
  },

  participateInCampaign: async (
    id: number,
    data: { stakeAmount: number; stakeTxHash: string }
  ) => {
    const response = await apiClient.post(`/campaigns/${id}/participate`, data);
    return response.data;
  },

  verifySocialTask: async (
    id: number,
    data: { taskType: string; proof: string }
  ) => {
    const response = await apiClient.post(`/campaigns/${id}/verify-social`, data);
    return response.data;
  },

  getMyStatus: async (id: number) => {
    const response = await apiClient.get(`/campaigns/${id}/my-status`);
    return response.data;
  },
};

// Participant API
export const participantAPI = {
  getMyParticipations: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/participants/my-participations', { params });
    return response.data;
  },

  getMyStats: async () => {
    const response = await apiClient.get('/participants/my-stats');
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getDashboard: async () => {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  createCampaign: async (data: any) => {
    const response = await apiClient.post('/admin/campaigns', data);
    return response.data;
  },

  updateCampaign: async (id: number, data: any) => {
    const response = await apiClient.put(`/admin/campaigns/${id}`, data);
    return response.data;
  },

  uploadCampaignImage: async (id: number, data: { imageUrl: string }) => {
    const response = await apiClient.post(`/admin/campaigns/${id}/upload-image`, data);
    return response.data;
  },

  activateCampaign: async (id: number) => {
    const response = await apiClient.post(`/admin/campaigns/${id}/activate`);
    return response.data;
  },

  pauseCampaign: async (id: number) => {
    const response = await apiClient.post(`/admin/campaigns/${id}/pause`);
    return response.data;
  },

  closeCampaign: async (id: number) => {
    const response = await apiClient.post(`/admin/campaigns/${id}/close`);
    return response.data;
  },

  selectWinners: async (id: number) => {
    const response = await apiClient.post(`/admin/campaigns/${id}/select-winners`);
    return response.data;
  },

  burnTokens: async (id: number) => {
    const response = await apiClient.post(`/admin/campaigns/${id}/burn-tokens`);
    return response.data;
  },
};

// Helper function to store wallet authentication
export const storeWalletAuth = (authData: WalletAuthRequest) => {
  localStorage.setItem('walletAuth', JSON.stringify(authData));
};

// Helper function to clear wallet authentication
export const clearWalletAuth = () => {
  localStorage.removeItem('walletAuth');
};

// Helper function to get stored wallet authentication
export const getStoredWalletAuth = (): WalletAuthRequest | null => {
  try {
    const authData = localStorage.getItem('walletAuth');
    return authData ? JSON.parse(authData) : null;
  } catch (error) {
    console.error('Error parsing stored wallet auth:', error);
    return null;
  }
};

export default apiClient;