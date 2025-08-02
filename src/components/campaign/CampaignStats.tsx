import React from 'react';
import { Users, Coins, Target, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface CampaignStatsProps {
  currentAmount: number;
  hardCap: number;
  softCap: number;
  participantCount: number;
  timeLeft: string;
  ticketAmount: number;
}

export function CampaignStats({ 
  currentAmount, 
  hardCap, 
  softCap, 
  participantCount, 
  timeLeft, 
  ticketAmount 
}: CampaignStatsProps) {
  const progress = (currentAmount / hardCap) * 100;
  const progressToSoftCap = (currentAmount / softCap) * 100;

  const stats = [
    {
      icon: Coins,
      label: 'Total Staked',
      value: `${currentAmount.toLocaleString()} SQUDY`,
      subValue: `${progress.toFixed(1)}% of Hard Cap`,
      color: 'text-campaign-warning',
      bgColor: 'bg-campaign-warning/10',
      borderColor: 'border-campaign-warning/20',
      delay: '0s'
    },
    {
      icon: Users,
      label: 'Participants',
      value: participantCount.toString(),
      subValue: 'Active Stakers',
      color: 'text-campaign-info',
      bgColor: 'bg-campaign-info/10',
      borderColor: 'border-campaign-info/20',
      delay: '0.1s'
    },
    {
      icon: Target,
      label: 'Ticket Price',
      value: `${ticketAmount.toLocaleString()} SQUDY`,
      subValue: 'Per Entry Ticket',
      color: 'text-campaign-secondary',
      bgColor: 'bg-campaign-secondary/10',
      borderColor: 'border-campaign-secondary/20',
      delay: '0.2s'
    },
    {
      icon: Clock,
      label: 'Time Remaining',
      value: timeLeft,
      subValue: 'Until Campaign Ends',
      color: 'text-campaign-primary',
      bgColor: 'bg-campaign-primary/10',
      borderColor: 'border-campaign-primary/20',
      delay: '0.3s'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={stat.label}
            className={`gradient-card border ${stat.borderColor} hover:scale-105 transition-all duration-300 slide-up`}
            style={{ animationDelay: stat.delay }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className={`w-12 h-12 ${stat.bgColor} border ${stat.borderColor} rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.subValue}
                    </p>
                  </div>
                </div>
                
                {stat.label === 'Total Staked' && (
                  <div className="w-2 h-16 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="w-full bg-gradient-to-t from-campaign-warning to-campaign-secondary transition-all duration-1000 ease-out"
                      style={{ height: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Section */}
      <Card className="gradient-card border border-white/10 slide-up-delay-1">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-campaign-primary/20 border border-campaign-primary/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-campaign-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Campaign Progress</h3>
                  <p className="text-sm text-muted-foreground">Funding progress towards goals</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-3xl font-bold text-campaign-primary">
                  {progress.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">of Hard Cap</p>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-4">
              {/* Hard Cap Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hard Cap Progress</span>
                  <span className="font-semibold text-white">
                    {currentAmount.toLocaleString()} / {hardCap.toLocaleString()} SQUDY
                  </span>
                </div>
                <div className="relative">
                  <Progress value={progress} className="h-3 bg-white/10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-campaign-primary via-campaign-secondary to-campaign-accent opacity-80 rounded-full" 
                       style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>

              {/* Soft Cap Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Soft Cap Progress</span>
                  <span className="font-semibold text-white">
                    {Math.min(progressToSoftCap, 100).toFixed(1)}% Complete
                  </span>
                </div>
                <div className="relative">
                  <Progress value={progressToSoftCap} className="h-2 bg-white/5" />
                  <div className="absolute inset-0 bg-gradient-to-r from-campaign-success to-campaign-info opacity-60 rounded-full" 
                       style={{ width: `${Math.min(progressToSoftCap, 100)}%` }} />
                </div>
              </div>

              {/* Milestone Markers */}
              <div className="flex justify-between text-xs text-muted-foreground pt-2">
                <span>Start: 0</span>
                <span className={progressToSoftCap >= 100 ? 'text-campaign-success' : ''}>
                  Soft Cap: {softCap.toLocaleString()}
                </span>
                <span className={progress >= 100 ? 'text-campaign-warning' : ''}>
                  Hard Cap: {hardCap.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}