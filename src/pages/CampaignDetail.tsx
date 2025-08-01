import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Clock
} from "lucide-react";
import campaignPlaceholder from "@/assets/campaign-placeholder.jpg";

// Mock campaign data
const mockCampaign = {
  id: "1",
  name: "Lunar Prize Pool",
  description: "A massive campaign with multiple prize tiers including exclusive NFTs, cash rewards, and special recognition for top participants. This campaign features the largest prize pool to date with community-driven rewards.",
  image: campaignPlaceholder,
  status: "active" as const,
  softCap: 100000,
  hardCap: 500000,
  currentAmount: 350000,
  ticketAmount: 100,
  participants: 1250,
  prizes: [
    "🥇 1st Place: $10,000 Cash + Exclusive NFT",
    "🥈 2nd Place: $5,000 Cash + Premium NFT", 
    "🥉 3rd Place: $2,500 Cash + Standard NFT",
    "🎁 10 Runner-ups: $500 Each",
    "🎯 Random Draw: 50x $100 SQUDY"
  ],
  startDate: "2024-01-15",
  endDate: "2024-02-15",
  daysLeft: 12,
  socialTasks: [
    { name: "Follow @SqudyOfficial on X", link: "#", completed: false },
    { name: "Like Campaign Tweet", link: "#", completed: false },
    { name: "Retweet Campaign Post", link: "#", completed: false },
    { name: "Join Discord Server", link: "#", completed: false },
    { name: "Join Telegram Group", link: "#", completed: false },
    { name: "Subscribe to Newsletter", link: "#", completed: false },
    { name: "Follow Medium Blog", link: "#", completed: false },
  ]
};

const CampaignDetail = () => {
  const { id } = useParams();
  const campaign = mockCampaign; // In real app, fetch by id
  const progress = (campaign.currentAmount / campaign.hardCap) * 100;
  const isActive = campaign.status === "active";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Campaign Header */}
          <div className="mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Badge 
                    variant={isActive ? "default" : "secondary"}
                    className={`${isActive ? "bg-neon-green text-black" : "bg-muted"} text-sm px-3 py-1`}
                  >
                    {isActive ? "🔥 Active Campaign" : "Finished"}
                  </Badge>
                  {isActive && (
                    <Badge variant="outline" className="text-sm">
                      <Clock className="w-3 h-3 mr-1" />
                      {campaign.daysLeft} days left
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {campaign.name}
                </h1>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {campaign.description}
                </p>

                {isActive && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="neon" size="lg" className="flex-1">
                      <Flame className="w-5 h-5" />
                      Stake SQUDY & Join
                    </Button>
                    <Button variant="outline" size="lg">
                      <ExternalLink className="w-5 h-5" />
                      Buy SQUDY
                    </Button>
                  </div>
                )}
              </div>

              <div className="relative">
                <img 
                  src={campaign.image} 
                  alt={campaign.name}
                  className="w-full aspect-video object-cover rounded-xl border border-primary/20"
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
                        {campaign.currentAmount.toLocaleString()} / {campaign.hardCap.toLocaleString()} SQUDY
                      </span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Soft Cap: {campaign.softCap.toLocaleString()}</span>
                      <span>{progress.toFixed(1)}% Complete</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-xl font-bold text-foreground">{campaign.participants}</div>
                      <div className="text-xs text-muted-foreground">Participants</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <Target className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-xl font-bold text-foreground">{campaign.ticketAmount}</div>
                      <div className="text-xs text-muted-foreground">SQUDY per Ticket</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-xl font-bold text-foreground">{campaign.daysLeft}</div>
                      <div className="text-xs text-muted-foreground">Days Remaining</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Tasks */}
              <Card className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Required Social Tasks
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Complete all tasks to be eligible for the prize draw
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaign.socialTasks.map((task, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          {task.name.includes("X") && <Twitter className="w-4 h-4 text-primary" />}
                          {task.name.includes("Telegram") && <MessageCircle className="w-4 h-4 text-primary" />}
                          {task.name.includes("Medium") && <BookOpen className="w-4 h-4 text-primary" />}
                          {task.name.includes("Newsletter") && <Mail className="w-4 h-4 text-primary" />}
                          {task.name.includes("Discord") && <Users className="w-4 h-4 text-primary" />}
                          <span className="text-foreground">{task.name}</span>
                        </div>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-3 h-3" />
                          Complete
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
                    {campaign.prizes.map((prize, index) => (
                      <div key={index} className="p-3 bg-secondary/20 rounded-lg">
                        <span className="text-sm text-foreground">{prize}</span>
                      </div>
                    ))}
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
                      <span className="text-foreground">{campaign.startDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date</span>
                      <span className="text-foreground">{campaign.endDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Soft Cap</span>
                      <span className="text-foreground">{campaign.softCap.toLocaleString()} SQUDY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hard Cap</span>
                      <span className="text-foreground">{campaign.hardCap.toLocaleString()} SQUDY</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

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