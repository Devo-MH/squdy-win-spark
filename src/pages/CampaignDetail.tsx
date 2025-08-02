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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <Header />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Back Navigation */}
          <div className="mb-8">
            <Button
              variant="ghost"
              className="group hover:bg-white/5 transition-all duration-200"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to Campaigns
            </Button>
          </div>

          {/* Mock Token Banner */}
          <div className="mb-8">
            <MockTokenBanner contractService={contractService} />
          </div>

          {/* Loading State */}
          {isCampaignLoading && (
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
          {localCampaign && !isCampaignLoading && (
            <>
              {/* Campaign Header Section */}
              <div className="mb-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  {/* Campaign Info */}
                  <div className="space-y-8">
                    {/* Status Badges */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <Badge 
                        variant={getCampaignStatusBadge(localCampaign.status)}
                        className="text-sm px-4 py-2 capitalize font-medium shadow-sm"
                      >
                        {localCampaign.status}
                      </Badge>
                      {isActive && (
                        <Badge variant="outline" className="text-sm px-4 py-2 border-white/20">
                          <Clock className="w-4 h-4 mr-2" />
                          {timeLeft}
                        </Badge>
                      )}
                      {localCampaign.status === 'burned' && (
                        <Badge variant="destructive" className="text-sm px-4 py-2">
                          <Flame className="w-4 h-4 mr-2" />
                          Burned
                        </Badge>
                      )}
                    </div>
                    
                    {/* Campaign Title */}
                    <div className="space-y-4">
                      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent leading-tight">
                        {localCampaign.name}
                      </h1>
                      
                      <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                        {localCampaign.description}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      {!isConnected ? (
                        <div className="text-center p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground font-medium">Connect your wallet to participate</p>
                        </div>
                      ) : isParticipating ? (
                        <div className="text-center p-6 bg-green-500/10 border border-green-500/20 rounded-xl backdrop-blur-sm">
                          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                          <p className="text-sm text-green-400 font-semibold">You're participating!</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {userStatus?.ticketCount} tickets • {userStatus?.stakedAmount} SQUDY staked
                          </p>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="lg" 
                          className="flex-1 group hover:bg-white/5 transition-all duration-200 border-white/20"
                          onClick={() => window.open('https://pancakeswap.finance/', '_blank')}
                        >
                          <ExternalLink className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                          🪙 Buy SQUDY
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Campaign Image */}
                  <div className="relative group">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-purple-600/20">
                      <img 
                        src={localCampaign.imageUrl} 
                        alt={localCampaign.name}
                        className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Grid Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Main Content Area */}
                <div className="xl:col-span-3 space-y-8">
                  {/* Campaign Progress Card */}
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-lg shadow-purple-600/10">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Target className="w-6 h-6 text-primary" />
                        </div>
                        Campaign Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      {/* Progress Bar */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Total Staked</span>
                          <span className="text-lg font-bold">
                            {Number(localCampaign.currentAmount).toLocaleString()} / {Number(localCampaign.hardCap).toLocaleString()} SQUDY
                          </span>
                        </div>
                        <div className="relative">
                          <Progress value={progress} className="h-4 bg-white/10" />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse rounded-full" />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Soft Cap: {Number(localCampaign.softCap).toLocaleString()}</span>
                          <span className="font-semibold text-primary">{progress.toFixed(1)}% Complete</span>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                          <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                          <div className="text-2xl font-bold">{localCampaign.participantCount}</div>
                          <div className="text-sm text-muted-foreground">Participants</div>
                        </div>
                        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                          <Target className="w-8 h-8 text-primary mx-auto mb-2" />
                          <div className="text-2xl font-bold">{Number(localCampaign.ticketAmount).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">SQUDY per Ticket</div>
                        </div>
                        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                          <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                          <div className="text-2xl font-bold">{timeLeft}</div>
                          <div className="text-sm text-muted-foreground">Time Remaining</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Prize Pool Card */}
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-lg shadow-purple-600/10">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <Trophy className="w-6 h-6 text-yellow-500" />
                        </div>
                        Prize Pool
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {localCampaign.prizes.map((prize, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-200">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                                'bg-gradient-to-r from-orange-500 to-orange-600'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-lg">{prize.name}</div>
                                <div className="text-sm text-muted-foreground">{prize.description}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-primary">
                                {Number(prize.value).toLocaleString()} {prize.currency}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Quantity: {prize.quantity}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Campaign Participation Section */}
                  {isConnected && !isParticipating && (
                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-lg shadow-purple-600/10">
                      <CardHeader className="pb-6">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          </div>
                          Campaign Participation
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Follow the steps below to complete your campaign participation
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        {/* Step 1: Staking */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-full">
                              <span className="text-sm font-bold text-primary">1</span>
                            </div>
                            <h3 className="text-lg font-semibold">Stake SQUDY Tokens</h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                              <div className="text-sm text-muted-foreground mb-2">Your Balance</div>
                              <div className="text-2xl font-bold">{Number(squdyBalance).toLocaleString()} SQUDY</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                              <div className="text-sm text-muted-foreground mb-2">Tickets You'll Get</div>
                              <div className="text-2xl font-bold">{ticketsFromStake}</div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="stakeAmount" className="text-sm font-medium">Amount to Stake (SQUDY)</Label>
                              <Input
                                id="stakeAmount"
                                type="number"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                                placeholder={`Minimum ${Number(localCampaign.ticketAmount).toLocaleString()} SQUDY`}
                                className="mt-2 bg-white/5 border-white/10 focus:border-primary/50"
                              />
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>1 ticket = {Number(localCampaign.ticketAmount).toLocaleString()} SQUDY</span>
                              <span>{ticketsFromStake} tickets</span>
                            </div>
                          </div>

                          {/* Step 1 Complete Message */}
                          {hasStaked && (
                            <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
                              <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-full">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <p className="text-base font-semibold text-green-400">
                                  ✓ Step 1 Complete: Tokens Staked Successfully!
                                </p>
                                <p className="text-sm text-green-300 mt-1">
                                  Your {stakeAmount} SQUDY has been staked. Now complete the required tasks below to join the campaign.
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-green-400">
                                  {ticketsFromStake} ticket{ticketsFromStake !== 1 ? 's' : ''} earned
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Approval and Staking Buttons */}
                          <div className="space-y-3">
                            {!hasAllowance && stakeAmount && (
                              <Button 
                                onClick={handleApprove}
                                disabled={isApproving || !stakeAmount}
                                className="w-full h-12 bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200"
                                variant="outline"
                              >
                                {isApproving ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-5 h-5 mr-2" />
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
                              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                              {isStaking ? (
                                <>
                                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                  Staking...
                                </>
                              ) : hasStaked ? (
                                <>
                                  <CheckCircle className="w-5 h-5 mr-2" />
                                  ✓ Staked Successfully
                                </>
                              ) : (
                                <>
                                  <Flame className="w-5 h-5 mr-2" />
                                  Stake {stakeAmount || 0} SQUDY
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Step 2: Offchain Tasks */}
                        {campaignTasks.length > 0 && showTasksSection && (
                          <div className="space-y-6 pt-8 border-t border-white/10">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-full">
                                <span className="text-sm font-bold text-primary">2</span>
                              </div>
                              <h3 className="text-lg font-semibold">Complete Required Tasks</h3>
                            </div>
                            
                            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
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
                          </div>
                        )}

                        {/* Step 3: Join Campaign */}
                        {showJoinButton && (
                          <div className="space-y-6 pt-8 border-t border-white/10">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-8 h-8 bg-yellow-500/20 rounded-full">
                                <span className="text-sm font-bold text-yellow-500">3</span>
                              </div>
                              <h3 className="text-lg font-semibold">Join Campaign</h3>
                            </div>
                            
                            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                              <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-full">
                                  <CheckCircle className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                  <p className="text-base font-semibold text-green-400">
                                    All Requirements Met! 🎉
                                  </p>
                                  <p className="text-sm text-green-300">
                                    You're now ready to join the campaign and compete for prizes.
                                  </p>
                                </div>
                              </div>
                              
                              <Button 
                                onClick={handleJoinCampaign}
                                disabled={isJoiningCampaign || !canJoinCampaign}
                                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
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
                                    🎉 Join Campaign & Compete for Prizes
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Sidebar */}
                <div className="xl:col-span-1 space-y-6">
                  {/* Campaign Details */}
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-lg shadow-purple-600/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Campaign Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Start Date</span>
                        <span className="text-sm font-medium">{new Date(localCampaign.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">End Date</span>
                        <span className="text-sm font-medium">{new Date(localCampaign.endDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Soft Cap</span>
                        <span className="text-sm font-medium">{Number(localCampaign.softCap).toLocaleString()} SQUDY</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Hard Cap</span>
                        <span className="text-sm font-medium">{Number(localCampaign.hardCap).toLocaleString()} SQUDY</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant={getCampaignStatusBadge(localCampaign.status)} className="text-xs">
                          {localCampaign.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Token Burn Warning */}
                  <Card className="bg-orange-500/10 border-orange-500/20 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-orange-400 mb-2">Token Burn Warning</h4>
                          <p className="text-sm text-orange-300">
                            All staked SQUDY tokens will be permanently burned at the end of this campaign, regardless of winning status.
                          </p>
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