import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, Target, Flame } from "lucide-react";
import { Link } from "react-router-dom";

interface Campaign {
  id: string;
  name: string;
  description: string;
  image: string;
  status: "active" | "finished";
  softCap: number;
  hardCap: number;
  currentAmount: number;
  ticketAmount: number;
  participants: number;
  prizes: string[];
  startDate: string;
  endDate: string;
  daysLeft?: number;
}

interface CampaignCardProps {
  campaign: Campaign;
}

const CampaignCard = ({ campaign }: CampaignCardProps) => {
  const progress = (campaign.currentAmount / campaign.hardCap) * 100;
  const isActive = campaign.status === "active";

  return (
    <Card className="bg-gradient-card border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-neon group">
      <CardHeader className="pb-4">
        <div className="aspect-video bg-secondary/30 rounded-lg mb-4 overflow-hidden relative">
          <img 
            src={campaign.image} 
            alt={campaign.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={`absolute top-2 right-2 ${isActive ? "bg-neon-green text-black" : "bg-muted"}`}
          >
            {isActive ? "Active" : "Finished"}
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          {campaign.name}
        </CardTitle>
        <p className="text-muted-foreground text-sm line-clamp-2">
          {campaign.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground font-medium">
              {campaign.currentAmount.toLocaleString()} / {campaign.hardCap.toLocaleString()} SQUDY
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <div>
              <p className="text-muted-foreground">Ticket</p>
              <p className="font-medium">{campaign.ticketAmount.toLocaleString()} SQUDY</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <div>
              <p className="text-muted-foreground">Participants</p>
              <p className="font-medium">{campaign.participants}</p>
            </div>
          </div>
        </div>

        {/* Prizes */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Prize Pool</p>
          <div className="flex flex-wrap gap-1">
            {campaign.prizes.slice(0, 2).map((prize, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {prize}
              </Badge>
            ))}
            {campaign.prizes.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{campaign.prizes.length - 2} more
              </Badge>
            )}
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-primary" />
          {isActive ? (
            <span className="text-neon-green font-medium">
              {campaign.daysLeft} days left
            </span>
          ) : (
            <span className="text-muted-foreground">
              Ended {campaign.endDate}
            </span>
          )}
        </div>

        {/* Action Button */}
        <Link to={`/campaigns/${campaign.id}`} className="block">
          <Button 
            variant={isActive ? "neon" : "outline"} 
            className="w-full"
            disabled={!isActive}
          >
            {isActive ? (
              <>
                <Flame className="w-4 h-4" />
                Join Campaign
              </>
            ) : (
              "View Results"
            )}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default CampaignCard;