import React from 'react';
import { Trophy, Medal, Award, Star, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Prize {
  name: string;
  description: string;
  value: number;
  currency: string;
  quantity: number;
}

interface PrizePoolProps {
  prizes: Prize[];
}

export function PrizePool({ prizes }: PrizePoolProps) {
  const totalPrizePool = prizes.reduce((total, prize) => total + (prize.value * prize.quantity), 0);

  const getPrizeIcon = (index: number) => {
    switch (index) {
      case 0:
        return Trophy;
      case 1:
        return Medal;
      case 2:
        return Award;
      default:
        return Star;
    }
  };

  const getPrizeColors = (index: number) => {
    switch (index) {
      case 0:
        return {
          iconColor: 'text-campaign-warning',
          bgColor: 'bg-campaign-warning/10',
          borderColor: 'border-campaign-warning/20',
          gradientFrom: 'from-campaign-warning/20',
          gradientTo: 'to-campaign-warning/5'
        };
      case 1:
        return {
          iconColor: 'text-gray-300',
          bgColor: 'bg-gray-400/10',
          borderColor: 'border-gray-400/20',
          gradientFrom: 'from-gray-400/20',
          gradientTo: 'to-gray-400/5'
        };
      case 2:
        return {
          iconColor: 'text-orange-400',
          bgColor: 'bg-orange-400/10',
          borderColor: 'border-orange-400/20',
          gradientFrom: 'from-orange-400/20',
          gradientTo: 'to-orange-400/5'
        };
      default:
        return {
          iconColor: 'text-campaign-info',
          bgColor: 'bg-campaign-info/10',
          borderColor: 'border-campaign-info/20',
          gradientFrom: 'from-campaign-info/20',
          gradientTo: 'to-campaign-info/5'
        };
    }
  };

  return (
    <Card className="gradient-card border border-white/10 slide-up-delay-2">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 bg-campaign-warning/20 border border-campaign-warning/30 rounded-lg">
            <Trophy className="w-6 h-6 text-campaign-warning" />
          </div>
          <div>
            <span className="text-white">Prize Pool</span>
            <p className="text-sm font-normal text-muted-foreground mt-1">
              Total rewards for winners
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Total Prize Pool Highlight */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-campaign-warning/10 via-campaign-secondary/10 to-campaign-primary/10 border border-campaign-warning/20 p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Gift className="w-8 h-8 text-campaign-warning" />
              <h3 className="text-2xl font-bold text-white">Total Prize Pool</h3>
            </div>
            <p className="text-4xl font-bold text-campaign-warning">
              {totalPrizePool.toLocaleString()} USDC
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Distributed among {prizes.reduce((total, prize) => total + prize.quantity, 0)} winners
            </p>
          </div>
        </div>

        {/* Prize Tiers */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white mb-4">Prize Tiers</h4>
          
          {prizes.map((prize, index) => {
            const Icon = getPrizeIcon(index);
            const colors = getPrizeColors(index);
            
            return (
              <div
                key={index}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${colors.gradientFrom} ${colors.gradientTo} border ${colors.borderColor} p-6 hover:scale-[1.02] transition-all duration-300 slide-up`}
                style={{ animationDelay: `${index * 0.1 + 0.4}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Rank Badge */}
                    <div className={`relative w-16 h-16 ${colors.bgColor} border ${colors.borderColor} rounded-full flex items-center justify-center`}>
                      <Icon className={`w-8 h-8 ${colors.iconColor}`} />
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-background border border-white/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{index + 1}</span>
                      </div>
                    </div>
                    
                    {/* Prize Details */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {prize.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {prize.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Winners: <span className="font-semibold text-white">{prize.quantity}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Each gets: <span className={`font-semibold ${colors.iconColor}`}>
                            {prize.value.toLocaleString()} {prize.currency}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Prize Value */}
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${colors.iconColor}`}>
                      {prize.value.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {prize.currency}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {(prize.value * prize.quantity).toLocaleString()} {prize.currency}
                    </p>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-2 right-2 opacity-10">
                  <Icon className="w-12 h-12" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="bg-campaign-primary/5 border border-campaign-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-campaign-primary rounded-full animate-pulse" />
            <p className="text-sm text-campaign-primary font-medium">
              Winners are selected randomly at campaign end. All staked tokens are burned regardless of winning status.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}