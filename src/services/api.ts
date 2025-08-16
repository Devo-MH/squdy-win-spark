import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { blockchainCampaignService } from '@/services/blockchainCampaigns';
import { toast } from 'sonner';
import { Task } from '@/components/offchain-verifier/types';

// API Configuration
const ENABLE_MOCK_FALLBACK = String(import.meta.env.VITE_ENABLE_MOCK_FALLBACK || '').toLowerCase() === 'true';
const ENABLE_CHAIN_FALLBACK_ON_404 = String(import.meta.env.VITE_CHAIN_FALLBACK_ON_404 || '').toLowerCase() === 'true';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? '/api'  // Production: Use relative path for Vercel
    : 'http://localhost:3001/api'  // Development: Use local backend
  );

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
  async (error) => {
    console.log('🚨 API Error:', error.code, error.message, error.response?.status);
    
    // If campaign detail not found, fallback to blockchain fetch (even in production)
    try {
      const url = String(error.config?.url || '');
      const detailMatch = url.match(/\/campaigns\/(\d+)$/);
      if (ENABLE_CHAIN_FALLBACK_ON_404 && error.response?.status === 404 && detailMatch) {
        const requestedId = parseInt(detailMatch[1]);
        if (Number.isFinite(requestedId) && requestedId > 0) {
          const chain = await blockchainCampaignService.getCampaignById(requestedId);
          return Promise.resolve({ data: chain, status: 200 } as any);
        }
      }
    } catch (_) {}

    // Handle network errors and provide fallback data (mock mode)
    if (ENABLE_MOCK_FALLBACK && (
        error.code === 'ERR_NETWORK' || 
        error.code === 'ECONNREFUSED' || 
        error.response?.status === 503 ||
        error.response?.status === 404
      )) {
      
      console.warn('🔄 Backend API issue, providing fallback');
      
      // For campaigns endpoint, provide mock data
      if (error.config?.url?.includes('campaigns')) {
        
        // Check if it's a single campaign request (campaigns/:id)
        const campaignIdMatch = error.config?.url?.match(/campaigns\/(\d+)$/);
        if (campaignIdMatch) {
          const requestedId = parseInt(campaignIdMatch[1]);
          
                        // Mock campaign data for individual requests - updated to match real campaigns
              const mockCampaigns = [
                {
                  id: 1,
                  contractId: 1,
                  name: "Test Campaign",
                  description: "A test campaign for development",
                  imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
                  status: "burned",
                  currentAmount: 1000,
                  hardCap: 10000,
                  participantCount: 5,
                  softCap: 500,
                  ticketAmount: 100,
                  startDate: "2025-08-04T12:10:45.817Z",
                  endDate: "2025-08-11T12:10:45.819Z",
                  prizes: [
                    { name: "First Prize", value: 1000, currency: "USD" },
                    { name: "Second Prize", value: 500, currency: "USD" }
                  ],
                  createdAt: "2025-08-04T12:10:45.819Z",
                  updatedAt: "2025-08-04T14:18:38.900Z",
                  offchainTasks: []
                },
                {
                  id: 2,
                  contractId: 2,
                  name: "Test Campaign 886",
                  description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
                  imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
                  status: "active",
                  currentAmount: 0,
                  hardCap: 50000,
                  participantCount: 0,
                  softCap: 5000,
                  ticketAmount: 100,
                  startDate: "2025-08-05T13:03",
                  endDate: "2025-08-11T13:03",
                  prizes: [
                    { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
                    { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
                    { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
                  ],
                  createdAt: "2025-08-04T13:03:45.272Z",
                  updatedAt: "2025-08-04T13:03:49.873Z",
                  offchainTasks: []
                },
                {
                  id: 3,
                  contractId: 3,
                  name: "Test Campaign 151",
                  description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
                  imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
                  status: "active",
                  currentAmount: 0,
                  hardCap: 50000,
                  participantCount: 0,
                  softCap: 5000,
                  ticketAmount: 100,
                  startDate: "2025-08-05T14:18",
                  endDate: "2025-08-11T14:18",
                  prizes: [
                    { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
                    { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
                    { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
                  ],
                  createdAt: "2025-08-04T14:18:24.870Z",
                  updatedAt: "2025-08-04T14:18:29.026Z",
                  offchainTasks: []
                },
                {
                  id: 4,
                  contractId: 4,
                  name: "Test Campaign 693",
                  description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
                  imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
                  status: "active",
                  currentAmount: 0,
                  hardCap: 50000,
                  participantCount: 0,
                  softCap: 5000,
                  ticketAmount: 100,
                  startDate: "2025-08-07T12:28",
                  endDate: "2025-08-13T12:28",
                  prizes: [
                    { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
                    { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
                    { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
                  ],
                  createdAt: "2025-08-06T12:28:41.716Z",
                  updatedAt: "2025-08-06T12:28:57.179Z",
                  offchainTasks: []
                },
                {
                  id: 5,
                  contractId: 5,
                  name: "Dina-Test Campaign 118",
                  description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
                  imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
                  status: "active",
                  currentAmount: 0,
                  hardCap: 50000,
                  participantCount: 0,
                  softCap: 5000,
                  ticketAmount: 100,
                  startDate: "2025-08-07T15:04",
                  endDate: "2025-08-13T15:04",
                  prizes: [
                    { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
                    { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
                    { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
                  ],
                  createdAt: "2025-08-06T15:05:00.262Z",
                  updatedAt: "2025-08-06T15:05:10.804Z",
                  offchainTasks: []
                }
              ];
          
          const campaign = mockCampaigns.find(c => c.id === requestedId || c.contractId === requestedId);
          if (campaign) {
            return Promise.resolve({
              data: { campaign },
              status: 200
            });
          } else {
            return Promise.resolve({
              data: { campaign: mockCampaigns[0] }, // Fallback to first campaign
              status: 200
            });
          }
        }
        
        // Check if it's a status request (campaigns/:id/my-status)
        const statusMatch = error.config?.url?.match(/campaigns\/(\d+)\/my-status$/);
        if (statusMatch) {
          return Promise.resolve({
            data: {
              isParticipating: false,
              status: 'not_participating',
              hasStaked: false,
              socialTasksCompleted: {},
              allSocialTasksCompleted: false
            },
            status: 200
          });
        }
        
                    // For campaigns list endpoint - updated to match real campaigns
            return Promise.resolve({
              data: {
                campaigns: [
                  {
                    id: 1,
                    contractId: 1,
                    name: "Test Campaign",
                    description: "A test campaign for development",
                    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
                    status: "burned",
                    currentAmount: 1000,
                    hardCap: 10000,
                    participantCount: 5,
                    softCap: 500,
                    ticketAmount: 100,
                    startDate: "2025-08-04T12:10:45.817Z",
                    endDate: "2025-08-11T12:10:45.819Z",
                    prizes: [
                      { name: "First Prize", value: 1000, currency: "USD" },
                      { name: "Second Prize", value: 500, currency: "USD" }
                    ],
                    createdAt: "2025-08-04T12:10:45.819Z",
                    updatedAt: "2025-08-04T14:18:38.900Z"
                  },
                  {
                    id: 2,
                    contractId: 2,
                    name: "Test Campaign 886",
                    description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
                    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
                    status: "active",
                    currentAmount: 0,
                    hardCap: 50000,
                    participantCount: 0,
                    softCap: 5000,
                    ticketAmount: 100,
                    startDate: "2025-08-05T13:03",
                    endDate: "2025-08-11T13:03",
                    prizes: [
                      { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
                      { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
                      { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
                    ],
                    createdAt: "2025-08-04T13:03:45.272Z",
                    updatedAt: "2025-08-04T13:03:49.873Z"
                  },
                  {
                    id: 3,
                    contractId: 3,
                    name: "Test Campaign 151",
                    description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
                    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
                    status: "active",
                    currentAmount: 0,
                    hardCap: 50000,
                    participantCount: 0,
                    softCap: 5000,
                    ticketAmount: 100,
                    startDate: "2025-08-05T14:18",
                    endDate: "2025-08-11T14:18",
                    prizes: [
                      { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
                      { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
                      { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
                    ],
                    createdAt: "2025-08-04T14:18:24.870Z",
                    updatedAt: "2025-08-04T14:18:29.026Z"
                  },
                  {
                    id: 4,
                    contractId: 4,
                    name: "Test Campaign 693",
                    description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
                    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
                    status: "active",
                    currentAmount: 0,
                    hardCap: 50000,
                    participantCount: 0,
                    softCap: 5000,
                    ticketAmount: 100,
                    startDate: "2025-08-07T12:28",
                    endDate: "2025-08-13T12:28",
                    prizes: [
                      { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
                      { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
                      { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
                    ],
                    createdAt: "2025-08-06T12:28:41.716Z",
                    updatedAt: "2025-08-06T12:28:57.179Z"
                  },
                  {
                    id: 5,
                    contractId: 5,
                    name: "Dina-Test Campaign 118",
                    description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
                    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
                    status: "active",
                    currentAmount: 0,
                    hardCap: 50000,
                    participantCount: 0,
                    softCap: 5000,
                    ticketAmount: 100,
                    startDate: "2025-08-07T15:04",
                    endDate: "2025-08-13T15:04",
                    prizes: [
                      { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
                      { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
                      { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
                    ],
                    createdAt: "2025-08-06T15:05:00.262Z",
                    updatedAt: "2025-08-06T15:05:10.804Z"
                  }
                ],
                pagination: {
                  page: 1,
                  limit: 10,
                  total: 5,
                  totalPages: 1
                }
              },
              status: 200
            });
      }
      
      // Generic fallback for other endpoints
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
  offchainTasks?: Task[];
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
    const response = await apiClient.get(`/auth?action=nonce&walletAddress=${walletAddress}`);
    return response.data;
  },

  verifySignature: async (authData: WalletAuthRequest) => {
    const response = await apiClient.post('/auth', authData);
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

  getCampaignById: async (id: number | string): Promise<{ campaign: Campaign }> => {
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

  getMyStatus: async (id: number | string) => {
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

  // Delete single campaign by id/contractId
  deleteCampaign: async (id: number | string) => {
    const response = await apiClient.delete(`/admin/campaigns/${id}`);
    return response.data;
  },

  // Bulk delete: pass ids array or set all=true
  deleteCampaigns: async (options: { ids?: Array<number|string>; all?: boolean }) => {
    if (options.all) {
      const response = await apiClient.delete(`/admin/campaigns?all=true`);
      return response.data;
    }
    const response = await apiClient.delete(`/admin/campaigns`, { data: { ids: options.ids || [] } });
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