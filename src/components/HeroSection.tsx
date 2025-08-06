import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Flame, Target, Users, Trophy, ArrowRight, ExternalLink } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen bg-gradient-hero flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-neon-blue/10" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center space-y-8">
          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Burn to Win
              </span>
              <br />
              <span className="text-foreground">with SQUDY</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Stake your SQUDY tokens, complete social tasks, and compete for amazing prizes while contributing to token deflation through our innovative burn mechanism.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/campaigns">
              <Button variant="neon" size="lg" className="text-lg px-8 py-6">
                <Flame className="w-6 h-6" />
                Explore Campaigns
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="https://pancakeswap.finance" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                <ExternalLink className="w-5 h-5" />
                Buy SQUDY on PancakeSwap
              </Button>
            </a>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
            <Card className="bg-muted/50 border-border/50 hover:bg-muted/70 hover:scale-105 transition-all duration-300 rounded-lg animate-slide-up">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-campaign-primary/20 rounded-lg w-fit mx-auto mb-3">
                  <Target className="w-8 h-8 text-campaign-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">12</div>
                <div className="text-sm text-muted-foreground">Active Campaigns</div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50 border-border/50 hover:bg-muted/70 hover:scale-105 transition-all duration-300 rounded-lg animate-slide-up">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-campaign-info/20 rounded-lg w-fit mx-auto mb-3">
                  <Users className="w-8 h-8 text-campaign-info" />
                </div>
                <div className="text-2xl font-bold text-foreground">2.5K+</div>
                <div className="text-sm text-muted-foreground">Participants</div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50 border-border/50 hover:bg-muted/70 hover:scale-105 transition-all duration-300 rounded-lg animate-slide-up">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-campaign-warning/20 rounded-lg w-fit mx-auto mb-3">
                  <Flame className="w-8 h-8 text-campaign-warning" />
                </div>
                <div className="text-2xl font-bold text-foreground">15M+</div>
                <div className="text-sm text-muted-foreground">SQUDY Burned</div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50 border-border/50 hover:bg-muted/70 hover:scale-105 transition-all duration-300 rounded-lg animate-slide-up">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-campaign-success/20 rounded-lg w-fit mx-auto mb-3">
                  <Trophy className="w-8 h-8 text-campaign-success" />
                </div>
                <div className="text-2xl font-bold text-foreground">$50K+</div>
                <div className="text-sm text-muted-foreground">Prizes Awarded</div>
              </CardContent>
            </Card>
          </div>

          {/* How it Works */}
          <div className="mt-20 space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground">Stake SQUDY</h3>
                <p className="text-muted-foreground">
                  Purchase SQUDY tokens and stake them in campaign pools to earn tickets for the lottery.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground">Complete Tasks</h3>
                <p className="text-muted-foreground">
                  Follow social media accounts, engage with content, and complete required tasks to become eligible.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground">Win & Burn</h3>
                <p className="text-muted-foreground">
                  Win amazing prizes while all staked tokens are burned, reducing supply and benefiting holders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;