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
import { useContracts } from "@/services/contracts";
import { useSocket } from "@/services/socket";
import { MockTokenBanner } from "@/components/MockTokenBanner";
import { TaskChecklist } from "@/components/offchain-verifier";
import { Task } from "@/components/offchain-verifier/types";
import { toast } from "sonner";

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  
  // Web3 and Auth hooks
  const { account, isConnected, provider, signer } = useWeb3();
  const { isAuthenticated, requireAuth } = useAuth();
  
  // Contract integration
  const contractService = useContracts(provider, signer);
  
  // API queries
  const { 
    data: campaignData, 
    isLoading: isCampaignLoading, 
    error: campaignError,
    refetch: refetchCampaign 
  } = useCampaign(Number(id));
  
  const { 
    data: statusData, 
    refetch: refetchStatus 
  } = useMyCampaignStatus(Number(id));
  
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
  const [localCampaign, setLocalCampaign] = useState(campaignData?.campaign || null);

  // Update local campaign when data changes
  useEffect(() => {
    if (campaignData?.campaign) {
      setLocalCampaign(campaignData.campaign);
    }
  }, [campaignData]);

  // Load user balance and allowance when account changes
  useEffect(() => {
    const loadWalletData = async () => {
      if (!account || !contractService) return;
      
      try {
        const [balance, tokenAllowance] = await Promise.all([
          contractService.getTokenBalance(account),
          contractService.getTokenAllowance(account, import.meta.env.VITE_CAMPAIGN_MANAGER_ADDRESS || ''),
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
        import.meta.env.VITE_CAMPAIGN_MANAGER_ADDRESS || '',
        stakeAmount
      );
      await tx.wait();
      
      // Refresh allowance
      const newAllowance = await contractService.getTokenAllowance(
        account!,
        import.meta.env.VITE_CAMPAIGN_MANAGER_ADDRESS || ''
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

  // Loading state
  if (isCampaignLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-20">
          <div className="container mx-auto px-4">
            <Button
              variant="ghost"
              className="mb-8"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-60 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (campaignError || !localCampaign) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-20">
          <div className="container mx-auto px-4 text-center">
            <Button
              variant="ghost"
              className="mb-8"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Campaign not found</h1>
            <p className="text-muted-foreground mb-4">
              The campaign you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/campaigns')}>
              View All Campaigns
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Derived values
  const progress = formatProgress(localCampaign.currentAmount, localCampaign.hardCap);
  const isActive = localCampaign.status === "active";
  const isFinished = localCampaign.status === "finished" || localCampaign.status === "burned";
  const timeLeft = formatTimeLeft(localCampaign.endDate);
  const ticketsFromStake = calculateTickets(stakeAmount);
  const hasAllowance = parseFloat(allowance) >= parseFloat(stakeAmount || '0');
  const userStatus = statusData?.status;
  const isParticipating = statusData?.isParticipating || false;
  
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
    } else {
      setCompletedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-8"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Mock Token Banner */}
          <MockTokenBanner contractService={contractService} />

          {/* Campaign Header */}
          <div className="mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Badge 
                    variant={getCampaignStatusBadge(localCampaign.status)}
                    className="text-sm px-3 py-1 capitalize"
                  >
                    {localCampaign.status}
                  </Badge>
                  {isActive && (
                    <Badge variant="outline" className="text-sm">
                      <Clock className="w-3 h-3 mr-1" />
                      {timeLeft}
                    </Badge>
                  )}
                  {localCampaign.status === 'burned' && (
                    <Badge variant="destructive" className="text-sm">
                      <Flame className="w-3 h-3 mr-1" />
                      Burned
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {localCampaign.name}
                </h1>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {localCampaign.description}
                </p>

                  <div className="flex flex-col sm:flex-row gap-4">
                  {!isConnected ? (
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Connect your wallet to participate</p>
                    </div>
                  ) : isParticipating ? (
                    <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-green-400 font-medium">You're participating!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {userStatus?.ticketCount} tickets • {userStatus?.stakedAmount} SQUDY staked
                      </p>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="flex-1"
                      onClick={() => window.open('https://pancakeswap.finance/', '_blank')}
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Buy SQUDY
                    </Button>
                  )}
                  </div>
              </div>

              <div className="relative">
                <img 
                  src={localCampaign.imageUrl} 
                  alt={localCampaign.name}
                  className="w-full aspect-video object-cover rounded-xl border border-primary/20"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent rounded-xl" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Campaign Stats */}
              <Card className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Campaign Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Staked</span>
                      <span className="text-foreground font-medium">
                        {Number(localCampaign.currentAmount).toLocaleString()} / {Number(localCampaign.hardCap).toLocaleString()} SQUDY
                      </span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Soft Cap: {Number(localCampaign.softCap).toLocaleString()}</span>
                      <span>{progress.toFixed(1)}% Complete</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-xl font-bold text-foreground">{localCampaign.participantCount}</div>
                      <div className="text-xs text-muted-foreground">Participants</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <Target className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-xl font-bold text-foreground">{Number(localCampaign.ticketAmount).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">SQUDY per Ticket</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-xl font-bold text-foreground">{isActive ? timeLeft : 'Ended'}</div>
                      <div className="text-xs text-muted-foreground">{isActive ? 'Time Remaining' : 'Campaign Status'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Staking Section */}
              {isActive && isConnected && !isParticipating && (
                <Card className="bg-gradient-card border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-primary" />
                      {hasStaked ? 'Campaign Participation' : 'Step 1: Stake SQUDY Tokens'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {hasStaked 
                        ? 'Follow the steps below to complete your campaign participation'
                        : 'First, stake your SQUDY tokens. Then complete required tasks to join the campaign.'
                      }
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* User Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <div className="text-lg font-bold text-foreground">{Number(squdyBalance).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">SQUDY Balance</div>
                      </div>
                      <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <div className="text-lg font-bold text-foreground">{ticketsFromStake}</div>
                        <div className="text-xs text-muted-foreground">Tickets You'll Get</div>
                      </div>
                    </div>

                    {/* Staking Form */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="stakeAmount">Amount to Stake (SQUDY)</Label>
                        <Input
                          id="stakeAmount"
                          type="number"
                          placeholder={`Minimum ${localCampaign.ticketAmount} SQUDY`}
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          min={Number(localCampaign.ticketAmount)}
                          step="1"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1 ticket = {Number(localCampaign.ticketAmount).toLocaleString()} SQUDY</span>
                          <span>{ticketsFromStake} ticket{ticketsFromStake !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      
                      {/* Offchain Tasks Section */}
                      {campaignTasks.length > 0 && showTasksSection && (
                        <div className="space-y-4">
                          <div className="border-t pt-4">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-primary" />
                              Step 2: Complete Required Tasks
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Complete the following social media tasks before joining the campaign
                            </p>
                            
                            <div className="bg-secondary/30 rounded-lg p-4">
                              <TaskChecklist
                                tasks={campaignTasks}
                                completedTasks={completedTasks}
                                onTaskChange={handleTaskChange}
                                campaignName={localCampaign.name}
                                campaignId={localCampaign.id?.toString()}
                                enableSimulation={true}
                                highlightFirstIncompleteTask={true}
                              />
                            </div>
                            
                            {/* Task completion status */}
                            <div className="mt-3 flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Progress: {completedTasks.length} / {campaignTasks.length} tasks completed
                              </span>
                              <span className={`font-medium ${allRequiredTasksCompleted ? 'text-green-600' : 'text-orange-600'}`}>
                                {allRequiredTasksCompleted ? 'All required tasks completed ✓' : `${requiredTasks.length - completedTasks.filter(id => requiredTasks.some(t => t.id === id)).length} required tasks remaining`}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Join Campaign Button */}
                      {showJoinButton && (
                        <div className="space-y-4">
                          <div className="border-t pt-4">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <Trophy className="w-5 h-5 text-primary" />
                              Step 3: Join Campaign
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              All requirements completed! Click below to officially join the campaign.
                            </p>
                            
                            <Button 
                              onClick={handleJoinCampaign}
                              disabled={isJoiningCampaign || !canJoinCampaign}
                              className="w-full"
                              variant="default"
                              size="lg"
                            >
                              {isJoiningCampaign ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Joining Campaign...
                                </>
                              ) : (
                                <>
                                  <Trophy className="w-4 h-4 mr-2" />
                                  🎉 Join Campaign
                                </>
                              )}
                            </Button>
                            
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <p className="text-sm text-blue-700">
                                  <strong>Ready to join!</strong> You have staked tokens and completed all required tasks.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Approval and Staking */}
                      <div className="space-y-2">
                        {!hasAllowance && stakeAmount && (
                          <Button 
                            onClick={handleApprove}
                            disabled={isApproving || !stakeAmount}
                            className="w-full"
                            variant="outline"
                          >
                            {isApproving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve {stakeAmount} SQUDY
                              </>
                            )}
                          </Button>
                        )}
                        
                        <Button 
                          onClick={handleStake}
                          disabled={
                            isStaking || 
                            !stakeAmount || 
                            ticketsFromStake < 1 || 
                            !hasAllowance ||
                            parseFloat(stakeAmount) > parseFloat(squdyBalance) ||
                            hasStaked
                          }
                          className="w-full"
                        >
                          {isStaking ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Staking...
                            </>
                          ) : hasStaked ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              ✓ Staked Successfully
                            </>
                          ) : (
                            <>
                              <Flame className="w-4 h-4 mr-2" />
                              Stake {stakeAmount || 0} SQUDY
                            </>
                          )}
                        </Button>
                        
                        {/* Staking success message */}
                        {hasStaked && !isParticipating && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <p className="text-sm text-green-700">
                              ✓ Step 1 Complete: Tokens staked successfully! Now complete the required tasks below.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Social Tasks */}
              {isConnected && isParticipating && (
              <Card className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Required Social Tasks
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                      Complete all required tasks to be eligible for the prize draw
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                      {/* Twitter Tasks */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Twitter Tasks</h4>
                        
                        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Twitter className="w-4 h-4 text-primary" />
                            <div>
                              <span className="text-foreground">Follow @SqudyToken</span>
                              <p className="text-xs text-muted-foreground">Follow our Twitter account</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {userStatus?.socialTasksCompleted?.twitterFollow ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSocialTask('twitterFollow', 'twitter_follow_proof')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Twitter className="w-4 h-4 text-primary" />
                            <div>
                              <span className="text-foreground">Like Tweet</span>
                              <p className="text-xs text-muted-foreground">Like our campaign announcement</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {userStatus?.socialTasksCompleted?.twitterLike ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSocialTask('twitterLike', 'twitter_like_proof')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Twitter className="w-4 h-4 text-primary" />
                            <div>
                              <span className="text-foreground">Retweet</span>
                              <p className="text-xs text-muted-foreground">Retweet our campaign</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {userStatus?.socialTasksCompleted?.twitterRetweet ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSocialTask('twitterRetweet', 'twitter_retweet_proof')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Community Tasks */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Community Tasks</h4>
                        
                        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <MessageCircle className="w-4 h-4 text-primary" />
                            <div>
                              <span className="text-foreground">Join Discord</span>
                              <p className="text-xs text-muted-foreground">Join our Discord community</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {userStatus?.socialTasksCompleted?.discordJoined ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSocialTask('discordJoined', 'discord_join_proof')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <MessageCircle className="w-4 h-4 text-primary" />
                            <div>
                              <span className="text-foreground">Join Telegram</span>
                              <p className="text-xs text-muted-foreground">Join our Telegram group</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {userStatus?.socialTasksCompleted?.telegramJoined ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSocialTask('telegramJoined', 'telegram_join_proof')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <div>
                              <span className="text-foreground">Follow Medium</span>
                              <p className="text-xs text-muted-foreground">Follow us on Medium</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {userStatus?.socialTasksCompleted?.mediumFollowed ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSocialTask('mediumFollowed', 'medium_follow_proof')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-primary" />
                            <div>
                              <span className="text-foreground">Subscribe Newsletter</span>
                              <p className="text-xs text-muted-foreground">Subscribe to our newsletter</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {userStatus?.socialTasksCompleted?.newsletterSubscribed ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSocialTask('newsletterSubscribed', 'newsletter_subscribe_proof')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                          Complete
                        </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress */}
                      {userStatus?.socialCompletionPercentage !== undefined && (
                        <div className="pt-4 border-t border-border">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Social Tasks Progress</span>
                            <span className="text-foreground font-medium">{userStatus.socialCompletionPercentage}%</span>
                          </div>
                          <Progress value={userStatus.socialCompletionPercentage} className="h-2" />
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Prize Pool */}
              <Card className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-neon-green" />
                    Prize Pool
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {localCampaign.prizes.length > 0 ? (
                      localCampaign.prizes.map((prize, index) => (
                      <div key={index} className="p-3 bg-secondary/20 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground">{prize.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {prize.value.toLocaleString()} {prize.currency}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{prize.description}</p>
                          <p className="text-xs text-primary mt-1">Quantity: {prize.quantity}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Prize details will be announced soon</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Info */}
              <Card className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date</span>
                      <span className="text-foreground">{new Date(localCampaign.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date</span>
                      <span className="text-foreground">{new Date(localCampaign.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Soft Cap</span>
                      <span className="text-foreground">{Number(localCampaign.softCap).toLocaleString()} SQUDY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hard Cap</span>
                      <span className="text-foreground">{Number(localCampaign.hardCap).toLocaleString()} SQUDY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={getCampaignStatusBadge(localCampaign.status)} className="capitalize">
                        {localCampaign.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Winners Section for Finished Campaigns */}
              {isFinished && localCampaign.winners && localCampaign.winners.length > 0 && (
                <Card className="bg-gradient-card border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-neon-green" />
                      Winners
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {localCampaign.winners.map((winner, index) => (
                        <div key={index} className="p-3 bg-secondary/20 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {winner.walletAddress.slice(0, 6)}...{winner.walletAddress.slice(-4)}
                              </p>
                              <p className="text-xs text-muted-foreground">{winner.prizeName}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(winner.walletAddress)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {localCampaign.bscScanUrl && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <Button variant="outline" size="sm" asChild className="w-full">
                          <a href={localCampaign.bscScanUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-2" />
                            View on BSCScan
                          </a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Campaign Results for Finished Campaigns */}
              {isFinished && (
                <Card className="bg-gradient-card border-primary/20">
                  <CardHeader>
                    <CardTitle>Campaign Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <div className="text-lg font-bold text-foreground">{localCampaign.participantCount}</div>
                        <div className="text-xs text-muted-foreground">Total Participants</div>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <div className="text-lg font-bold text-foreground">
                          {localCampaign.totalBurned ? Number(localCampaign.totalBurned).toLocaleString() : '0'}
                        </div>
                        <div className="text-xs text-muted-foreground">Tokens Burned</div>
                      </div>
                    </div>
                    {localCampaign.status === 'burned' && (
                      <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                        <Flame className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-red-400 font-medium">All tokens have been burned</p>
                        <p className="text-xs text-muted-foreground mt-1">This campaign is complete</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Warning */}
              <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Flame className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">⚠️ Token Burn Warning</p>
                      <p className="text-xs text-muted-foreground">
                        All staked SQUDY tokens will be permanently burned at the end of this campaign, regardless of winning status.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CampaignDetail;