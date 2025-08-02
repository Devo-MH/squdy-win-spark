import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import CampaignCard from "@/components/CampaignCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ExternalLink, TrendingUp, Users, Flame, Trophy, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useSocket } from "@/services/socket";
import { useEffect } from "react";
import { toast } from "sonner";
import { tokenInfo, campaignStats } from "@/services/mockData";

const HomePage = () => {
  const socket = useSocket();
  const { 
    data: campaignsData, 
    isLoading, 
    error,
    refetch 
  } = useCampaigns({ limit: 6 });

  const campaigns = campaignsData?.campaigns || [];
  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const finishedCampaigns = campaigns.filter(c => c.status === "finished");

  // Listen for real-time campaign updates
  useEffect(() => {
    if (!socket.isConnected()) return;

    const handleCampaignCreated = (data: any) => {
      toast.success(`New campaign "${data.name}" has been created!`);
      refetch();
    };

    socket.onCampaignCreated(handleCampaignCreated);

    return () => {
      socket.off('campaign:created', handleCampaignCreated);
    };
  }, [socket, refetch]);

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
      
      <HeroSection />

      {/* Active Campaigns Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              🔥 Active Campaigns
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join ongoing campaigns, stake your SQUDY tokens, and compete for amazing prizes while contributing to token deflation.
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
            ) : activeCampaigns.length === 0 ? (
              // No active campaigns
              <div className="col-span-full text-center py-12">
                <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Campaigns</h3>
                <p className="text-muted-foreground">Check back soon for new burn-to-win campaigns!</p>
              </div>
            ) : (
              // Active campaigns
              activeCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id || campaign.contractId} campaign={campaign} />
              ))
            )}
          </div>

          <div className="text-center">
            <Link to="/campaigns">
              <Button variant="outline" size="lg">
                View All Campaigns
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About SQUDY Section */}
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
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  {tokenInfo.burnedAmount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Tokens Burned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  ${tokenInfo.priceUSD?.toFixed(4)}
                </div>
                <div className="text-sm text-muted-foreground">Current Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  {campaignStats.totalBurned.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Campaign Burns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  {campaignStats.totalParticipants.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Participants</div>
              </div>
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

      {/* Recent Campaigns */}
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

      <Footer />
    </div>
  );
};

export default HomePage;