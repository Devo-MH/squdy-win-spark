import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Settings, 
  Users, 
  Target, 
  Calendar,
  DollarSign,
  Flame,
  Shield,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";

const AdminPanel = () => {
  const [isCreating, setIsCreating] = useState(false);

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
                    <p className="text-2xl font-bold text-foreground">12</p>
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
                    <p className="text-2xl font-bold text-foreground">2,547</p>
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
                    <p className="text-2xl font-bold text-foreground">15.2M</p>
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
                    <p className="text-2xl font-bold text-foreground">$52.8K</p>
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
                  <CardTitle>Active Campaigns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-secondary/20 rounded">
                      <span className="text-sm">Lunar Prize Pool</span>
                      <Badge variant="outline" className="bg-neon-green/20 text-neon-green">
                        Active
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-secondary/20 rounded">
                      <span className="text-sm">DeFi Champions</span>
                      <Badge variant="outline" className="bg-neon-green/20 text-neon-green">
                        Active
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-secondary/20 rounded">
                      <span className="text-sm">Genesis Burn</span>
                      <Badge variant="outline" className="bg-muted">
                        Finished
                      </Badge>
                    </div>
                  </div>
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