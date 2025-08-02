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
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns, getCampaignStatusBadge } from "@/hooks/useCampaigns";
import { adminAPI, Campaign } from "@/services/api";
import { useSocket } from "@/services/socket";
import { toast } from "sonner";

const AdminPanel = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  
  // Web3 and Auth
  const { account, isConnected } = useWeb3();
  const { isAuthenticated, requireAuth } = useAuth();
  
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
    socialRequirements: {
      twitter: {
        followAccount: '@SqudyToken',
        likePostId: '',
        retweetPostId: ''
      },
      discord: {
        serverId: '',
        inviteLink: ''
      },
      telegram: {
        groupId: '',
        inviteLink: ''
      },
      medium: {
        profileUrl: 'https://medium.com/@squdy'
      },
      newsletter: {
        endpoint: 'https://squdy.com/newsletter'
      }
    }
  });
  
  const campaigns = campaignsData?.campaigns || [];

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

    if (new Date(formData.startDate) <= new Date()) {
      toast.error("Start date must be in the future");
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error("End date must be after start date");
      return;
    }

    setIsCreating(true);
    try {
      await adminAPI.createCampaign({
        name: formData.name,
        description: formData.description,
        imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop',
        softCap: parseFloat(formData.softCap),
        hardCap: parseFloat(formData.hardCap),
        ticketAmount: parseFloat(formData.ticketAmount),
        startDate: formData.startDate,
        endDate: formData.endDate,
        prizes: formData.prizes.filter(p => p.name && p.value),
        socialRequirements: formData.socialRequirements,
      });

      setShowCreateForm(false);
      resetForm();
      refetchCampaigns();
      
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
      socialRequirements: {
        twitter: {
          followAccount: '@SqudyToken',
          likePostId: '',
          retweetPostId: ''
        },
        discord: {
          serverId: '',
          inviteLink: ''
        },
        telegram: {
          groupId: '',
          inviteLink: ''
        },
        medium: {
          profileUrl: 'https://medium.com/@squdy'
        },
        newsletter: {
          endpoint: 'https://squdy.com/newsletter'
        }
      }
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

  const handleCampaignAction = async (campaignId: number, action: 'activate' | 'pause' | 'close' | 'select-winners' | 'burn') => {
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
        case 'close':
          await adminAPI.closeCampaign(campaignId);
          toast.success("Campaign closed successfully!");
          break;
        case 'select-winners':
          await adminAPI.selectWinners(campaignId);
          toast.success("Winner selection initiated!");
          break;
        case 'burn':
          await adminAPI.burnTokens(campaignId);
          toast.success("Token burning completed!");
          break;
      }
      
      refetchCampaigns();
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
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Campaign Management
                  </CardTitle>
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
                                target.src = "/placeholder.svg";
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
                            
                            {campaign.status === 'finished' && (
                              <>
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
                                  Burn
                                </Button>
                              </>
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
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create New Campaign
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
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