import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, Target, Flame, Trophy, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Campaign } from "@/services/api";
import { getCampaignStatusBadge, formatTimeLeft, formatProgress } from "@/hooks/useCampaigns";
import { useEffect, useState } from "react";
import { useSocket } from "@/services/socket";

interface CampaignCardProps {
  campaign: Campaign;
}

const CampaignCard = ({ campaign }: CampaignCardProps) => {
  const socket = useSocket();
  const [localCampaign, setLocalCampaign] = useState(campaign);
  
  const progress = formatProgress(localCampaign.currentAmount, localCampaign.hardCap);
  const isActive = localCampaign.status === "active";
  const isFinished = localCampaign.status === "finished" || localCampaign.status === "burned";
  const timeLeft = formatTimeLeft(localCampaign.endDate);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket.isConnected()) return;

    const handleUserStaked = (data: any) => {
      if (data.campaignId === localCampaign.contractId) {
        setLocalCampaign(prev => ({
          ...prev,
          currentAmount: prev.currentAmount + parseFloat(data.amount),
          participantCount: prev.participantCount + 1,
        }));
      }
    };

    socket.onUserStaked(handleUserStaked);

    return () => {
      socket.off('campaign:user-staked', handleUserStaked);
    };
  }, [socket, localCampaign.contractId]);

  // Update local state when campaign prop changes
  useEffect(() => {
    setLocalCampaign(campaign);
  }, [campaign]);

  return (
    <Card className="bg-muted/50 border-border/50 hover:bg-muted/70 hover:scale-105 transition-all duration-300 hover:shadow-neon group rounded-lg">
      <CardHeader className="pb-3">
        <div className="aspect-video bg-campaign-primary/20 rounded-lg mb-4 overflow-hidden relative">
          <img 
            src={localCampaign.imageUrl} 
            alt={localCampaign.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop";
            }}
          />
          <Badge 
            variant={getCampaignStatusBadge(localCampaign.status)}
            className="absolute top-2 right-2 capitalize animate-pulse-glow"
          >
            {localCampaign.status}
          </Badge>
          {localCampaign.status === 'burned' && (
            <Badge 
              variant="destructive"
              className="absolute top-2 left-2 bg-campaign-warning text-white animate-pulse-glow"
            >
              <Flame className="w-3 h-3 mr-1" />
              Burned
            </Badge>
          )}
        </div>
        <CardTitle className="text-2xl font-bold text-foreground group-hover:text-campaign-primary transition-colors">
          {localCampaign.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {localCampaign.description}
        </p>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground font-medium">
              {Number(localCampaign.currentAmount).toLocaleString()} / {Number(localCampaign.hardCap).toLocaleString()} SQUDY
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {progress.toFixed(1)}% of goal reached
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-campaign-primary/20 rounded-lg">
              <Target className="w-4 h-4 text-campaign-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ticket Price</p>
              <p className="text-2xl font-bold">{Number(localCampaign.ticketAmount).toLocaleString()} SQUDY</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-campaign-info/20 rounded-lg">
              <Users className="w-4 h-4 text-campaign-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Participants</p>
              <p className="text-2xl font-bold">{localCampaign.participantCount}</p>
            </div>
          </div>
        </div>

        {/* Prizes */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-campaign-success/20 rounded-lg">
              <Trophy className="w-4 h-4 text-campaign-success" />
            </div>
            <p className="text-sm font-medium text-foreground">Prize Pool</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {localCampaign.prizes?.slice(0, 2).map((prize, index) => (
              <Badge key={index} variant="outline" className="text-xs border-campaign-success/30 text-campaign-success">
                {prize.value.toLocaleString()} {prize.currency}
              </Badge>
            )) || (
              <Badge variant="outline" className="text-xs border-campaign-info/30 text-campaign-info">
                Prizes to be announced
              </Badge>
            )}
            {localCampaign.prizes && localCampaign.prizes.length > 2 && (
              <Badge variant="outline" className="text-xs border-campaign-info/30 text-campaign-info">
                +{localCampaign.prizes.length - 2} more
              </Badge>
            )}
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-campaign-success/20' : 'bg-muted/50'}`}>
              {isActive ? (
                <Clock className="w-4 h-4 text-campaign-success" />
              ) : (
                <Calendar className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isActive ? 'Time Left' : 'End Date'}</p>
              <p className={`text-sm font-bold ${isActive ? 'text-campaign-success' : 'text-muted-foreground'}`}>
                {isActive ? timeLeft : new Date(localCampaign.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          {localCampaign.bscScanUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.preventDefault();
                window.open(localCampaign.bscScanUrl, '_blank');
              }}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Total Burned (if applicable) */}
        {localCampaign.status === 'burned' && localCampaign.totalBurned > 0 && (
          <div className="flex items-center gap-2 text-sm bg-red-500/10 p-2 rounded border border-red-500/20">
            <Flame className="w-4 h-4 text-red-500" />
            <span className="text-red-400 font-medium">
              {Number(localCampaign.totalBurned).toLocaleString()} SQUDY burned
            </span>
          </div>
        )}

        {/* Action Button */}
        <Link to={`/campaigns/${localCampaign.contractId}`} className="block">
          <Button 
            variant={isActive ? "neon" : "outline"} 
            className="w-full"
            disabled={!isActive && !isFinished}
          >
            {isActive ? (
              <>
                <Flame className="w-4 h-4" />
                Join Campaign
              </>
            ) : isFinished ? (
              "View Results"
            ) : (
              "Coming Soon"
            )}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default CampaignCard;
export default CampaignCard;