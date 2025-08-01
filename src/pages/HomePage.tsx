import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import CampaignCard from "@/components/CampaignCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import campaignPlaceholder from "@/assets/campaign-placeholder.jpg";

// Mock data for campaigns
const mockCampaigns = [
  {
    id: "1",
    name: "Lunar Prize Pool",
    description: "A massive campaign with multiple prize tiers including exclusive NFTs and cash rewards.",
    image: campaignPlaceholder,
    status: "active" as const,
    softCap: 100000,
    hardCap: 500000,
    currentAmount: 350000,
    ticketAmount: 100,
    participants: 1250,
    prizes: ["$10,000 Cash", "Exclusive NFTs", "SQUDY Tokens"],
    startDate: "2024-01-15",
    endDate: "2024-02-15",
    daysLeft: 12,
  },
  {
    id: "2",
    name: "DeFi Champions",
    description: "Compete with other DeFi enthusiasts for amazing rewards and recognition.",
    image: campaignPlaceholder,
    status: "active" as const,
    softCap: 50000,
    hardCap: 200000,
    currentAmount: 180000,
    ticketAmount: 50,
    participants: 890,
    prizes: ["$5,000 Cash", "Gaming Gear", "Merchandise"],
    startDate: "2024-01-20",
    endDate: "2024-02-20",
    daysLeft: 18,
  },
  {
    id: "3",
    name: "Genesis Burn",
    description: "The first ever SQUDY burn campaign that started it all.",
    image: campaignPlaceholder,
    status: "finished" as const,
    softCap: 75000,
    hardCap: 300000,
    currentAmount: 300000,
    ticketAmount: 75,
    participants: 2100,
    prizes: ["$15,000 Cash", "Hardware Wallets", "Premium Memberships"],
    startDate: "2023-12-01",
    endDate: "2023-12-31",
  },
];

const HomePage = () => {
  const activeCampaigns = mockCampaigns.filter(c => c.status === "active");
  const finishedCampaigns = mockCampaigns.filter(c => c.status === "finished");

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
            {activeCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
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
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="neon" size="lg">
                <ExternalLink className="w-5 h-5" />
                Buy on PancakeSwap
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
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;