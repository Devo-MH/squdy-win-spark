import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import CampaignCard from "@/components/CampaignCard";
import { MockTokenBanner } from "@/components/MockTokenBanner";
import { DebugPanel } from "@/components/DebugPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ExternalLink, TrendingUp, Users, Flame, Trophy, AlertCircle, DollarSign, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useSocket } from "@/services/socket";
import { useEffect } from "react";
import { toast } from "sonner";
import { tokenInfo, campaignStats } from "@/services/mockData";
import { useWeb3 } from "@/contexts/Web3Context";
import { useContracts } from "@/services/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { campaignKeys } from "@/hooks/useCampaigns";

const HomePage = () => {
  const socket = useSocket();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { provider, signer } = useWeb3();
  const contractService = useContracts(provider, signer);
  
  // Show more campaigns if we're on /campaigns route
  const isOnCampaignsPage = location.pathname === '/campaigns';
  const campaignLimit = isOnCampaignsPage ? 20 : 6;
  
  const { 
    data: campaignsData, 
    isLoading, 
    error,
    refetch 
  } = useCampaigns({ limit: campaignLimit });

  // Force refresh campaigns cache
  const forceRefreshCampaigns = () => {
    console.log('🔄 Force refreshing campaigns cache...');
    queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    refetch();
    toast.success("Refreshing campaigns...");
  };

  const campaigns = campaignsData?.campaigns || [];
  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const finishedCampaigns = campaigns.filter(c => c.status === "finished");

  // Auto-scroll to campaigns section if on /campaigns route
  useEffect(() => {
    if (isOnCampaignsPage) {
      const timer = setTimeout(() => {
        const campaignsSection = document.getElementById('campaigns-section');
        if (campaignsSection) {
          campaignsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOnCampaignsPage]);

  // Listen for real-time campaign updates
  useEffect(() => {
    if (!socket.isConnected()) return;

    const handleCampaignCreated = (data: any) => {
      toast.success(`New campaign "${data.name}" has been created!`);
      // Force refresh campaigns immediately
      forceRefreshCampaigns();
    };

    socket.onCampaignCreated(handleCampaignCreated);

    return () => {
      socket.off('campaign:created', handleCampaignCreated);
    };
  }, [socket, queryClient]);

  // Campaign cards loading skeleton
  const CampaignSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section - only show on homepage */}
      {!isOnCampaignsPage && <HeroSection />}

      {/* Mock Token Banner */}
      <div className="container mx-auto px-4 py-4">
        <MockTokenBanner contractService={contractService} />
      </div>

      {/* Active Campaigns Section */}
      <section id="campaigns-section" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                {isOnCampaignsPage ? '🚀 All Available Campaigns' : '🔥 Active Campaigns'}
              </h2>
              <Button 
                onClick={forceRefreshCampaigns}
                variant="outline" 
                size="sm"
                className="gap-2"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {isOnCampaignsPage 
                ? 'Explore all campaigns, stake your SQUDY tokens, and compete for amazing prizes in our deflationary ecosystem.'
                : 'Join ongoing campaigns, stake your SQUDY tokens, and compete for amazing prizes while contributing to token deflation.'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, index) => (
                <CampaignSkeleton key={index} />
              ))
            ) : error ? (
              // Error state
              <div className="col-span-full text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load campaigns</h3>
                <p className="text-muted-foreground mb-4">There was an error loading the campaign data.</p>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : isOnCampaignsPage ? (
              // All campaigns page - show all campaigns
              campaigns.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Campaigns Available</h3>
                  <p className="text-muted-foreground">Check back soon for new burn-to-win campaigns!</p>
                </div>
              ) : (
                campaigns.map((campaign) => (
                  <CampaignCard key={campaign.id || campaign.contractId} campaign={campaign} />
                ))
              )
            ) : activeCampaigns.length === 0 ? (
              // No active campaigns
              <div className="col-span-full text-center py-12">
                <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Campaigns</h3>
                <p className="text-muted-foreground">Check back soon for new burn-to-win campaigns!</p>
              </div>
            ) : (
              // Active campaigns only (homepage)
              activeCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id || campaign.contractId} campaign={campaign} />
              ))
            )}
          </div>

          {/* Only show "View All Campaigns" button on homepage */}
          {!isOnCampaignsPage && (
            <div className="text-center">
              <Link to="/campaigns">
                <Button variant="outline" size="lg">
                  View All Campaigns
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* About SQUDY Section - only show on homepage */}
      {!isOnCampaignsPage && (
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              About SQUDY Token
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              SQUDY is a deflationary utility token that powers our unique burn-to-win ecosystem. 
              Every campaign burns staked tokens, creating a continuous deflationary pressure that benefits all holders. 
              Our platform combines the excitement of lottery-style competitions with the economic benefits of token burning mechanisms.
            </p>
            
            {/* Token Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <Card className="bg-muted/50 border-border/50 hover:bg-muted/70 hover:scale-105 transition-all duration-300 rounded-lg">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-campaign-warning/20 rounded-lg w-fit mx-auto mb-3">
                    <Flame className="w-6 h-6 text-campaign-warning" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {tokenInfo.burnedAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Tokens Burned</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50 border-border/50 hover:bg-muted/70 hover:scale-105 transition-all duration-300 rounded-lg">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-campaign-success/20 rounded-lg w-fit mx-auto mb-3">
                    <DollarSign className="w-6 h-6 text-campaign-success" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    ${tokenInfo.priceUSD?.toFixed(4)}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Price</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50 border-border/50 hover:bg-muted/70 hover:scale-105 transition-all duration-300 rounded-lg">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-campaign-info/20 rounded-lg w-fit mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-campaign-info" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {campaignStats.totalBurned.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Campaign Burns</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50 border-border/50 hover:bg-muted/70 hover:scale-105 transition-all duration-300 rounded-lg">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-campaign-primary/20 rounded-lg w-fit mx-auto mb-3">
                    <Users className="w-6 h-6 text-campaign-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {campaignStats.totalParticipants.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Participants</div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="neon" size="lg" asChild>
                <a href={tokenInfo.pancakeSwapUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-5 h-5" />
                  Buy on PancakeSwap
                </a>
              </Button>
              <Button variant="outline" size="lg">
                View Tokenomics
              </Button>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Recent Campaigns - only show on homepage */}
      {!isOnCampaignsPage && (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              🏆 Recently Finished
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Check out the results from our previous campaigns and see what amazing prizes were awarded to our community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {finishedCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id || campaign.contractId} campaign={campaign} />
            ))}
          </div>
        </div>
      </section>
      )}

      <Footer />
      <DebugPanel />
    </div>
  );
};

export default HomePage;