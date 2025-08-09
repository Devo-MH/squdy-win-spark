import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Settings, 
  Users, 
  Target, 
  Calendar,
  DollarSign,
  Flame,
  Shield,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  ExternalLink,
  BarChart3,
  Loader2,
  Crown,
  TrendingUp,
  Zap,
  Lock,
  Unlock,
  X,
  MessageCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns, getCampaignStatusBadge, campaignKeys } from "@/hooks/useCampaigns";
import { useQueryClient } from '@tanstack/react-query';
import { adminAPI, Campaign } from "@/services/api";
import { useSocket } from "@/services/socket";
import { useContracts } from "@/services/contracts";
import { Task } from "@/components/offchain-verifier/types";
import { toast } from "sonner";

const AdminPanel = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  
  // Web3 and Auth
  const { account, isConnected, provider, signer } = useWeb3();
  const { isAuthenticated, requireAuth } = useAuth();
  const contractService = useContracts(provider, signer);
  const [roleHint, setRoleHint] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // API queries
  const { 
    data: campaignsData, 
    isLoading: campaignsLoading, 
    refetch: refetchCampaigns 
  } = useCampaigns({ limit: 50 });
  
  // Local state
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({});
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    softCap: '',
    hardCap: '',
    ticketAmount: '',
    startDate: '',
    endDate: '',
    prizes: [{ name: '', description: '', value: '', currency: 'USD', quantity: 1 }],
    offchainTasks: [] as Task[]
  });
  
  const campaigns = campaignsData?.campaigns || [];
  const prependCampaignOptimistic = (newCampaign: Campaign) => {
    // Use react-query cache to avoid mutating fetched objects directly
    queryClient.setQueryData<any>(campaignKeys.list({ limit: 50 }), (old) => {
      const prev = old?.campaigns ?? [];
      return {
        campaigns: [newCampaign, ...prev],
        pagination: { page: 1, limit: 50, total: (old?.pagination?.total ?? prev.length) + 1, totalPages: 1 },
      };
    });
  };

  // Check admin access on mount
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!isConnected) {
        toast.error("Please connect your wallet to access admin panel");
        navigate('/');
        return;
      }
      
      const auth = await requireAuth();
      if (!auth) {
        toast.error("Authentication required for admin access");
        navigate('/');
        return;
      }
    };
    
    checkAdminAccess();
  }, [isConnected, requireAuth, navigate]);

  // Load dashboard stats
  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        const stats = await adminAPI.getStats();
        setDashboardStats(stats.stats);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      }
    };

    if (isAuthenticated) {
      loadDashboardStats();
    }
  }, [isAuthenticated]);

  // Check on-chain role status for the connected wallet and show hint if missing
  useEffect(() => {
    (async () => {
      try {
        if (!contractService || !isConnected) return;
        const status = await contractService.getRoleStatus();
        if (!(status.hasAdmin || status.hasOperator || status.isOwner)) {
          setRoleHint('Your wallet lacks admin/operator role on the manager. On-chain creation will revert until granted.');
        } else {
          setRoleHint(null);
        }
      } catch {}
    })();
  }, [contractService, isConnected]);

  // Real-time updates
  useEffect(() => {
    if (!socket.isConnected()) return;

    const handleCampaignCreated = () => {
      refetchCampaigns();
    };

    const handleCampaignUpdated = () => {
      refetchCampaigns();
    };

    socket.onCampaignCreated(handleCampaignCreated);
    socket.on('campaign:updated', handleCampaignUpdated);

    return () => {
      socket.off('campaign:created', handleCampaignCreated);
      socket.off('campaign:updated', handleCampaignUpdated);
    };
  }, [socket, refetchCampaigns]);

  const handleCreateCampaign = async () => {
    const auth = await requireAuth();
    if (!auth) return;

    // Validation
    if (!formData.name || !formData.description || !formData.softCap || !formData.hardCap || !formData.ticketAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(formData.hardCap) <= parseFloat(formData.softCap)) {
      toast.error("Hard cap must be greater than soft cap");
      return;
    }

    // Enforce minimum on-chain lead time: start >= now + 15 minutes
    const now = new Date();
    const minStart = new Date(now.getTime() + 15 * 60 * 1000);
    if (new Date(formData.startDate) < minStart) {
      toast.error("Start date must be at least 15 minutes in the future (contract rule)");
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error("End date must be after start date");
      return;
    }

    setIsCreating(true);
    try {
      // 1) Create on-chain to get canonical campaignId
      let onChainId: number | null = null;
      try {
        if (contractService) {
          const id = await contractService.createCampaign({
            name: formData.name,
            description: formData.description,
            imageUrl: formData.imageUrl,
            softCap: formData.softCap,
            hardCap: formData.hardCap,
            ticketAmount: formData.ticketAmount,
            startDate: formData.startDate,
            endDate: formData.endDate,
            prizes: formData.prizes.map(p => p.name).filter(Boolean),
          });
          onChainId = Number(id);
        }
      } catch (e: any) {
        const message = e?.message || String(e);
        if (/Invalid start date/i.test(message)) {
          toast.error('Invalid start date: set start at least 15–30 minutes in the future');
        } else if (message.includes('authorized')) {
          toast.error(message);
        } else if (message.includes('execution reverted')) {
          toast.error(message);
        } else {
          toast.error('On-chain create failed; please check wallet network, role, token decimals and dates');
        }
        console.error('On-chain create failed; aborting off-chain create:', e);
        setIsCreating(false);
        return; // Do NOT create off-chain if on-chain failed
      }

      // 2) Persist off-chain (must include onChainId)
      const created = await adminAPI.createCampaign({
        name: formData.name,
        description: formData.description,
        imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop',
        softCap: parseFloat(formData.softCap),
        hardCap: parseFloat(formData.hardCap),
        ticketAmount: parseFloat(formData.ticketAmount),
        startDate: formData.startDate,
        endDate: formData.endDate,
        prizes: formData.prizes.filter(p => p.name && p.value),
        offchainTasks: formData.offchainTasks.filter(t => t.label && t.type),
        // onChainId must exist to store as contractId
        contractId: onChainId!,
      });

      setShowCreateForm(false);
      resetForm();
      // Optimistic UI: show the new campaign immediately
      if (created?.campaign) {
        prependCampaignOptimistic({
          contractId: created.campaign.contractId ?? onChainId ?? Date.now(),
          name: created.campaign.name,
          description: created.campaign.description || '',
          imageUrl: created.campaign.imageUrl || 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop',
          softCap: created.campaign.softCap || 0,
          hardCap: created.campaign.hardCap || 0,
          ticketAmount: created.campaign.ticketAmount || 0,
          currentAmount: 0,
          startDate: created.campaign.startDate || new Date().toISOString(),
          endDate: created.campaign.endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
          status: 'active',
          participantCount: 0,
          prizes: [],
          winners: [],
          totalBurned: 0,
          bscScanUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as Campaign);
      }
      // Invalidate all queries under 'campaigns' so Home and Campaigns pages refresh
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'campaigns'
      });
      // Also trigger a refetch shortly to confirm from backend (Mongo)
      setTimeout(() => { void refetchCampaigns(); }, 250);
      
      toast.success("Campaign created successfully!");
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      toast.error(error.response?.data?.error?.message || "Failed to create campaign");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      softCap: '',
      hardCap: '',
      ticketAmount: '',
      startDate: '',
      endDate: '',
      prizes: [{ name: '', description: '', value: '', currency: 'USD', quantity: 1 }],
      offchainTasks: [] as Task[]
    });
  };

  const setActionLoading = (campaignId: number, action: string, loading: boolean) => {
    setLoadingActions(prev => ({
      ...prev,
      [`${campaignId}-${action}`]: loading
    }));
  };

  const getActionLoading = (campaignId: number, action: string) => {
    return loadingActions[`${campaignId}-${action}`] || false;
  };

  const handleCampaignAction = async (campaignId: number, action: 'activate' | 'pause' | 'close' | 'end-now' | 'select-winners' | 'burn' | 'pause-all' | 'unpause-all') => {
    const auth = await requireAuth();
    if (!auth) return;

    setActionLoading(campaignId, action, true);
    
    try {
      switch (action) {
        case 'activate':
          await adminAPI.activateCampaign(campaignId);
          toast.success("Campaign activated successfully!");
          break;
        case 'pause':
          await adminAPI.pauseCampaign(campaignId);
          toast.success("Campaign paused successfully!");
          break;
        case 'pause-all':
          if (contractService) {
            const tx = await contractService.pauseAll();
            await tx.wait();
            toast.success('Contract paused');
          } else {
            toast.error('Wallet not connected');
          }
          break;
        case 'unpause-all':
          if (contractService) {
            const tx = await contractService.unpauseAll();
            await tx.wait();
            toast.success('Contract unpaused');
          } else {
            toast.error('Wallet not connected');
          }
          break;
        case 'close':
          await adminAPI.closeCampaign(campaignId);
          toast.success("Campaign closed successfully!");
          break;
        case 'end-now':
          if (contractService) {
            const tx = await contractService.endCampaignNow(campaignId);
            await tx.wait();
            toast.success('Campaign end time updated to near-now. You can select winners shortly.');
          } else {
            toast.error('Wallet not connected');
          }
          break;
        case 'select-winners':
          // Call smart contract first, then update backend
          if (contractService) {
            console.log('🎯 Calling smart contract selectWinners...');
            const tx = await contractService.selectWinners(campaignId);
            await tx.wait();
            console.log('✅ Smart contract call completed');
          }
          console.log('📡 Calling backend API selectWinners...');
          const response = await adminAPI.selectWinners(campaignId);
          console.log('📝 Backend response:', response);
          toast.success("🏆 Winners selected successfully!");
          break;
        case 'burn':
          // Call smart contract first, then update backend
          if (contractService) {
            const tx = await contractService.burnAllTokens(campaignId);
            await tx.wait();
          }
          await adminAPI.burnTokens(campaignId);
          toast.success("🔥 All staked tokens have been burned!");
          break;
      }
      
      // Force refresh the campaigns list
      console.log('🔄 Refreshing campaigns after action:', action);
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      const refetchResult = await refetchCampaigns();
      console.log('🔍 Refetch result:', refetchResult?.data);
      console.log('📊 Campaign statuses after refetch:', 
        refetchResult?.data?.campaigns?.map(c => `${c.name}: ${c.status}`) || 'No campaigns');
      
      // Also log the current campaigns state
      console.log('📋 Current campaigns state:', campaignsData);
    } catch (error: any) {
      console.error(`Failed to ${action} campaign:`, error);
      toast.error(error.response?.data?.error?.message || `Failed to ${action} campaign`);
    } finally {
      setActionLoading(campaignId, action, false);
    }
  };

  const addPrize = () => {
    setFormData(prev => ({
      ...prev,
      prizes: [...prev.prizes, { name: '', description: '', value: '', currency: 'USD', quantity: 1 }]
    }));
  };

  const removePrize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prizes: prev.prizes.filter((_, i) => i !== index)
    }));
  };

  const updatePrize = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      prizes: prev.prizes.map((prize, i) => 
        i === index ? { ...prize, [field]: value } : prize
      )
    }));
  };

  // Task management functions
  const addTask = () => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      type: 'twitter_follow',
      label: '',
      description: '',
      required: true,
      url: '',
      targetAccount: '',
    };
    
    setFormData(prev => ({
      ...prev,
      offchainTasks: [...prev.offchainTasks, newTask]
    }));
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      offchainTasks: prev.offchainTasks.filter((_, i) => i !== index)
    }));
  };

  const updateTask = (index: number, field: keyof Task, value: any) => {
    setFormData(prev => ({
      ...prev,
      offchainTasks: prev.offchainTasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      )
    }));
  };

  const loadTestData = () => {
    const now = new Date();
    // Start in 20 minutes to satisfy common on-chain min lead time
    const startDate = new Date(now.getTime() + 20 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour by default for testing

    const toLocalInput = (d: Date) => {
      const tzoffset = d.getTimezoneOffset() * 60000; // offset in ms
      const local = new Date(d.getTime() - tzoffset);
      return local.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    };
    
    setFormData({
      name: 'Test Campaign ' + Math.floor(Math.random() * 1000),
      description: 'This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!',
      imageUrl: 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop',
      softCap: '5000',
      hardCap: '50000',
      ticketAmount: '100',
      startDate: toLocalInput(startDate), // Proper local value for datetime-local
      endDate: toLocalInput(endDate),
      prizes: [
        { name: 'First Prize', description: 'Winner takes all', value: '10000', currency: 'USD', quantity: 1 },
        { name: 'Second Prize', description: 'Runner up reward', value: '5000', currency: 'USD', quantity: 1 },
        { name: 'Third Prize', description: 'Bronze medal', value: '2500', currency: 'USD', quantity: 1 }
      ],
      offchainTasks: [
        {
          id: 'twitter-follow-test',
          type: 'twitter_follow',
          label: 'Follow @SqudyOfficial',
          description: 'Follow our official Twitter account for updates',
          required: true,
          url: 'https://twitter.com/SqudyOfficial',
          targetAccount: 'SqudyOfficial'
        },
        {
          id: 'twitter-like-test',
          type: 'twitter_like',
          label: 'Like our announcement',
          description: 'Like our campaign announcement tweet',
          required: true,
          url: 'https://twitter.com/SqudyOfficial/status/1234567890',
          tweetId: '1234567890'
        },
        {
          id: 'telegram-join-test',
          type: 'join_telegram',
          label: 'Join Telegram Community',
          description: 'Join our Telegram channel for discussions',
          required: false,
          url: 'https://t.me/SqudyCommunity',
          value: 'SqudyCommunity'
        }
      ] as Task[]
    });
    
    toast.success('🧪 Test data loaded successfully!');
  };

  // Loading state for non-authenticated users
  if (!isConnected || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-20">
          <div className="container mx-auto px-4 text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
            <p className="text-muted-foreground mb-4">
              Please connect your wallet and authenticate to access the admin panel.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Admin Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
                  <p className="text-muted-foreground">
                    Manage campaigns and monitor platform performance
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                  <Crown className="w-3 h-3 mr-1" />
                  Admin Access
                </Badge>
                <Badge variant="outline">
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              {dashboardStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.totalCampaigns}</div>
                      <p className="text-xs text-muted-foreground">
                        {dashboardStats.activeCampaigns} active
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.totalParticipants}</div>
                      <p className="text-xs text-muted-foreground">
                        Across all campaigns
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Staked</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Number(dashboardStats.totalStaked).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">SQUDY tokens</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Burned</CardTitle>
                      <Flame className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {Number(dashboardStats.totalBurned).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">SQUDY tokens</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Campaigns Tab */}
              <TabsContent value="campaigns" className="space-y-6">
              <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Campaign Management
                      </CardTitle>
                      {campaigns.length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              const auth = await requireAuth();
                              if (!auth) return;
                              if (!confirm('Delete ALL campaigns and related data? This cannot be undone.')) return;
                              try {
                                const res = await adminAPI.deleteCampaigns({ all: true });
                                toast.success(`Deleted ${res.deletedCount || 0} campaigns`);
                                await refetchCampaigns();
                              } catch (e: any) {
                                toast.error(e?.response?.data?.error || 'Failed to delete all campaigns');
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete All
                          </Button>
                        </div>
                      )}
                    </div>
                </CardHeader>
                <CardContent>
                  {campaignsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Campaigns</h3>
                      <p className="text-muted-foreground mb-4">Create your first campaign to get started.</p>
                      <Button onClick={() => setSelectedTab('create')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Campaign
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {campaigns.map((campaign) => (
                        <div key={campaign.contractId} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <img 
                              src={campaign.imageUrl} 
                              alt={campaign.name}
                              className="w-12 h-12 rounded object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop";
                              }}
                            />
                            <div>
                              <h4 className="font-semibold">{campaign.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getCampaignStatusBadge(campaign.status)} className="capitalize">
                                  {campaign.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {campaign.participantCount} participants
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/campaigns/${campaign.contractId}`)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                const auth = await requireAuth();
                                if (!auth) return;
                                if (!confirm(`Delete campaign ${campaign.name}?`)) return;
                                try {
                                  const res = await adminAPI.deleteCampaign(campaign.contractId);
                                  toast.success(`Deleted (${res.deletedCount || 1})`);
                                  await refetchCampaigns();
                                } catch (e: any) {
                                  toast.error(e?.response?.data?.error || 'Failed to delete campaign');
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                            
                            {campaign.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleCampaignAction(campaign.contractId, 'activate')}
                                disabled={getActionLoading(campaign.contractId, 'activate')}
                              >
                                {getActionLoading(campaign.contractId, 'activate') ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4 mr-1" />
                                )}
                                Activate
                              </Button>
                            )}
                            
                            {campaign.status === 'active' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCampaignAction(campaign.contractId, 'pause')}
                                  disabled={getActionLoading(campaign.contractId, 'pause')}
                                >
                                  {getActionLoading(campaign.contractId, 'pause') ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Pause className="w-4 h-4 mr-1" />
                                  )}
                                  Pause
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCampaignAction(campaign.contractId, 'close')}
                                  disabled={getActionLoading(campaign.contractId, 'close')}
                                >
                                  {getActionLoading(campaign.contractId, 'close') ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Lock className="w-4 h-4 mr-1" />
                                  )}
                                  Close
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCampaignAction(campaign.contractId, 'pause-all')}
                                  disabled={getActionLoading(campaign.contractId, 'pause-all')}
                                >
                                  {getActionLoading(campaign.contractId, 'pause-all') ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Pause className="w-4 h-4 mr-1" />
                                  )}
                                  Pause All
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCampaignAction(campaign.contractId, 'unpause-all')}
                                  disabled={getActionLoading(campaign.contractId, 'unpause-all')}
                                >
                                  {getActionLoading(campaign.contractId, 'unpause-all') ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Unlock className="w-4 h-4 mr-1" />
                                  )}
                                  Unpause All
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleCampaignAction(campaign.contractId, 'end-now')}
                                  disabled={getActionLoading(campaign.contractId, 'end-now')}
                                >
                                  {getActionLoading(campaign.contractId, 'end-now') ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Crown className="w-4 h-4 mr-1" />
                                  )}
                                  End Now
                                </Button>
                              </>
                            )}
                            
                            {campaign.status === 'paused' && (
                              <Button
                                size="sm"
                                onClick={() => handleCampaignAction(campaign.contractId, 'activate')}
                                disabled={getActionLoading(campaign.contractId, 'activate')}
                              >
                                {getActionLoading(campaign.contractId, 'activate') ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Unlock className="w-4 h-4 mr-1" />
                                )}
                                Resume
                              </Button>
                            )}
                            
                            {/* Select Winners Button - allow admin to run when active/paused/finished/closed (on-chain will enforce timing) */}
                            {(['active','paused','finished','closed'].includes(String(campaign.status))) &&
                             String(campaign.status) !== 'burned' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCampaignAction(campaign.contractId, 'select-winners')}
                                disabled={getActionLoading(campaign.contractId, 'select-winners')}
                              >
                                {getActionLoading(campaign.contractId, 'select-winners') ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Crown className="w-4 h-4 mr-1" />
                                )}
                                Winners
                              </Button>
                            )}
                            
                            {/* Burn Tokens Button - allow when finished/closed; on-chain will enforce winners selected */}
                            {(['finished','closed'].includes(String(campaign.status))) && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCampaignAction(campaign.contractId, 'burn')}
                                disabled={getActionLoading(campaign.contractId, 'burn')}
                              >
                                {getActionLoading(campaign.contractId, 'burn') ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Flame className="w-4 h-4 mr-1" />
                                )}
                                Burn Tokens
                              </Button>
                            )}
                            
                            {/* Burned Status Indicator */}
                            {campaign.status === 'burned' && (
                              <Badge variant="destructive" className="px-3 py-1">
                                <Flame className="w-3 h-3 mr-1" />
                                Tokens Burned
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Create Tab */}
            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Create New Campaign
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadTestData}
                      className="flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Load Test Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {roleHint && (
                    <div className="text-sm text-yellow-600">
                      {roleHint}
                    </div>
                  )}
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Campaign Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter campaign name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl">Image URL</Label>
                      <Input
                        id="imageUrl"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your campaign"
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Financial Parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="softCap">Soft Cap (SQUDY) *</Label>
                      <Input
                        id="softCap"
                        type="number"
                        value={formData.softCap}
                        onChange={(e) => setFormData(prev => ({ ...prev, softCap: e.target.value }))}
                        placeholder="10000"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="hardCap">Hard Cap (SQUDY) *</Label>
                      <Input
                        id="hardCap"
                        type="number"
                        value={formData.hardCap}
                        onChange={(e) => setFormData(prev => ({ ...prev, hardCap: e.target.value }))}
                        placeholder="100000"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="ticketAmount">Ticket Price (SQUDY) *</Label>
                      <Input
                        id="ticketAmount"
                        type="number"
                        value={formData.ticketAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, ticketAmount: e.target.value }))}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Start Date *
                      </Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Campaign will start at this date and time
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        End Date *
                      </Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Campaign will end at this date and time
                      </p>
                    </div>
                  </div>

                  {/* Date Presets */}
                  <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground w-full mb-2">Quick date presets:</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
                        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
                        setFormData(prev => ({
                          ...prev,
                          startDate: start.toISOString().slice(0, 16),
                          endDate: end.toISOString().slice(0, 16)
                        }));
                      }}
                    >
                      1 Day
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
                        const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
                        setFormData(prev => ({
                          ...prev,
                          startDate: start.toISOString().slice(0, 16),
                          endDate: end.toISOString().slice(0, 16)
                        }));
                      }}
                    >
                      1 Week
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
                        const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
                        setFormData(prev => ({
                          ...prev,
                          startDate: start.toISOString().slice(0, 16),
                          endDate: end.toISOString().slice(0, 16)
                        }));
                      }}
                    >
                      1 Month
                    </Button>
                  </div>

                  {/* Prizes */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Prizes</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addPrize}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Prize
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {formData.prizes.map((prize, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-4">
                            <Input
                              placeholder="Prize name"
                              value={prize.name}
                              onChange={(e) => updatePrize(index, 'name', e.target.value)}
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              placeholder="Description"
                              value={prize.description}
                              onChange={(e) => updatePrize(index, 'description', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              placeholder="Value"
                              value={prize.value}
                              onChange={(e) => updatePrize(index, 'value', e.target.value)}
                            />
                          </div>
                          <div className="col-span-1">
                            <Select value={prize.currency} onValueChange={(value) => updatePrize(index, 'currency', value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="SQUDY">SQUDY</SelectItem>
                                <SelectItem value="BNB">BNB</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={prize.quantity}
                              onChange={(e) => updatePrize(index, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="col-span-1">
                            {formData.prizes.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePrize(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Offchain Tasks */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-semibold">Offchain Tasks</Label>
                        <p className="text-sm text-muted-foreground">
                          Configure social media and engagement tasks that participants must complete
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addTask}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Task
                      </Button>
                    </div>
                    
                    {formData.offchainTasks.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                        <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No tasks configured. Add tasks to engage participants.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.offchainTasks.map((task, index) => (
                          <div key={index} className="border rounded-lg p-4 space-y-4 bg-secondary/20">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Task {index + 1}</h4>
                              {formData.offchainTasks.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTask(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Task Type *</Label>
                                <Select 
                                  value={task.type} 
                                  onValueChange={(value) => updateTask(index, 'type', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="twitter_follow">Twitter Follow</SelectItem>
                                    <SelectItem value="twitter_like">Twitter Like</SelectItem>
                                    <SelectItem value="twitter_retweet">Twitter Retweet</SelectItem>
                                    <SelectItem value="join_telegram">Join Telegram</SelectItem>
                                    <SelectItem value="discord_join">Join Discord</SelectItem>
                                    <SelectItem value="submit_email">Email Subscription</SelectItem>
                                    <SelectItem value="visit_website">Visit Website</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Required?</Label>
                                <Select 
                                  value={task.required ? 'true' : 'false'} 
                                  onValueChange={(value) => updateTask(index, 'required', value === 'true')}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Required</SelectItem>
                                    <SelectItem value="false">Optional</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Label *</Label>
                                <Input
                                  placeholder="e.g., Follow @SqudyOfficial"
                                  value={task.label}
                                  onChange={(e) => updateTask(index, 'label', e.target.value)}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>URL</Label>
                                <Input
                                  placeholder="https://twitter.com/SqudyOfficial"
                                  value={task.url || ''}
                                  onChange={(e) => updateTask(index, 'url', e.target.value)}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                placeholder="Brief description of what participants need to do"
                                value={task.description || ''}
                                onChange={(e) => updateTask(index, 'description', e.target.value)}
                              />
                            </div>
                            
                            {/* Task-specific fields */}
                            {(task.type === 'twitter_follow' || task.type === 'twitter_like' || task.type === 'twitter_retweet') && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {task.type === 'twitter_follow' && (
                                  <div className="space-y-2">
                                    <Label>Twitter Handle</Label>
                                    <Input
                                      placeholder="SqudyOfficial (without @)"
                                      value={task.targetAccount || ''}
                                      onChange={(e) => updateTask(index, 'targetAccount', e.target.value)}
                                    />
                                  </div>
                                )}
                                {(task.type === 'twitter_like' || task.type === 'twitter_retweet') && (
                                  <div className="space-y-2">
                                    <Label>Tweet ID</Label>
                                    <Input
                                      placeholder="1234567890"
                                      value={task.tweetId || ''}
                                      onChange={(e) => updateTask(index, 'tweetId', e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {task.type === 'join_telegram' && (
                              <div className="space-y-2">
                                <Label>Telegram Channel/Group</Label>
                                <Input
                                  placeholder="SqudyCommunity (channel name)"
                                  value={task.value || ''}
                                  onChange={(e) => updateTask(index, 'value', e.target.value)}
                                />
                              </div>
                            )}
                            
                            {task.type === 'discord_join' && (
                              <div className="space-y-2">
                                <Label>Discord Invite</Label>
                                <Input
                                  placeholder="https://discord.gg/squdy"
                                  value={task.value || ''}
                                  onChange={(e) => updateTask(index, 'value', e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button 
                      onClick={handleCreateCampaign}
                      disabled={isCreating}
                      className="flex-1"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Campaign...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Campaign
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Reset Form
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Platform Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                    <p className="text-muted-foreground">
                      Platform settings and configuration options will be available here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AdminPanel;