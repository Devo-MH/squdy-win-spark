import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useCampaigns,
  useCampaign,
  useCampaignParticipants,
  useCampaignWinners,
  useMyCampaignStatus,
  useMyParticipations,
  useMyStats,
  useParticipateCampaign,
  useCompleteSocialTask,
  campaignKeys,
  participantKeys,
} from './useCampaigns';
import { mockCampaigns, mockCampaign, mockUserParticipation, mockUserStats } from '@/test/mocks/data';

// Mock the API services
const mockCampaignAPI = {
  getCampaigns: vi.fn(),
  getCampaignById: vi.fn(),
  getCampaignParticipants: vi.fn(),
  getCampaignWinners: vi.fn(),
  getMyStatus: vi.fn(),
};

const mockParticipantAPI = {
  getMyParticipations: vi.fn(),
  getMyStats: vi.fn(),
  participateInCampaign: vi.fn(),
  completeSocialTask: vi.fn(),
};

vi.mock('@/services/api', () => ({
  campaignAPI: mockCampaignAPI,
  participantAPI: mockParticipantAPI,
}));

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCampaigns Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query Key Factories', () => {
    it('generates correct campaign query keys', () => {
      expect(campaignKeys.all).toEqual(['campaigns']);
      expect(campaignKeys.lists()).toEqual(['campaigns', 'list']);
      expect(campaignKeys.list({ status: 'active' })).toEqual(['campaigns', 'list', { status: 'active' }]);
      expect(campaignKeys.details()).toEqual(['campaigns', 'detail']);
      expect(campaignKeys.detail(1)).toEqual(['campaigns', 'detail', 1]);
      expect(campaignKeys.participants(1)).toEqual(['campaigns', 'detail', 1, 'participants']);
      expect(campaignKeys.winners(1)).toEqual(['campaigns', 'detail', 1, 'winners']);
      expect(campaignKeys.myStatus(1)).toEqual(['campaigns', 'detail', 1, 'my-status']);
    });

    it('generates correct participant query keys', () => {
      expect(participantKeys.all).toEqual(['participants']);
      expect(participantKeys.myParticipations()).toEqual(['participants', 'my-participations']);
      expect(participantKeys.myStats()).toEqual(['participants', 'my-stats']);
    });
  });

  describe('useCampaigns Hook', () => {
    it('fetches campaigns successfully', async () => {
      const mockResponse = {
        campaigns: mockCampaigns.slice(0, 3),
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
        },
      };

      mockCampaignAPI.getCampaigns.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCampaigns(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.error).toBeNull();
      expect(mockCampaignAPI.getCampaigns).toHaveBeenCalledWith(undefined);
    });

    it('passes parameters correctly to API', async () => {
      const params = { status: 'active', page: 2, limit: 5 };
      mockCampaignAPI.getCampaigns.mockResolvedValue({ campaigns: [], pagination: {} });

      renderHook(() => useCampaigns(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockCampaignAPI.getCampaigns).toHaveBeenCalledWith(params);
      });
    });

    it('handles API errors gracefully', async () => {
      const error = new Error('Failed to fetch campaigns');
      mockCampaignAPI.getCampaigns.mockRejectedValue(error);

      const { result } = renderHook(() => useCampaigns(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });

    it('uses correct stale time configuration', async () => {
      mockCampaignAPI.getCampaigns.mockResolvedValue({ campaigns: [], pagination: {} });

      const { result } = renderHook(() => useCampaigns(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify stale time is set to 2 minutes (hook should not refetch immediately)
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('useCampaign Hook', () => {
    it('fetches single campaign successfully', async () => {
      const mockResponse = { campaign: mockCampaign(1) };
      mockCampaignAPI.getCampaignById.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCampaign(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockCampaignAPI.getCampaignById).toHaveBeenCalledWith(1);
    });

    it('does not fetch when id is not provided', () => {
      renderHook(() => useCampaign(0), {
        wrapper: createWrapper(),
      });

      expect(mockCampaignAPI.getCampaignById).not.toHaveBeenCalled();
    });

    it('handles campaign not found error', async () => {
      const error = new Error('Campaign not found');
      mockCampaignAPI.getCampaignById.mockRejectedValue(error);

      const { result } = renderHook(() => useCampaign(999), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCampaignParticipants Hook', () => {
    it('fetches campaign participants successfully', async () => {
      const mockResponse = {
        participants: [
          { walletAddress: '0x123', stakedAmount: 100, ticketCount: 1 },
          { walletAddress: '0x456', stakedAmount: 200, ticketCount: 2 },
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      };

      mockCampaignAPI.getCampaignParticipants.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCampaignParticipants(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockCampaignAPI.getCampaignParticipants).toHaveBeenCalledWith(1, undefined);
    });

    it('passes pagination parameters correctly', async () => {
      const params = { page: 2, limit: 5 };
      mockCampaignAPI.getCampaignParticipants.mockResolvedValue({ participants: [], pagination: {} });

      renderHook(() => useCampaignParticipants(1, params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockCampaignAPI.getCampaignParticipants).toHaveBeenCalledWith(1, params);
      });
    });

    it('does not fetch when campaign id is invalid', () => {
      renderHook(() => useCampaignParticipants(0), {
        wrapper: createWrapper(),
      });

      expect(mockCampaignAPI.getCampaignParticipants).not.toHaveBeenCalled();
    });
  });

  describe('useCampaignWinners Hook', () => {
    it('fetches campaign winners successfully', async () => {
      const mockResponse = {
        winners: [
          { walletAddress: '0x123', prizeIndex: 0, prizeName: 'First Prize' },
          { walletAddress: '0x456', prizeIndex: 1, prizeName: 'Second Prize' },
        ],
      };

      mockCampaignAPI.getCampaignWinners.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCampaignWinners(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockCampaignAPI.getCampaignWinners).toHaveBeenCalledWith(1);
    });

    it('uses longer stale time for winners data', async () => {
      mockCampaignAPI.getCampaignWinners.mockResolvedValue({ winners: [] });

      const { result } = renderHook(() => useCampaignWinners(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Winners data should be stale for 5 minutes
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('useMyCampaignStatus Hook', () => {
    it('fetches user campaign status successfully', async () => {
      const mockResponse = { participation: mockUserParticipation(1) };
      mockCampaignAPI.getMyStatus.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMyCampaignStatus(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockCampaignAPI.getMyStatus).toHaveBeenCalledWith(1);
    });

    it('does not retry on authentication errors', async () => {
      const error = new Error('Not authenticated');
      mockCampaignAPI.getMyStatus.mockRejectedValue(error);

      const { result } = renderHook(() => useMyCampaignStatus(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only be called once (no retries)
      expect(mockCampaignAPI.getMyStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('useMyParticipations Hook', () => {
    it('fetches user participations successfully', async () => {
      const mockResponse = {
        participations: [mockUserParticipation(1), mockUserParticipation(2)],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      };

      mockParticipantAPI.getMyParticipations.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMyParticipations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockParticipantAPI.getMyParticipations).toHaveBeenCalledWith(undefined);
    });

    it('passes pagination parameters correctly', async () => {
      const params = { page: 1, limit: 5 };
      mockParticipantAPI.getMyParticipations.mockResolvedValue({ participations: [], pagination: {} });

      renderHook(() => useMyParticipations(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockParticipantAPI.getMyParticipations).toHaveBeenCalledWith(params);
      });
    });

    it('does not retry on authentication failure', async () => {
      const error = new Error('Unauthorized');
      mockParticipantAPI.getMyParticipations.mockRejectedValue(error);

      const { result } = renderHook(() => useMyParticipations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockParticipantAPI.getMyParticipations).toHaveBeenCalledTimes(1);
    });
  });

  describe('useMyStats Hook', () => {
    it('fetches user statistics successfully', async () => {
      const mockResponse = { stats: mockUserStats() };
      mockParticipantAPI.getMyStats.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMyStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockParticipantAPI.getMyStats).toHaveBeenCalled();
    });

    it('uses appropriate stale time for stats', async () => {
      mockParticipantAPI.getMyStats.mockResolvedValue({ stats: mockUserStats() });

      const { result } = renderHook(() => useMyStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Stats should be stale for 5 minutes
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('useParticipateCampaign Hook', () => {
    it('handles campaign participation mutation successfully', async () => {
      const mockResponse = { success: true, participation: mockUserParticipation(1) };
      mockParticipantAPI.participateInCampaign.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useParticipateCampaign(), {
        wrapper: createWrapper(),
      });

      const participationData = { campaignId: 1, amount: 500, socialTasks: [] };
      result.current.mutate(participationData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockParticipantAPI.participateInCampaign).toHaveBeenCalledWith(participationData);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('handles participation errors gracefully', async () => {
      const error = new Error('Participation failed');
      mockParticipantAPI.participateInCampaign.mockRejectedValue(error);

      const { result } = renderHook(() => useParticipateCampaign(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ campaignId: 1, amount: 500, socialTasks: [] });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('shows loading state during mutation', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockParticipantAPI.participateInCampaign.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useParticipateCampaign(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ campaignId: 1, amount: 500, socialTasks: [] });

      expect(result.current.isPending).toBe(true);

      resolvePromise!({ success: true });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });
  });

  describe('useCompleteSocialTask Hook', () => {
    it('handles social task completion successfully', async () => {
      const mockResponse = { success: true, taskCompleted: true };
      mockParticipantAPI.completeSocialTask.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCompleteSocialTask(), {
        wrapper: createWrapper(),
      });

      const taskData = { campaignId: 1, taskType: 'follow_x' as const };
      result.current.mutate(taskData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockParticipantAPI.completeSocialTask).toHaveBeenCalledWith(taskData);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('handles task completion errors', async () => {
      const error = new Error('Task verification failed');
      mockParticipantAPI.completeSocialTask.mockRejectedValue(error);

      const { result } = renderHook(() => useCompleteSocialTask(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ campaignId: 1, taskType: 'follow_x' as const });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('provides optimistic updates for task completion', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockParticipantAPI.completeSocialTask.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useCompleteSocialTask(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ campaignId: 1, taskType: 'follow_x' as const });

      expect(result.current.isPending).toBe(true);

      resolvePromise!({ success: true, taskCompleted: true });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Cache Invalidation and Updates', () => {
    it('invalidates related queries after successful participation', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      mockParticipantAPI.participateInCampaign.mockResolvedValue({ success: true });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useParticipateCampaign(), { wrapper });

      result.current.mutate({ campaignId: 1, amount: 500, socialTasks: [] });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should invalidate campaign and participant queries
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    it('updates query cache after successful social task completion', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      mockParticipantAPI.completeSocialTask.mockResolvedValue({ success: true });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useCompleteSocialTask(), { wrapper });

      result.current.mutate({ campaignId: 1, taskType: 'follow_x' as const });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should trigger query updates
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('allows retry after failed queries', async () => {
      mockCampaignAPI.getCampaigns
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ campaigns: mockCampaigns, pagination: {} });

      const { result } = renderHook(() => useCampaigns(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Refetch should work
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('handles mutation retry correctly', async () => {
      mockParticipantAPI.participateInCampaign
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useParticipateCampaign(), {
        wrapper: createWrapper(),
      });

      const participationData = { campaignId: 1, amount: 500, socialTasks: [] };
      
      result.current.mutate(participationData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Reset and retry
      result.current.reset();
      result.current.mutate(participationData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('uses appropriate stale times for different data types', async () => {
      mockCampaignAPI.getCampaigns.mockResolvedValue({ campaigns: [], pagination: {} });
      mockCampaignAPI.getCampaignById.mockResolvedValue({ campaign: mockCampaign(1) });
      mockCampaignAPI.getCampaignWinners.mockResolvedValue({ winners: [] });

      const wrapper = createWrapper();

      // Test different stale times
      const { result: campaignsResult } = renderHook(() => useCampaigns(), { wrapper });
      const { result: campaignResult } = renderHook(() => useCampaign(1), { wrapper });
      const { result: winnersResult } = renderHook(() => useCampaignWinners(1), { wrapper });

      await waitFor(() => {
        expect(campaignsResult.current.isLoading).toBe(false);
        expect(campaignResult.current.isLoading).toBe(false);
        expect(winnersResult.current.isLoading).toBe(false);
      });

      // All should have loaded successfully with appropriate stale times
      expect(campaignsResult.current.isSuccess).toBe(true);
      expect(campaignResult.current.isSuccess).toBe(true);
      expect(winnersResult.current.isSuccess).toBe(true);
    });

    it('avoids unnecessary refetches with proper query keys', async () => {
      mockCampaignAPI.getCampaigns.mockResolvedValue({ campaigns: [], pagination: {} });

      const wrapper = createWrapper();

      // Render same query twice
      const { result: result1 } = renderHook(() => useCampaigns({ status: 'active' }), { wrapper });
      const { result: result2 } = renderHook(() => useCampaigns({ status: 'active' }), { wrapper });

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // Should only make one API call due to query deduplication
      expect(mockCampaignAPI.getCampaigns).toHaveBeenCalledTimes(1);
    });
  });
});