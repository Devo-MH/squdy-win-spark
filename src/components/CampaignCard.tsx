import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, Target, Flame, Trophy, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Campaign } from "@/services/api";
import { getCampaignStatusBadge, formatTimeLeft, formatProgress } from "@/hooks/useCampaigns";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useSocket } from "@/services/socket";

interface CampaignCardProps {
  campaign: Campaign;
}

const CampaignCard = ({ campaign }: CampaignCardProps) => {
  const socket = useSocket();
  const [localCampaign, setLocalCampaign] = useState(campaign);
  // periodic light refresh to keep cards closer to real data when sockets are off
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaign.contractId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setLocalCampaign((prev) => ({ ...prev, ...(data?.campaign || {}) }));
      } catch {}
    };
    const id = setInterval(refresh, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [campaign.contractId]);

  // Optional on-chain light refresh for critical stats when wallet/provider exists
  useEffect(() => {
    let stop = false;
    const run = async () => {
      try {
        const addr = (import.meta as any).env?.VITE_CAMPAIGN_MANAGER_ADDRESS;
        if (!addr || !(window as any).ethereum) return;
        const provider = new ethers.providers.Web3Provider((window as any).ethereum as any);
        const abi = [
          'function getCampaign(uint256) view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock))',
          'function campaigns(uint256) view returns (uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock)'
        ];
        const c = new ethers.Contract(addr, abi, provider);
        let r: any = null;
        try { r = await c.getCampaign(campaign.contractId); } catch { try { r = await c.campaigns(campaign.contractId); } catch {} }
        if (!r || stop) return;
        const fmt = (v: any) => {
          try { return parseFloat(ethers.utils.formatUnits(v, 18)); } catch { return Number(v?.toString?.() ?? v ?? 0); }
        };
        const toNum = (v: any) => {
          try { return Number(v?.toString?.() ?? v ?? 0); } catch { return 0; }
        };
        setLocalCampaign(prev => ({
          ...prev,
          currentAmount: fmt(r.currentAmount ?? prev.currentAmount),
          participantCount: toNum(r.participantCount ?? prev.participantCount),
          hardCap: fmt(r.hardCap ?? prev.hardCap),
          softCap: fmt(r.softCap ?? prev.softCap),
        }));
      } catch {}
    };
    const handle = setInterval(run, 25000);
    run();
    return () => { stop = true; clearInterval(handle); };
  }, [campaign.contractId]);
  
  const progress = formatProgress(localCampaign.currentAmount, localCampaign.hardCap);
  const nowMs = Date.now();
  const startMs = new Date(localCampaign.startDate).getTime();
  const endMs = new Date(localCampaign.endDate).getTime();
  const ended = Number.isFinite(endMs) && endMs <= nowMs;
  const started = Number.isFinite(startMs) && startMs <= nowMs;
  const winnersExist = Array.isArray((localCampaign as any).winners) && (localCampaign as any).winners.length > 0;
  const derivedStatus = (() => {
    if (!started) return 'pending';
    if (ended) return localCampaign.status === 'burned' ? 'burned' : (winnersExist ? 'finished' : 'ended');
    return 'active';
  })();
  const isActive = derivedStatus === 'active';
  const isFinished = derivedStatus === 'finished' || derivedStatus === 'burned' || derivedStatus === 'ended';
  const hasWinners = Array.isArray((localCampaign as any).winners) && (localCampaign as any).winners.length > 0;
  const timeLeft = formatTimeLeft(localCampaign.endDate);
  const startsIn = formatTimeLeft(localCampaign.startDate);

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
            variant={getCampaignStatusBadge(derivedStatus)}
            className="absolute top-2 right-2 capitalize animate-pulse-glow"
          >
            {derivedStatus}
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
              <p className="text-sm text-muted-foreground">{!started ? 'Starts In' : (isActive ? 'Time Left' : 'Ended')}</p>
              <p className={`text-sm font-bold ${!started ? 'text-yellow-400' : isActive ? 'text-campaign-success' : 'text-muted-foreground'}`}>
                {!started ? startsIn : (isActive ? timeLeft : new Date(localCampaign.endDate).toLocaleString())}
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

        {/* Winners preview */}
        {hasWinners && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="w-4 h-4 text-campaign-success" />
              <span className="font-medium text-foreground">Winners</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {((localCampaign as any).winners as string[]).slice(0, 3).map((addr, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {addr.slice(0, 6)}...{addr.slice(-4)}
                </Badge>
              ))}
              {((localCampaign as any).winners as string[]).length > 3 && (
                <Badge variant="outline" className="text-xs">+{((localCampaign as any).winners as string[]).length - 3} more</Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        {Number(localCampaign.contractId) > 0 ? (
          <Link 
            to={`/campaigns/${localCampaign.contractId}`} 
            className="block"
            onClick={() => {
              console.log('Campaign card clicked:', { 
                contractId: localCampaign.contractId, 
                id: localCampaign.id,
                campaign: localCampaign 
              });
              console.log(`Navigating to: /campaigns/${localCampaign.contractId}`);
            }}
          >
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
        ) : (
          <Button 
            variant={isActive ? "neon" : "outline"} 
            className="w-full"
            disabled
            onClick={() => {
              console.warn('Campaign not ready: missing contractId', localCampaign);
              alert('This campaign is still syncing. Please refresh in a few seconds.');
            }}
          >
            {isActive ? (
              <>
                <Flame className="w-4 h-4" />
                Syncing...
              </>
            ) : isFinished ? (
              "View Results"
            ) : (
              "Coming Soon"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignCard;