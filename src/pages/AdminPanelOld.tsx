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
  Unlock
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
        imageUrl: formData.imageUrl || 'https://via.placeholder.com/400x300',
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Admin Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Admin Panel
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary">
                Whitelisted Admin
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Manage campaigns, monitor platform activity, and oversee burn mechanisms.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Target className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{campaignStats.activeCampaigns}</p>
                    <p className="text-sm text-muted-foreground">Active Campaigns</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-neon-blue" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{campaignStats.totalParticipants.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Participants</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Flame className="w-8 h-8 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{campaignStats.totalBurned.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">SQUDY Burned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-neon-green" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">${campaignStats.totalPrizesAwarded.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Prizes Awarded</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Campaign Form */}
            <div className="lg:col-span-2">
              <Card className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Create New Campaign
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Launch a new burn-to-win campaign for the community
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Campaign Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Campaign Name *</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g., Lunar Prize Pool" 
                        className="bg-secondary/20 border-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (days) *</Label>
                      <Input 
                        id="duration" 
                        type="number" 
                        placeholder="30" 
                        className="bg-secondary/20 border-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Describe the campaign, its goals, and what makes it special..."
                      className="bg-secondary/20 border-primary/20 min-h-[100px]"
                    />
                  </div>

                  {/* Token Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="softCap">Soft Cap (SQUDY) *</Label>
                      <Input 
                        id="softCap" 
                        type="number" 
                        placeholder="100000" 
                        className="bg-secondary/20 border-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hardCap">Hard Cap (SQUDY) *</Label>
                      <Input 
                        id="hardCap" 
                        type="number" 
                        placeholder="500000" 
                        className="bg-secondary/20 border-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticketAmount">Ticket Amount (SQUDY) *</Label>
                      <Input 
                        id="ticketAmount" 
                        type="number" 
                        placeholder="100" 
                        className="bg-secondary/20 border-primary/20"
                      />
                    </div>
                  </div>

                  {/* Prizes */}
                  <div className="space-y-2">
                    <Label htmlFor="prizes">Prize Pool *</Label>
                    <Textarea 
                      id="prizes" 
                      placeholder="1st Place: $10,000 Cash + NFT&#10;2nd Place: $5,000 Cash&#10;3rd Place: $2,500 Cash&#10;..."
                      className="bg-secondary/20 border-primary/20"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter each prize on a new line
                    </p>
                  </div>

                  {/* Social Media Links */}
                  <div className="space-y-4">
                    <Label>Social Media Campaign Links</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        placeholder="X (Twitter) Tweet URL" 
                        className="bg-secondary/20 border-primary/20"
                      />
                      <Input 
                        placeholder="Telegram Group/Post URL" 
                        className="bg-secondary/20 border-primary/20"
                      />
                      <Input 
                        placeholder="Discord Server Invite" 
                        className="bg-secondary/20 border-primary/20"
                      />
                      <Input 
                        placeholder="Medium Blog Post URL" 
                        className="bg-secondary/20 border-primary/20"
                      />
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input 
                      id="startDate" 
                      type="datetime-local" 
                      className="bg-secondary/20 border-primary/20"
                    />
                  </div>

                  {/* Warning */}
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">⚠️ Smart Contract Deployment Required</p>
                        <p className="text-xs text-muted-foreground">
                          Creating a campaign will deploy a new smart contract. Ensure all parameters are correct before deployment as they cannot be changed later.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button variant="neon" className="flex-1">
                      <Plus className="w-4 h-4" />
                      Deploy Campaign Contract
                    </Button>
                    <Button variant="outline">
                      Save as Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Admin Tools Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="w-4 h-4" />
                    Pause Campaign
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4" />
                    Select Winners
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-destructive">
                    <Flame className="w-4 h-4" />
                    Execute Token Burn
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4" />
                    Close Campaign
                  </Button>
                </CardContent>
              </Card>

              {/* Campaign Management */}
              <Card className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Campaigns
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCreateForm(!showCreateForm)}
                    >
                      <Plus className="w-4 h-4" />
                      {showCreateForm ? 'Cancel' : 'Create'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="p-3 bg-secondary/20 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{campaign.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {campaign.participants} participants • {campaign.currentAmount.toLocaleString()} SQUDY
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={
                            campaign.status === 'active' ? 'bg-neon-green/20 text-neon-green' :
                            campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-500' :
                            campaign.status === 'finished' ? 'bg-muted' :
                            'bg-blue-500/20 text-blue-500'
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedCampaign(campaign)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        
                        {campaign.status === 'draft' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCampaignAction(campaign.id, 'start')}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                        
                        {campaign.status === 'active' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCampaignAction(campaign.id, 'pause')}
                            >
                              <Pause className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCampaignAction(campaign.id, 'finish')}
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        
                        {campaign.status === 'paused' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCampaignAction(campaign.id, 'start')}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                        
                        {campaign.status === 'finished' && !campaign.winners && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCampaignAction(campaign.id, 'select-winners')}
                            >
                              <Trophy className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCampaignAction(campaign.id, 'burn')}
                            >
                              <Flame className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Platform Settings */}
              <Card className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    Manage Whitelist
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    Update Token Contract
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    Platform Analytics
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    Export Data
                  </Button>
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

export default AdminPanel;