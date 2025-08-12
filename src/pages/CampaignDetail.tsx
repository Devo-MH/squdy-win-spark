import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
  getCampaignStatusBadge
} from "@/hooks/useCampaigns";
import { useContracts, CONTRACT_ADDRESSES } from "@/services/contracts";
import { useSocket } from "@/services/socket";
import { MockTokenBanner } from "@/components/MockTokenBanner";
// Import directly to avoid re-export cycles from the package index
import { TaskChecklist } from "@/components/offchain-verifier/src/components/TaskChecklist";
import { Task } from "@/components/offchain-verifier/src/types";
import { toast } from "sonner";
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
  const { account, isConnected, provider, signer } = useWeb3();
  const { isAuthenticated, requireAuth } = useAuth();
  
  // Contract integration
  const contractService = useContracts(provider, signer);
  
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

  // Periodic refetch while campaign is active or just ended
  useEffect(() => {
    if (!localCampaign) return;
    const shouldPoll = localCampaign.status === 'active' || localCampaign.status === 'finished' || localCampaign.status === 'pending';
    if (!shouldPoll) return;
    const interval = setInterval(() => {
      refetchCampaign();
      refetchStatus();
    }, 7000);
    return () => clearInterval(interval);
  }, [localCampaign?.status, refetchCampaign, refetchStatus]);
  
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

  // Reset local participation state when server data is available
  useEffect(() => {
    if (statusData?.isParticipating === true) {
      setHasJoinedLocally(false); // Reset local override since server has updated
    }
  }, [statusData?.isParticipating]);

  // Load user balance and allowance when account changes
  useEffect(() => {
    const loadWalletData = async () => {
      if (!account || !contractService) return;
      
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
  }, [account, contractService]);

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

    socket.onUserStaked(handleUserStaked);
    socket.joinCampaignRoom(localCampaign.contractId);

    return () => {
      socket.off('campaign:user-staked', handleUserStaked);
      socket.leaveCampaignRoom(localCampaign.contractId);
    };
  }, [socket, localCampaign]);

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
      
      // Refresh wallet + campaign state
      const newBalance = await contractService.getTokenBalance(account!);
      setSqudyBalance(newBalance);
      refetchCampaign();
      refetchStatus();
      
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
        socialTasks: completedTasks.reduce((acc, taskId) => {
          const task = campaignTasks.find(t => t.id === taskId);
          if (task) {
            acc[taskId] = { completed: true, type: task.type };
          }
          return acc;
        }, {} as Record<string, any>),
      });
      
      // Immediately update local state to reflect participation
      setHasJoinedLocally(true);
      refetchStatus();
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
  const isActive = localCampaign?.status === "active";
  const isFinished = localCampaign?.status === "finished" || localCampaign?.status === "burned";
  const timeLeft = localCampaign ? formatTimeLeft(localCampaign.endDate) : '';
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
  const showJoinButton = canJoinCampaign;

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
          {/* Mock Token Banner */}
          <div className="mb-8">
            <MockTokenBanner contractService={contractService} />
          </div>

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
                  status={localCampaign.status}
                  timeLeft={timeLeft}
                  onBack={() => navigate(-1)}
                  onJoin={handleJoinCampaign}
                  isActive={isActive}
                  imageUrl={localCampaign.imageUrl || 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=600&fit=crop&crop=center'}
                />
              </div>

              {/* Campaign Statistics */}
              <div className="mb-12">
                <CampaignStats
                  currentAmount={Number(localCampaign.currentAmount)}
                  hardCap={Number(localCampaign.hardCap)}
                  softCap={Number(localCampaign.softCap)}
                  participantCount={localCampaign.participantCount}
                  timeLeft={timeLeft}
                  ticketAmount={Number(localCampaign.ticketAmount)}
                />
          </div>

              {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area - Participation Flow */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Staking Section */}
                  {isConnected && !isParticipating && (
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

                  {/* Debug Info for Mobile Issues */}
                  {import.meta.env.DEV && (
                    <Card className="bg-yellow-500/10 border-yellow-500/20 p-4">
                      <h4 className="font-semibold text-yellow-600 mb-2">Debug Info (Mobile)</h4>
                      <div className="text-sm space-y-1">
                        <p>isConnected: {String(isConnected)}</p>
                        <p>isParticipating: {String(isParticipating)}</p>
                        <p>hasJoinedLocally: {String(hasJoinedLocally)}</p>
                        <p>statusData?.isParticipating: {String(statusData?.isParticipating)}</p>
                        <p>account: {account || 'none'}</p>
                        <p>Show Staking: {String(isConnected && !isParticipating)}</p>
                    </div>
                    </Card>
                  )}

                  {/* Fallback Staking Section for Mobile - Always show if not participating */}
                  {!isParticipating && !isConnected && (
                    <Card className="bg-orange-500/10 border-orange-500/20">
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
                        campaignId={localCampaign.id?.toString()}
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
                    <Card className="gradient-card border border-border/50 shadow-xl">
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
                          onClick={() => window.open('https://pancakeswap.finance/', '_blank')}
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
                                {userStatus?.ticketCount}
                              </p>
                              <p className="text-sm text-muted-foreground">Tickets</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-campaign-success">
                                {userStatus?.stakedAmount}
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
                  <PrizePool prizes={localCampaign.prizes} />
                  
                  {/* Campaign Details */}
                  <Card className="gradient-card border border-border/50 shadow-xl">
                <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-3 bg-campaign-info/20 border border-campaign-info/30 rounded-lg">
                          <BookOpen className="w-5 h-5 text-campaign-info" />
                        </div>
                        <span className="text-foreground">Campaign Details</span>
                  </CardTitle>
                </CardHeader>
                    <CardContent className="space-y-4">
                  <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm text-muted-foreground">Start Date</span>
                          <span className="text-sm font-medium text-foreground">{new Date(localCampaign.startDate).toLocaleDateString()}</span>
                      </div>
                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm text-muted-foreground">End Date</span>
                          <span className="text-sm font-medium text-foreground">{new Date(localCampaign.endDate).toLocaleDateString()}</span>
                  </div>
                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm text-muted-foreground">Soft Cap</span>
                          <span className="text-sm font-medium text-campaign-info">{Number(localCampaign.softCap).toLocaleString()} SQUDY</span>
                    </div>
                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm text-muted-foreground">Hard Cap</span>
                          <span className="text-sm font-medium text-campaign-warning">{Number(localCampaign.hardCap).toLocaleString()} SQUDY</span>
                    </div>
                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge 
                            className={`text-xs ${
                              localCampaign.status === 'active' 
                                ? 'bg-campaign-success/20 text-campaign-success border-campaign-success/30' 
                                : 'bg-muted/50 text-muted-foreground border-border/50'
                            }`}
                          >
                            {localCampaign.status}
                          </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

                  {/* Token Burn Warning */}
                  <Card className="gradient-card border border-campaign-warning/20 shadow-xl">
                    <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                        <div className="p-3 bg-campaign-warning/20 border border-campaign-warning/30 rounded-lg flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-campaign-warning" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-campaign-warning mb-2">🔥 Token Burn Mechanism</h4>
                          <p className="text-sm text-campaign-warning/80 leading-relaxed">
                            All staked SQUDY tokens will be permanently burned at the end of this campaign, 
                            regardless of winning status. This burn-to-win mechanism creates scarcity and 
                            adds value to the ecosystem.
                          </p>
                          <div className="mt-3 p-3 bg-campaign-warning/5 border border-campaign-warning/20 rounded-lg">
                            <p className="text-xs text-campaign-warning/70">
                              💡 <strong>Why Burn?</strong> Token burning reduces supply, potentially increasing 
                              value for remaining token holders while funding amazing prizes.
                            </p>
                          </div>
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