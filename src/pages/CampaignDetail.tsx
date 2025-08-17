import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Users, 
  Target, 
  Flame, 
  Trophy, 
  ExternalLink,
  Twitter,
  MessageCircle,
  BookOpen,
  Mail,
  CheckCircle,
  Clock,
  Wallet,
  AlertTriangle,
  Copy,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAuth } from "@/hooks/useAuth";
import { 
  useCampaign, 
  useMyCampaignStatus,
  useParticipateCampaign,
  useVerifySocialTask,
  formatTimeLeft,
  formatProgress,
  getCampaignStatusBadge,
  useCampaignWinners
} from "@/hooks/useCampaigns";
import { useContracts, CONTRACT_ADDRESSES } from "@/services/contracts";
import { useSocket } from "@/services/socket";
import { TaskChecklist } from "@/components/offchain-verifier";
import type { Task } from "@/components/offchain-verifier/src/types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CampaignHeader } from "@/components/campaign/CampaignHeader";
import { CampaignStats } from "@/components/campaign/CampaignStats";
import { PrizePool } from "@/components/campaign/PrizePool";
import { StakingSection } from "@/components/campaign/StakingSection";

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  
  // Validate ID parameter - handle both numeric and string IDs
  const isValidId = id && (
    (!isNaN(Number(id)) && Number(id) > 0) || // Numeric ID > 0
    (typeof id === 'string' && id.length > 0 && id !== 'unknown') // Non-empty string ID
  );
  
  const campaignId = isValidId ? (isNaN(Number(id)) ? id : Number(id)) : null;
  
  // If no valid ID, redirect to campaigns page (only once)
  useEffect(() => {
    if (id && !isValidId) {
      console.error('Invalid campaign ID:', id);
      navigate('/campaigns');
    }
  }, [id, isValidId, navigate]);
  
  // Web3 and Auth hooks
  const { account, isConnected, provider, signer, isCorrectNetwork, networkName } = useWeb3();
  const { isAuthenticated, requireAuth } = useAuth();
  
  // Contract integration
  const contractService = useContracts(provider, signer);
  const queryClient = useQueryClient();
  
  // API queries - only run if we have a valid campaign ID
  // Convert campaignId to the format expected by the API (number or string)
  const apiCampaignId = typeof campaignId === 'string' ? campaignId : (campaignId || 0);
  
  const { 
    data: campaignData, 
    isLoading: isCampaignLoading, 
    error: campaignError,
    refetch: refetchCampaign 
  } = useCampaign(apiCampaignId);
  
  const { 
    data: statusData, 
    refetch: refetchStatus 
  } = useMyCampaignStatus(apiCampaignId);

  // Winners query (by numeric contractId when available)
  const winnersId = typeof campaignId === 'number' ? campaignId : (typeof campaignData?.campaign?.contractId === 'number' ? campaignData?.campaign?.contractId : 0);
  const winnersQuery = useCampaignWinners(winnersId as number);
  
  // Mutations
  const participateMutation = useParticipateCampaign();
  const verifySocialMutation = useVerifySocialTask();
  
  // Local state
  const [stakeAmount, setStakeAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [squdyBalance, setSqudyBalance] = useState('0');
  const [allowance, setAllowance] = useState('0');
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [hasStaked, setHasStaked] = useState(false);
  const [isJoiningCampaign, setIsJoiningCampaign] = useState(false);
  const [hasJoinedLocally, setHasJoinedLocally] = useState(false);
  const [localCampaign, setLocalCampaign] = useState(campaignData?.campaign || null);
  // On-chain participation snapshot for the signed-in user
  const [myTickets, setMyTickets] = useState<number | null>(null);
  const [myStaked, setMyStaked] = useState<string | null>(null);

  // Update local campaign when data changes
  useEffect(() => {
    if (campaignData?.campaign) {
      setLocalCampaign(campaignData.campaign);
    } else if (campaignError) {
      console.error('Campaign error:', campaignError);
      toast.error('Failed to load campaign');
      navigate('/campaigns');
    }
  }, [campaignData, campaignError, navigate]);

  // Helper: refresh my on-chain participation
  const refreshMyParticipation = async () => {
    try {
      if (!contractService || !localCampaign?.contractId || !account || !isCorrectNetwork) return;
      const p = await (contractService as any).getParticipant?.(Number(localCampaign.contractId), account);
      if (p) {
        if (typeof p.ticketCount === 'number') setMyTickets(p.ticketCount);
        if (p.stakedAmount != null) setMyStaked(String(p.stakedAmount));
      }
    } catch {}
  };

  // Initial load and periodic refresh of my participation
  useEffect(() => {
    let timer: any;
    (async () => {
      await refreshMyParticipation();
      timer = setInterval(refreshMyParticipation, 15000);
    })();
    return () => { if (timer) clearInterval(timer); };
  }, [account, contractService, localCampaign?.contractId, isCorrectNetwork]);

  // On-chain refresh to reflect real-time amounts/participants/winners/burn and end time changes
  useEffect(() => {
    if (!contractService || !localCampaign?.contractId || !isCorrectNetwork) return;
    let cancelled = false;
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const refresh = async () => {
      try {
        const c = await (contractService as any).getCampaign?.(Number(localCampaign.contractId));
        if (!c || cancelled) return;
        const toNum = (v: any) => {
          try { return Number(v?.toString?.() ?? v ?? 0); } catch { return 0; }
        };
        const winnersClean = Array.isArray(c.winners) ? (c.winners as string[]).filter((w) => (w || '').toLowerCase() !== zeroAddress) : [];
        const winnersMapped = winnersClean.map((addr: string) => ({ walletAddress: addr, prizeIndex: -1, prizeName: '' }));
        setLocalCampaign(prev => prev ? ({
          ...prev,
          currentAmount: toNum(c.currentAmount ?? prev.currentAmount),
          participantCount: Math.max(0, toNum(c.participantCount ?? prev.participantCount)),
          softCap: toNum(c.softCap ?? prev.softCap),
          hardCap: toNum(c.hardCap ?? prev.hardCap),
          ticketAmount: toNum((c as any).ticketAmount ?? prev.ticketAmount),
          winners: winnersMapped.length ? winnersMapped : (prev.winners || []),
          totalBurned: toNum(c.totalBurned ?? prev.totalBurned),
          // c.endDate is already a Date from ContractService.parseCampaignData
          endDate: (() => {
            const end = (c as any).endDate instanceof Date ? (c as any).endDate : (c.endDate ? new Date(Number((c as any).endDate) * 1000) : null);
            return end ? end.toISOString() : prev.endDate;
          })(),
          startDate: (c as any).startDate instanceof Date ? (c as any).startDate : prev.startDate,
          status: typeof (c as any).status === 'string' ? (c as any).status : prev.status,
        }) : prev);
      } catch {}
    };
    refresh();
    const id = setInterval(refresh, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [contractService, localCampaign?.contractId, isCorrectNetwork]);

  // Read-only on-chain refresh for progress panel even when wallet not connected
  useEffect(() => {
    if (!localCampaign?.contractId) return;
    let stop = false;
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const run = async () => {
      try {
        const managerAddr = (import.meta as any).env?.VITE_CAMPAIGN_MANAGER_ADDRESS;
        const rpcUrl = (import.meta as any).env?.VITE_RPC_URL;
        if (!managerAddr) return;
        // Always use the configured RPC here to avoid wrong-network wallet providers during read-only refresh
        const provider = rpcUrl ? new ethers.providers.JsonRpcProvider(rpcUrl) : null;
        if (!provider) return;
        const abi = [
          'function getCampaign(uint256) view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 refundableAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock))',
          'function campaigns(uint256) view returns (uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 refundableAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock)'
        ];
        const c = new ethers.Contract(managerAddr, abi, provider);
        let r: any = null;
        try { r = await c.getCampaign(Number(localCampaign.contractId)); } catch { try { r = await c.campaigns(Number(localCampaign.contractId)); } catch {} }
        if (!r || stop) return;
        const fmt = (v: any) => {
          try { return parseFloat(ethers.utils.formatUnits(v, 18)); } catch { return Number(v?.toString?.() ?? v ?? 0); }
        };
        const toNum = (v: any) => {
          try { return Number(v?.toString?.() ?? v ?? 0); } catch { return 0; }
        };
        const winnersClean = Array.isArray(r.winners) ? (r.winners as string[]).filter((w) => (w || '').toLowerCase() !== zeroAddress) : [];
        const winnersMapped = winnersClean.map((addr: string) => ({ walletAddress: addr, prizeIndex: -1, prizeName: '' }));
        setLocalCampaign(prev => prev ? ({
          ...prev,
          currentAmount: fmt(r.currentAmount ?? prev.currentAmount),
          participantCount: Math.max(0, toNum(r.participantCount ?? prev.participantCount)),
          softCap: fmt(r.softCap ?? prev.softCap),
          hardCap: fmt(r.hardCap ?? prev.hardCap),
          ticketAmount: fmt(r.ticketAmount ?? prev.ticketAmount),
          winners: winnersMapped.length ? winnersMapped : (prev.winners || []),
          tokensAreBurned: Boolean(r.tokensAreBurned ?? (prev as any).tokensAreBurned),
          totalBurned: fmt(r.totalBurned ?? (prev as any).totalBurned),
          endDate: r.endDate ? new Date(Number((r as any).endDate) * 1000).toISOString() : prev.endDate,
        }) : prev);
      } catch {}
    };
    run();
    const handle = setInterval(run, 15000);
    return () => { stop = true; clearInterval(handle); };
  }, [localCampaign?.contractId]);

  // Reset local participation state when server data is available
  useEffect(() => {
    if (statusData?.isParticipating === true) {
      setHasJoinedLocally(false); // Reset local override since server has updated
    }
  }, [statusData?.isParticipating]);

  // Load user balance and allowance when account changes
  useEffect(() => {
    const loadWalletData = async () => {
      if (!account || !contractService || !isCorrectNetwork) return;
      
      try {
        const [balance, tokenAllowance] = await Promise.all([
          contractService.getTokenBalance(account),
          contractService.getTokenAllowance(account, CONTRACT_ADDRESSES.CAMPAIGN_MANAGER),
        ]);
        
        setSqudyBalance(balance);
        setAllowance(tokenAllowance);
      } catch (error) {
        console.error('Error loading wallet data:', error);
      }
    };

    loadWalletData();
  }, [account, contractService, isCorrectNetwork]);

  // Real-time updates
  useEffect(() => {
    if (!socket.isConnected() || !localCampaign) return;

    const handleUserStaked = (data: any) => {
      if (data.campaignId === localCampaign.contractId) {
        setLocalCampaign(prev => prev ? ({
          ...prev,
          currentAmount: prev.currentAmount + parseFloat(data.amount),
          participantCount: prev.participantCount + 1,
        }) : null);
      }
    };

    const handleWinnersSelected = (data: any) => {
      if (!localCampaign) return;
      if (String(data.campaignId) === String(localCampaign.contractId)) {
        // Refetch detail and winners
        refetchCampaign();
        winnersQuery.refetch?.();
        // Also invalidate caches to keep lists fresh
        try {
          queryClient.invalidateQueries();
        } catch {}
      }
    };

    const handleTokensBurned = (data: any) => {
      if (!localCampaign) return;
      if (String(data.campaignId) === String(localCampaign.contractId)) {
        refetchCampaign();
        winnersQuery.refetch?.();
        try {
          queryClient.invalidateQueries();
        } catch {}
      }
    };

    socket.onUserStaked(handleUserStaked);
    socket.onWinnersSelected(handleWinnersSelected);
    socket.onTokensBurned(handleTokensBurned);
    socket.joinCampaignRoom(localCampaign.contractId);

    return () => {
      socket.off('campaign:user-staked', handleUserStaked);
      socket.off('campaign:winners-selected', handleWinnersSelected);
      socket.off('campaign:tokens-burned', handleTokensBurned);
      socket.leaveCampaignRoom(localCampaign.contractId);
    };
  }, [socket, localCampaign, refetchCampaign, winnersQuery.refetch, queryClient]);

  // Helper functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard!");
  };

  const calculateTickets = (amount: string) => {
    if (!amount || !localCampaign) return 0;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return 0;
    return Math.floor(numAmount / Number(localCampaign.ticketAmount));
  };

  const handleApprove = async () => {
    if (!contractService || !stakeAmount) return;
    
    const auth = await requireAuth();
    if (!auth) return;

    setIsApproving(true);
    try {
      const tx = await contractService.approveToken(
        CONTRACT_ADDRESSES.CAMPAIGN_MANAGER,
        stakeAmount
      );
      await tx.wait();
      
      // Refresh allowance
      const newAllowance = await contractService.getTokenAllowance(
        account!,
        CONTRACT_ADDRESSES.CAMPAIGN_MANAGER
      );
      setAllowance(newAllowance);
      
      toast.success("Tokens approved successfully!");
    } catch (error: any) {
      console.error("Approval failed:", error);
      if (!error.message?.includes('User denied')) {
        toast.error("Failed to approve tokens");
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleStake = async () => {
    if (!contractService || !localCampaign || !stakeAmount) return;
    
    const auth = await requireAuth();
    if (!auth) return;

    const amount = parseFloat(stakeAmount);
    const tickets = calculateTickets(stakeAmount);
    
    if (tickets < 1) {
      toast.error(`Minimum stake is ${localCampaign.ticketAmount} SQUDY`);
      return;
    }

    if (amount > parseFloat(squdyBalance)) {
      toast.error("Insufficient SQUDY balance");
      return;
    }

    setIsStaking(true);
    try {
      const tx = await contractService.stakeTokens(localCampaign.contractId, stakeAmount);
      
      // Wait for confirmation
      await tx.wait();
      
      // Mark as staked but don't join campaign yet
      setHasStaked(true);
      setStakeAmount('');
      
      // Refresh wallet data
      const newBalance = await contractService.getTokenBalance(account!);
      setSqudyBalance(newBalance);
      // Update my on-chain snapshot
      await refreshMyParticipation();
      
      toast.success(`Successfully staked ${amount} SQUDY! Now complete the required tasks to join the campaign.`);
      
    } catch (error: any) {
      console.error("Staking failed:", error);
      if (!error.message?.includes('User denied')) {
        toast.error("Failed to stake tokens");
      }
    } finally {
      setIsStaking(false);
    }
  };

  const handleJoinCampaign = async () => {
    if (!contractService || !localCampaign || !hasStaked || !allRequiredTasksCompleted) return;
    
    const auth = await requireAuth();
    if (!auth) return;

    setIsJoiningCampaign(true);
    try {
      // Call backend to register campaign participation
      await participateMutation.mutateAsync({
        campaignId: localCampaign.contractId,
        stakeAmount: 0, // Already staked
        stakeTxHash: 'staked', // Placeholder since already staked
      } as any);
      
      // Immediately update local state to reflect participation
      setHasJoinedLocally(true);
      refetchStatus();
      await refreshMyParticipation();
      toast.success("🎉 Successfully joined the campaign! Good luck!");
      
    } catch (error: any) {
      console.error("Joining campaign failed:", error);
      toast.error("Failed to join campaign. Please try again.");
    } finally {
      setIsJoiningCampaign(false);
    }
  };

  const handleSocialTask = async (taskType: string, proof: string) => {
    const auth = await requireAuth();
    if (!auth || !localCampaign) return;

    try {
      await verifySocialMutation.mutateAsync({
        campaignId: localCampaign.contractId,
        taskType,
        proof,
      });
      refetchStatus();
    } catch (error) {
      console.error("Social task verification failed:", error);
    }
  };

  // Derived values - only calculate if localCampaign exists
  const progress = localCampaign ? formatProgress(localCampaign.currentAmount, localCampaign.hardCap) : 0;
  const totalStakedDisplay = localCampaign ? Number(localCampaign.currentAmount || 0) : 0;
  const nowTs = Date.now();
  const toMs = (v: any): number => {
    try {
      if (v instanceof Date) return v.getTime();
      if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
      if (typeof v === 'string') {
        const n = Number(v);
        if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
        const d = new Date(v);
        return d.getTime();
      }
      const d = new Date(v);
      return d.getTime();
    } catch { return 0; }
  };
  const startTs = localCampaign ? toMs(localCampaign.startDate as any) : 0;
  const endTs = localCampaign ? toMs(localCampaign.endDate as any) : 0;
  const hasStarted = localCampaign ? nowTs >= startTs : false;
  const hasEnded = localCampaign ? nowTs > endTs : false;
  // Gate strictly by time and on-chain status; this prevents join after end or burn
  const isJoinOpen = hasStarted && !hasEnded && (localCampaign?.status !== 'finished' && localCampaign?.status !== 'burned');
  const isFinished = (localCampaign?.status === 'finished' || hasEnded || localCampaign?.status === 'burned');
  const timeLeft = localCampaign ? formatTimeLeft(localCampaign.endDate as any) : '';
  const startsIn = localCampaign ? formatTimeLeft(localCampaign.startDate as any) : '';
  const derivedStatus: string = !hasStarted
    ? 'pending'
    : (localCampaign?.totalBurned && Number(localCampaign.totalBurned) > 0) || localCampaign?.status === 'burned'
      ? 'burned'
      : hasEnded
        ? 'finished'
        : 'active';
  const ticketsFromStake = calculateTickets(stakeAmount);
  const hasAllowance = parseFloat(allowance) >= parseFloat(stakeAmount || '0');
  const userStatus = statusData?.status;
  const isParticipating = statusData?.joined || statusData?.isParticipating || hasJoinedLocally;
  
  // Campaign tasks from admin configuration
  const campaignTasks: Task[] = localCampaign?.offchainTasks || [];

  const requiredTasks = campaignTasks.filter(task => task.required);
  const allRequiredTasksCompleted = requiredTasks.every(task => 
    completedTasks.includes(task.id)
  );

  // Participation flow states
  const canJoinCampaign = hasStaked && allRequiredTasksCompleted && !isParticipating;
  const showTasksSection = hasStaked && !isParticipating;
  const showJoinButton = canJoinCampaign && !hasEnded;

  // Task handlers
  const handleTaskChange = (taskId: string, completed: boolean, value?: string) => {
    console.log('Task change:', { taskId, completed, value });
    
    if (completed) {
      setCompletedTasks(prev => [...prev.filter(id => id !== taskId), taskId]);

      // Also notify backend to record social task completion (no OAuth required)
      try {
        const task = campaignTasks.find(t => t.id === taskId);
        if (task && localCampaign) {
          // Map UI task types to backend types if needed
          const backendType = task.type;
          handleSocialTask(backendType, 'completed');
        }
      } catch (err) {
        console.warn('Failed to notify backend for task completion', err);
      }
    } else {
      setCompletedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  // Early returns for error states
  if (!id || !isValidId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
        <Header />
        <div className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">Invalid Campaign</h1>
              <p className="text-muted-foreground mb-6">The campaign ID is not valid.</p>
              <Button onClick={() => navigate('/campaigns')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Campaigns
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (campaignError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
        <Header />
        <div className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">Campaign Not Found</h1>
              <p className="text-muted-foreground mb-6">
                The campaign could not be loaded. It may have been deleted or the ID is incorrect.
              </p>
              <Button onClick={() => navigate('/campaigns')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Campaigns
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (isCampaignLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
        <Header />
        <div className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading campaign...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <Header />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Winners block will render after the campaign header */}

          {/* Loading State */}
          {(isCampaignLoading || !localCampaign) && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <Skeleton className="w-full aspect-video rounded-xl" />
              </div>
            </div>
          )}

          {/* Error State */}
          {campaignError && (
            <Card className="bg-red-500/10 border-red-500/20">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-400 mb-2">Campaign Not Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The campaign you're looking for doesn't exist or has been removed.
                </p>
                <Button onClick={() => navigate('/campaigns')}>
                  Browse Campaigns
                    </Button>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          {localCampaign && !isCampaignLoading && !campaignError && (
            <>
              {/* Modern Campaign Header */}
              <div className="mb-12">
                  <CampaignHeader
                  title={localCampaign.name}
                  description={localCampaign.description}
                    status={derivedStatus}
                    timeLeft={timeLeft}
                  onBack={() => navigate(-1)}
                  onJoin={handleJoinCampaign}
                    isActive={isJoinOpen}
                    hasStarted={hasStarted}
                    startsIn={startsIn}
                  imageUrl={localCampaign.imageUrl || 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=600&fit=crop&crop=center'}
                />
              </div>

              {/* Winners block under header */}
              {derivedStatus !== 'active' && ((winnersQuery.data?.winners?.length || 0) > 0 || (Array.isArray(localCampaign?.winners) && (localCampaign!.winners as any[]).length > 0)) ? (
                <div className="mb-10">
                  <Card className="gradient-card border border-campaign-success/40 shadow-neon max-w-5xl mx-auto text-center">
                    <CardHeader>
                      <CardTitle>
                        <div className="flex items-center justify-center gap-3">
                          <div className="p-3 bg-campaign-success/20 border border-campaign-success/40 rounded-lg">
                            <Trophy className="w-6 h-6 text-campaign-success" />
                          </div>
                          <span className="text-foreground text-2xl font-bold tracking-wide">Winners</span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {winnersQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading winners…</p>
                      ) : (winnersQuery.data?.winners?.length ? (
                        <ul className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3">
                          {winnersQuery.data.winners.map((w: any, idx: number) => {
                            const addr = w.walletAddress || w.winner || '0x…';
                            const prize = w.prizeName || (typeof w.prizeIndex === 'number' ? `Prize #${w.prizeIndex + 1}` : '');
                            return (
                              <li
                                key={idx}
                                className="group inline-flex items-center justify-center px-6 py-3 rounded-md bg-campaign-success/10 border border-campaign-success/30 hover:border-campaign-success/60 hover:bg-campaign-success/15 transition-all duration-300 shadow-sm backdrop-blur-sm text-center"
                                style={{ animationDelay: `${idx * 80}ms` }}
                              >
                                <div className="flex items-center justify-center gap-3">
                                  <span className="font-mono text-sm text-campaign-success break-all">{addr}</span>
                                  {prize && <span className="text-xs text-muted-foreground">— {prize}</span>}
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => copyToClipboard(addr)}>
                                    <Copy className="w-3 h-3 mr-1" /> Copy
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={async () => {
                                    let chainIdHex: string | null = null;
                                    try { chainIdHex = await (window as any).ethereum?.request?.({ method: 'eth_chainId' }); } catch {}
                                    const chainId = chainIdHex ? parseInt(chainIdHex, 16) : Number(import.meta.env.VITE_CHAIN_ID || 56);
                                    const base = chainId === 56 ? 'https://bscscan.com' : (chainId === 1 ? 'https://etherscan.io' : 'https://sepolia.etherscan.io');
                                    window.open(`${base}/address/${addr}`,'_blank');
                                  }}>
                                    <ExternalLink className="w-3 h-3 mr-1" /> View
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <ul className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3">
                          {(localCampaign!.winners as any[]).map((addr: any, idx: number) => (
                            <li
                              key={idx}
                              className="group inline-flex items-center justify-center px-6 py-3 rounded-md bg-campaign-success/10 border border-campaign-success/30 hover:border-campaign-success/60 hover:bg-campaign-success/15 transition-all duration-300 shadow-sm backdrop-blur-sm text-center"
                              style={{ animationDelay: `${idx * 80}ms` }}
                            >
                              <div className="flex items-center justify-center gap-3">
                                <span className="font-mono text-sm text-campaign-success break-all">{String(addr)}</span>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => copyToClipboard(String(addr))}>
                                  <Copy className="w-3 h-3 mr-1" /> Copy
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={async () => {
                                  let chainIdHex: string | null = null;
                                  try { chainIdHex = await (window as any).ethereum?.request?.({ method: 'eth_chainId' }); } catch {}
                                  const chainId = chainIdHex ? parseInt(chainIdHex, 16) : Number(import.meta.env.VITE_CHAIN_ID || 56);
                                  const base = chainId === 56 ? 'https://bscscan.com' : (chainId === 1 ? 'https://etherscan.io' : 'https://sepolia.etherscan.io');
                                  window.open(`${base}/address/${String(addr)}`,'_blank');
                                }}>
                                  <ExternalLink className="w-3 h-3 mr-1" /> View
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {/* Campaign Statistics */}
              <div className="mb-12">
                <CampaignStats
                  currentAmount={Number(localCampaign.currentAmount)}
                  hardCap={Number(localCampaign.hardCap)}
                  softCap={Number(localCampaign.softCap)}
                  participantCount={localCampaign.participantCount}
                  timeLeft={timeLeft}
                  ticketAmount={Number(localCampaign.ticketAmount)}
                  hideProgress={derivedStatus === 'burned'}
                />
          </div>

              {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area - Participation Flow */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Staking Section */}
                  {isConnected && !isParticipating && isJoinOpen && (
                    <div id="staking">
                      <StakingSection
                      squdyBalance={squdyBalance}
                      stakeAmount={stakeAmount}
                      onStakeAmountChange={setStakeAmount}
                      ticketsFromStake={ticketsFromStake}
                      ticketAmount={Number(localCampaign.ticketAmount)}
                      isApproving={isApproving}
                      isStaking={isStaking}
                      hasAllowance={hasAllowance}
                      hasStaked={hasStaked}
                      onApprove={handleApprove}
                      onStake={handleStake}
                      />
                    </div>
                  )}

                  {/* Debug Info panel removed */}

                  {/* Fallback Staking Section for Mobile - Always show if not participating */}
                  {!isParticipating && !isConnected && (
                    <Card className="bg-orange-500/10 border-orange-500/20 md:hidden">
                      <CardContent className="p-6 text-center">
                        <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg w-fit mx-auto mb-4">
                          <AlertTriangle className="w-6 h-6 text-orange-500" />
                  </div>
                        <h3 className="text-lg font-semibold text-orange-600 mb-2">Connect Wallet to Stake</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Please connect your wallet to stake SQUDY tokens and participate in this campaign.
                        </p>
                        <Button onClick={() => window.location.reload()} variant="outline">
                          Connect Wallet
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tasks Section - Only show when user has staked */}
                  {campaignTasks.length > 0 && showTasksSection && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-campaign-secondary/20 border border-campaign-secondary/30 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-campaign-secondary" />
                    </div>
                        <h3 className="text-xl font-semibold text-foreground">
                          Complete Required Tasks
                        </h3>
                    </div>
                      <p className="text-sm text-muted-foreground pl-12">
                        Complete all required offchain tasks to join the campaign.
                      </p>
                      {/* Control simulation via env flag */}
                      <TaskChecklist
                        tasks={campaignTasks}
                        completedTasks={completedTasks}
                        onTaskChange={handleTaskChange}
                        campaignName={localCampaign.name}
                        campaignId={String(localCampaign.contractId)}
                        enableSimulation={String(import.meta.env.VITE_ENABLE_MOCK_FALLBACK || '').toLowerCase() === 'true'}
                        highlightFirstIncompleteTask={true}
                      />
                    </div>
                  )}

                  {/* Join Campaign Button */}
                  {showJoinButton && (
                    <Card className="gradient-card border border-campaign-success/20 shadow-xl">
                      <CardContent className="p-8 text-center">
                        <div className="space-y-6">
                          <div className="inline-flex items-center justify-center w-16 h-16 bg-campaign-success/20 border border-campaign-success/30 rounded-full">
                            <Trophy className="w-8 h-8 text-campaign-success" />
                  </div>
                          
                          <div>
                            <h3 className="text-xl font-bold text-campaign-success mb-2">
                              🎉 Ready to Join!
                            </h3>
                            <p className="text-muted-foreground">
                              All requirements completed. Join the campaign and compete for amazing prizes!
                            </p>
                          </div>

                          <Button 
                            onClick={handleJoinCampaign}
                            disabled={isJoiningCampaign || !canJoinCampaign}
                            className="w-full h-12 bg-gradient-to-r from-campaign-success to-campaign-success/80 hover:from-campaign-success/90 hover:to-campaign-success text-white font-semibold shadow-xl glow-campaign-lg transition-all duration-300"
                            size="lg"
                          >
                            {isJoiningCampaign ? (
                              <>
                                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                Joining Campaign...
                              </>
                            ) : (
                              <>
                                <Trophy className="w-6 h-6 mr-2" />
                                Join Campaign & Compete for Prizes
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Connection Status for Non-Connected Users */}
                  {!isConnected && (
                    <Card className="gradient-card border border-border/50 shadow-xl hidden md:block">
                      <CardContent className="p-8 text-center">
                        <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-foreground mb-2">Connect Your Wallet</h3>
                        <p className="text-muted-foreground mb-6">
                          Connect your wallet to participate in this campaign and stake SQUDY tokens.
                        </p>
                        <Button 
                          variant="outline" 
                          size="lg"
                          className="border-campaign-primary/30 bg-campaign-primary/10 hover:bg-campaign-primary/20 text-campaign-primary"
                          onClick={() => window.open('https://pancakeswap.finance/swap?outputCurrency=0xbcac31281cd38f0150ea506c001e6d0ba902669f&chain=bsc', '_blank')}
                        >
                          <ExternalLink className="w-5 h-5 mr-2" />
                          Get SQUDY Tokens
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Participation Success */}
                  {isParticipating && (
                    <Card className="gradient-card border border-campaign-success/20 shadow-xl">
                      <CardContent className="p-8 text-center">
                        <CheckCircle2 className="w-16 h-16 text-campaign-success mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-campaign-success mb-2">
                          🎉 You're Participating!
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          You've successfully joined this campaign. Good luck in the draw!
                        </p>
                        <div className="bg-campaign-success/5 border border-campaign-success/20 rounded-xl p-4">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold text-campaign-success">
                                {myTickets ?? userStatus?.ticketCount ?? 0}
                              </p>
                              <p className="text-sm text-muted-foreground">Tickets</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-campaign-success">
                                {myStaked ?? userStatus?.stakedAmount ?? 0}
                              </p>
                              <p className="text-sm text-muted-foreground">SQUDY Staked</p>
                            </div>
                          </div>
                        </div>
                </CardContent>
              </Card>
                  )}


            </div>

                {/* Right Column - Prize Pool & Campaign Info */}
            <div className="space-y-6">
              {/* Prize Pool */}
                  <PrizePool 
                    prizes={localCampaign.prizes} 
                    winners={(winnersQuery.data?.winners?.length ? winnersQuery.data.winners : (localCampaign!.winners as any[]) || []) as any}
                    showWinners={derivedStatus !== 'active'}
                  />
                  {/* Winners Panel removed as requested */}
                  
                  {/* Campaign Details card removed per request */}

                  {/* Token Burn / Warning */}
                  <Card className="gradient-card border border-campaign-warning/20 shadow-xl">
                    <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                        <div className="p-3 bg-campaign-warning/20 border border-campaign-warning/30 rounded-lg flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-campaign-warning" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-campaign-warning mb-2">🔥 Token Burn</h4>
                          <p className="text-sm text-campaign-warning/80 leading-relaxed">
                            All staked SQUDY tokens are burned after the campaign. This creates scarcity and 
                            adds value to the ecosystem.
                          </p>
                          <div className="mt-3 p-3 bg-campaign-warning/5 border border-campaign-warning/20 rounded-lg">
                            <p className="text-xs text-campaign-warning/70">
                              💡 <strong>Why Burn?</strong> Token burning reduces supply, potentially increasing 
                              value for remaining token holders while funding amazing prizes.
                            </p>
                          </div>
                          {(localCampaign.status === 'burned' || Number(localCampaign.totalBurned || 0) > 0) && (
                            <div className="mt-3">
                              <div className="flex items-center gap-2 text-sm bg-red-500/10 p-3 rounded border border-red-500/20">
                                <Flame className="w-4 h-4 text-red-500" />
                                <span className="text-red-400 font-medium">
                                  {Number(localCampaign.totalBurned || 0).toLocaleString()} SQUDY burned
                                </span>
                              </div>
                            </div>
                          )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CampaignDetail;