import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignAPI, participantAPI, Campaign, Participant } from '@/services/api';
import { toast } from 'sonner';

// Query keys
export const campaignKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  list: (filters: any) => [...campaignKeys.lists(), filters] as const,
  details: () => [...campaignKeys.all, 'detail'] as const,
  detail: (id: number) => [...campaignKeys.details(), id] as const,
  participants: (id: number) => [...campaignKeys.detail(id), 'participants'] as const,
  winners: (id: number) => [...campaignKeys.detail(id), 'winners'] as const,
  myStatus: (id: number) => [...campaignKeys.detail(id), 'my-status'] as const,
};

export const participantKeys = {
  all: ['participants'] as const,
  myParticipations: () => [...participantKeys.all, 'my-participations'] as const,
  myStats: () => [...participantKeys.all, 'my-stats'] as const,
};

// Campaign queries
export const useCampaigns = (params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: () => campaignAPI.getCampaigns(params),
    staleTime: import.meta.env.DEV ? 1000 * 10 : 1000 * 60 * 2, // 10 seconds in dev, 2 minutes in prod
    refetchOnWindowFocus: true, // Refresh when window regains focus
    refetchInterval: import.meta.env.DEV ? 1000 * 30 : false, // Auto-refresh every 30 seconds in dev
  });
};

export const useCampaign = (id: number) => {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: () => campaignAPI.getCampaignById(id),
    enabled: !!id,
    staleTime: import.meta.env.DEV ? 1000 * 5 : 1000 * 60 * 1, // 5 seconds in dev, 1 minute in prod
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });
};

export const useCampaignParticipants = (
  id: number,
  params?: { page?: number; limit?: number }
) => {
  return useQuery({
    queryKey: campaignKeys.participants(id),
    queryFn: () => campaignAPI.getCampaignParticipants(id, params),
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useCampaignWinners = (id: number) => {
  return useQuery({
    queryKey: campaignKeys.winners(id),
    queryFn: () => campaignAPI.getCampaignWinners(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes (winners don't change often)
  });
};

export const useMyCampaignStatus = (id: number) => {
  return useQuery({
    queryKey: campaignKeys.myStatus(id),
    queryFn: () => campaignAPI.getMyStatus(id),
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds
    retry: false, // Don't retry if not authenticated
  });
};

// Participant queries
export const useMyParticipations = (params?: {
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: participantKeys.myParticipations(),
    queryFn: () => participantAPI.getMyParticipations(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false,
  });
};

export const useMyStats = () => {
  return useQuery({
    queryKey: participantKeys.myStats(),
    queryFn: () => participantAPI.getMyStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
};

// Campaign mutations
export const useParticipateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      stakeAmount,
      stakeTxHash,
    }: {
      campaignId: number;
      stakeAmount: number;
      stakeTxHash: string;
    }) => campaignAPI.participateInCampaign(campaignId, { stakeAmount, stakeTxHash }),
    onSuccess: (data, variables) => {
      toast.success('Successfully joined campaign!');
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.participants(variables.campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.myStatus(variables.campaignId) });
      queryClient.invalidateQueries({ queryKey: participantKeys.myParticipations() });
      queryClient.invalidateQueries({ queryKey: participantKeys.myStats() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to join campaign';
      toast.error(message);
    },
  });
};

export const useVerifySocialTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      taskType,
      proof,
    }: {
      campaignId: number;
      taskType: string;
      proof: string;
    }) => campaignAPI.verifySocialTask(campaignId, { taskType, proof }),
    onSuccess: (data, variables) => {
      toast.success(`${variables.taskType} verified successfully!`);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: campaignKeys.myStatus(variables.campaignId) });
      queryClient.invalidateQueries({ queryKey: participantKeys.myParticipations() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to verify social task';
      toast.error(message);
    },
  });
};

// Helper functions
export const getCampaignStatusColor = (status: Campaign['status']) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-500';
    case 'active':
      return 'text-green-500';
    case 'paused':
      return 'text-orange-500';
    case 'finished':
      return 'text-blue-500';
    case 'burned':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

export const getCampaignStatusBadge = (status: Campaign['status']) => {
  switch (status) {
    case 'pending':
      return 'secondary';
    case 'active':
      return 'default';
    case 'paused':
      return 'destructive';
    case 'finished':
      return 'outline';
    case 'burned':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export const formatTimeLeft = (endDate: string): string => {
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return 'Ended';
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export const formatProgress = (current: number, target: number): number => {
  return Math.min(100, (current / target) * 100);
};