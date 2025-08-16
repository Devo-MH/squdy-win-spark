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
  const [lastOnChainUpdate, setLastOnChainUpdate] = useState<number>(0);
  const [onChainError, setOnChainError] = useState<string | null>(null);

  // Removed API dependency - using only blockchain data
  // The on-chain refresh below will handle all data updates

  // Enhanced on-chain refresh for critical stats
  useEffect(() => {
    let stop = false;
    const run = async () => {
      try {
        const addr = (import.meta as any).env?.VITE_CAMPAIGN_MANAGER_ADDRESS;
        const rpcUrl = (import.meta as any).env?.VITE_RPC_URL;
        if (!addr) return;
        
        // Prefer a fixed read-only RPC to avoid wrong-network wallet providers
        let provider: any = null;
        try {
          if (rpcUrl && ethers.providers?.JsonRpcProvider) {
            provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          } else if ((window as any).ethereum) {
            // Fallback to wallet provider if no RPC configured
            provider = new ethers.providers.Web3Provider((window as any).ethereum);
          }
        } catch (error) {
          console.warn('Failed to create provider:', error);
          return;
        }

        const abi = [
          'function getCampaign(uint256) view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 refundableAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock))',
          'function campaigns(uint256) view returns (uint256 id, string name, string description, string imageUrl, uint256 softCap, uint256 hardCap, uint256 ticketAmount, uint256 currentAmount, uint256 refundableAmount, uint256 startDate, uint256 endDate, uint256 participantCount, string[] prizes, address[] winners, uint8 status, bool tokensAreBurned, uint256 totalBurned, uint256 winnerSelectionBlock)'
        ];
        
        const contract = new ethers.Contract(addr, abi, provider);
        let result: any = null;
        
        // Try getCampaign first, then fallback to campaigns
        try { 
          result = await contract.getCampaign(campaign.contractId); 
        } catch { 
          try { 
            result = await contract.campaigns(campaign.contractId); 
          } catch (error) {
            console.warn(`Failed to fetch campaign ${campaign.contractId} from blockchain:`, error);
            return;
          } 
        }
        
        if (!result || stop) return;

        // Enhanced data parsing with better error handling
        const formatAmount = (value: any): number => {
          try {
            if (ethers.utils?.formatUnits) {
              // ethers v5
              return parseFloat(ethers.utils.formatUnits(value, 18));
            } else if (ethers.formatUnits) {
              // ethers v6
              return parseFloat(ethers.formatUnits(value, 18));
            } else {
              return Number(value?.toString?.() ?? value ?? 0);
            }
          } catch {
            return Number(value?.toString?.() ?? value ?? 0);
          }
        };

        const toNumber = (value: any): number => {
          try {
            const num = Number(value?.toString?.() ?? value ?? 0);
            return Number.isFinite(num) ? num : 0;
          } catch {
            return 0;
          }
        };

        const parseTimestamp = (timestamp: any): Date => {
          try {
            const num = Number(timestamp?.toString?.() ?? timestamp ?? 0);
            // Handle both seconds and milliseconds
            if (num < 1e12) {
              return new Date(num * 1000); // seconds to milliseconds
            } else {
              return new Date(num); // already milliseconds
            }
          } catch {
            return new Date();
          }
        };

        const zeroAddress = '0x0000000000000000000000000000000000000000';
        const winners = Array.isArray(result.winners) 
          ? (result.winners as string[]).filter((w: string) => (w || '').toLowerCase() !== zeroAddress) 
          : (localCampaign as any).winners || [];

        const updatedCampaign = {
          ...localCampaign,
          currentAmount: formatAmount(result.currentAmount ?? localCampaign.currentAmount),
          participantCount: Math.max(0, toNumber(result.participantCount ?? localCampaign.participantCount)),
          hardCap: formatAmount(result.hardCap ?? localCampaign.hardCap),
          softCap: formatAmount(result.softCap ?? localCampaign.softCap),
          winners,
          startDate: parseTimestamp(result.startDate ?? localCampaign.startDate),
          endDate: parseTimestamp(result.endDate ?? localCampaign.endDate),
          tokensAreBurned: Boolean(result.tokensAreBurned ?? (localCampaign as any).tokensAreBurned),
          totalBurned: formatAmount(result.totalBurned ?? (localCampaign as any).totalBurned),
        };

        setLocalCampaign(updatedCampaign);
        setLastOnChainUpdate(Date.now());
        setOnChainError(null);
        
        console.log(`✅ Campaign ${campaign.contractId} on-chain data updated:`, {
          currentAmount: updatedCampaign.currentAmount,
          participantCount: updatedCampaign.participantCount,
          winners: updatedCampaign.winners.length,
          tokensAreBurned: updatedCampaign.tokensAreBurned
        });

      } catch (error) {
        console.error(`❌ Failed to update campaign ${campaign.contractId} from blockchain:`, error);
        setOnChainError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    const handle = setInterval(run, 15000);
    run(); // Run immediately
    
    const focusListener = () => run();
    window.addEventListener('focus', focusListener);
    
    return () => { 
      stop = true; 
      clearInterval(handle); 
      window.removeEventListener('focus', focusListener); 
    };
  }, [campaign.contractId]);
  
  const progress = formatProgress(localCampaign.currentAmount, localCampaign.hardCap);
  const nowMs = Date.now();
  const startMs = new Date(localCampaign.startDate).getTime();
  const endMs = new Date(localCampaign.endDate).getTime();
  const ended = Number.isFinite(endMs) && endMs <= nowMs;
  const started = Number.isFinite(startMs) && startMs <= nowMs;
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const winnersList = Array.isArray((localCampaign as any).winners) ? ((localCampaign as any).winners as string[]) : [];
  const winnersClean = winnersList.filter((w) => typeof w === 'string' && w.toLowerCase() !== zeroAddress);
  const winnersExist = winnersClean.length > 0;
  const burnedFlag = Boolean((localCampaign as any).tokensAreBurned) || Number((localCampaign as any).totalBurned || 0) > 0;
  const derivedStatus = (() => {
    if (!started) return 'pending';
    if (burnedFlag) return 'burned';
    if (ended) return 'finished';
    return 'active';
  })();
  const isActive = derivedStatus === 'active';
  const isFinished = ended && (derivedStatus === 'finished' || derivedStatus === 'burned');
  const hasWinners = ended && winnersClean.length > 0;
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
    // sanitize incoming data (winners, participantCount)
    const safeParticipants = (() => {
      const n = Number((campaign as any).participantCount);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    })();
    const safeWinners = Array.isArray((campaign as any).winners)
      ? ((campaign as any).winners as string[]).filter((w) => (w || '').toLowerCase() !== zeroAddress)
      : (campaign as any).winners;
    setLocalCampaign({
      ...campaign,
      participantCount: safeParticipants,
      winners: safeWinners,
    } as any);
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
          {(() => { const badgeStatus = (derivedStatus === 'ended' ? 'finished' : derivedStatus) as any; return (
          <Badge 
            variant={getCampaignStatusBadge(badgeStatus)}
            className="absolute top-2 right-2 capitalize animate-pulse-glow"
          >
            {derivedStatus}
          </Badge>
          ); })()}
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
        {/* Progress - hidden when finished or burned */}
        {!(derivedStatus === 'finished' || derivedStatus === 'burned') && (
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
        )}

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

        {/* Winners preview - only after campaign has ended and winners exist */}
        {hasWinners && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="w-4 h-4 text-campaign-success" />
              <span className="font-medium text-foreground">Winners</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {winnersClean.slice(0, 3).map((addr, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {addr.slice(0, 6)}...{addr.slice(-4)}
                </Badge>
              ))}
              {winnersClean.length > 3 && (
                <Badge variant="outline" className="text-xs">+{winnersClean.length - 3} more</Badge>
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
                campaign: localCampaign 
              });
              console.log(`Navigating to: /campaigns/${localCampaign.contractId}`);
            }}
          >
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