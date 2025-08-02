import React from 'react';
import { ArrowLeft, Clock, Calendar, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CampaignHeaderProps {
  title: string;
  description: string;
  status: string;
  timeLeft: string;
  onBack: () => void;
  isActive: boolean;
}

export function CampaignHeader({ 
  title, 
  description, 
  status, 
  timeLeft, 
  onBack, 
  isActive 
}: CampaignHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl gradient-hero slide-up">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-campaign-primary/10 rounded-full blur-xl float" />
        <div className="absolute top-20 right-20 w-24 h-24 bg-campaign-secondary/10 rounded-full blur-lg float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-10 left-1/3 w-20 h-20 bg-campaign-accent/10 rounded-full blur-md float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 p-8 lg:p-12">
        {/* Back Button */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="group hover:bg-white/10 transition-all duration-300 border border-white/20 backdrop-blur-sm"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Campaigns
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Campaign Info */}
          <div className="space-y-6">
            {/* Status Badges */}
            <div className="flex items-center gap-4 flex-wrap">
              <Badge 
                variant={status === 'active' ? 'default' : 'secondary'}
                className={`text-sm px-4 py-2 capitalize font-semibold ${
                  status === 'active' 
                    ? 'bg-campaign-success/20 text-campaign-success border-campaign-success/30 pulse-glow' 
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                }`}
              >
                <div className="w-2 h-2 bg-current rounded-full mr-2 animate-pulse" />
                {status}
              </Badge>
              
              {isActive && (
                <Badge 
                  variant="outline" 
                  className="text-sm px-4 py-2 border-campaign-accent/30 bg-campaign-accent/10 text-campaign-accent"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {timeLeft}
                </Badge>
              )}
            </div>

            {/* Campaign Title */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                <span className="bg-gradient-to-r from-white via-campaign-secondary to-campaign-accent bg-clip-text text-transparent">
                  {title}
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl">
                {description}
              </p>
            </div>

            {/* Campaign Meta */}
            <div className="flex items-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Campaign Active</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>Burn-to-Win</span>
              </div>
            </div>
          </div>

          {/* Decorative Side */}
          <div className="relative">
            <div className="aspect-square max-w-md mx-auto relative">
              {/* Floating Campaign Icons */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-gradient-campaign rounded-full flex items-center justify-center glow-campaign-lg">
                  <Target className="w-16 h-16 text-white" />
                </div>
              </div>
              
              {/* Orbiting Elements */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
                <div className="w-12 h-12 bg-campaign-accent/20 border border-campaign-accent/30 rounded-full flex items-center justify-center float">
                  <Calendar className="w-6 h-6 text-campaign-accent" />
                </div>
              </div>
              
              <div className="absolute bottom-0 right-0 transform translate-x-2 translate-y-2">
                <div className="w-16 h-16 bg-campaign-warning/20 border border-campaign-warning/30 rounded-full flex items-center justify-center float" style={{ animationDelay: '0.5s' }}>
                  <Clock className="w-8 h-8 text-campaign-warning" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/80 to-transparent" />
    </div>
  );
}