import React, { useState } from 'react';
import { Flame, Wallet, CheckCircle, Loader2, AlertTriangle, Zap, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StakingSectionProps {
  squdyBalance: string;
  stakeAmount: string;
  onStakeAmountChange: (amount: string) => void;
  ticketsFromStake: number;
  ticketAmount: number;
  isApproving: boolean;
  isStaking: boolean;
  hasAllowance: boolean;
  hasStaked: boolean;
  onApprove: () => void;
  onStake: () => void;
}

export function StakingSection({
  squdyBalance,
  stakeAmount,
  onStakeAmountChange,
  ticketsFromStake,
  ticketAmount,
  isApproving,
  isStaking,
  hasAllowance,
  hasStaked,
  onApprove,
  onStake
}: StakingSectionProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const presetAmounts = [
    { label: '100 SQUDY', value: '100', tickets: Math.floor(100 / ticketAmount) },
    { label: '500 SQUDY', value: '500', tickets: Math.floor(500 / ticketAmount) },
    { label: '1,000 SQUDY', value: '1000', tickets: Math.floor(1000 / ticketAmount) },
    { label: 'MAX', value: squdyBalance, tickets: Math.floor(parseFloat(squdyBalance || '0') / ticketAmount) }
  ];

  const handlePresetClick = (value: string) => {
    setSelectedPreset(value);
    onStakeAmountChange(value);
  };

  const isValidAmount = parseFloat(stakeAmount || '0') >= ticketAmount;
  const exceedsBalance = parseFloat(stakeAmount || '0') > parseFloat(squdyBalance || '0');
  const canStake = isValidAmount && !exceedsBalance && hasAllowance && !hasStaked;

  return (
    <Card className="gradient-card border border-white/10 slide-up-delay-1">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className={`p-2 rounded-lg ${hasStaked ? 'bg-campaign-success/20 border border-campaign-success/30' : 'bg-campaign-primary/20 border border-campaign-primary/30'}`}>
            {hasStaked ? (
              <CheckCircle className="w-6 h-6 text-campaign-success" />
            ) : (
              <Flame className="w-6 h-6 text-campaign-primary" />
            )}
          </div>
          <div>
            <span className="text-white">
              {hasStaked ? 'Tokens Staked Successfully!' : 'Stake SQUDY Tokens'}
            </span>
            <p className="text-sm font-normal text-muted-foreground mt-1">
              {hasStaked ? 'Your tokens are now in the prize pool' : 'Step 1: Stake tokens to participate'}
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-8">
        {!hasStaked ? (
          <>
            {/* Balance and Tickets Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-campaign-info/5 border border-campaign-info/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Wallet className="w-5 h-5 text-campaign-info" />
                  <span className="text-sm font-medium text-muted-foreground">Your Balance</span>
                </div>
                <p className="text-3xl font-bold text-campaign-info">
                  {Number(squdyBalance).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">SQUDY Available</p>
              </div>

              <div className="bg-campaign-secondary/5 border border-campaign-secondary/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Calculator className="w-5 h-5 text-campaign-secondary" />
                  <span className="text-sm font-medium text-muted-foreground">Tickets You'll Get</span>
                </div>
                <p className="text-3xl font-bold text-campaign-secondary">
                  {ticketsFromStake}
                </p>
                <p className="text-sm text-muted-foreground">
                  Entry Tickets ({ticketAmount.toLocaleString()} SQUDY each)
                </p>
              </div>
            </div>

            {/* Preset Amount Buttons */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-white">Quick Select Amount</Label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    onClick={() => handlePresetClick(preset.value)}
                    className={`h-16 flex flex-col items-center justify-center border transition-all duration-200 ${
                      selectedPreset === preset.value
                        ? 'border-campaign-primary bg-campaign-primary/20 text-campaign-primary'
                        : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-campaign-primary/50'
                    }`}
                    disabled={parseFloat(preset.value) > parseFloat(squdyBalance || '0')}
                  >
                    <span className="font-semibold">{preset.label}</span>
                    <span className="text-xs opacity-70">{preset.tickets} tickets</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="space-y-4">
              <Label htmlFor="stakeAmount" className="text-sm font-medium text-white">
                Custom Amount (SQUDY)
              </Label>
              <div className="relative">
                <Input
                  id="stakeAmount"
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => {
                    setSelectedPreset('');
                    onStakeAmountChange(e.target.value);
                  }}
                  placeholder={`Minimum ${ticketAmount.toLocaleString()} SQUDY`}
                  className="pl-12 h-14 text-lg bg-white/5 border-white/20 focus:border-campaign-primary/50 focus:bg-white/10"
                />
                <Zap className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-campaign-primary" />
              </div>
              
              {stakeAmount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tickets: {ticketsFromStake}
                  </span>
                  <span className={exceedsBalance ? 'text-red-400' : 'text-campaign-success'}>
                    {exceedsBalance ? 'Exceeds balance' : `${ticketsFromStake} ticket${ticketsFromStake !== 1 ? 's' : ''}`}
                  </span>
                </div>
              )}
            </div>

            {/* Validation Messages */}
            {stakeAmount && !isValidAmount && (
              <div className="flex items-center gap-2 p-3 bg-campaign-warning/10 border border-campaign-warning/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-campaign-warning" />
                <p className="text-sm text-campaign-warning">
                  Minimum stake amount is {ticketAmount.toLocaleString()} SQUDY
                </p>
              </div>
            )}

            {exceedsBalance && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-sm text-red-400">
                  Amount exceeds your balance of {Number(squdyBalance).toLocaleString()} SQUDY
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!hasAllowance && stakeAmount && isValidAmount && !exceedsBalance && (
                <Button 
                  onClick={onApprove}
                  disabled={isApproving}
                  className="w-full h-14 bg-campaign-accent/20 hover:bg-campaign-accent/30 border border-campaign-accent/30 text-campaign-accent font-semibold transition-all duration-200"
                  variant="outline"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve {stakeAmount} SQUDY
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                onClick={onStake}
                disabled={!canStake || isStaking}
                className="w-full h-14 bg-gradient-campaign hover:scale-105 text-white font-bold shadow-lg hover:shadow-xl glow-campaign transition-all duration-200"
              >
                {isStaking ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Staking Tokens...
                  </>
                ) : (
                  <>
                    <Flame className="w-6 h-6 mr-2" />
                    Stake {stakeAmount || 0} SQUDY
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          /* Success State */
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-campaign-success/20 border border-campaign-success/30 rounded-full">
              <CheckCircle className="w-10 h-10 text-campaign-success" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-campaign-success mb-2">
                Staking Complete!
              </h3>
              <p className="text-muted-foreground">
                You've successfully staked {stakeAmount} SQUDY and earned {ticketsFromStake} ticket{ticketsFromStake !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-campaign-success/5 border border-campaign-success/20 rounded-xl p-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-campaign-success">{stakeAmount}</p>
                  <p className="text-sm text-muted-foreground">SQUDY Staked</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-campaign-success">{ticketsFromStake}</p>
                  <p className="text-sm text-muted-foreground">Tickets Earned</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning Section */}
        <div className="bg-campaign-warning/5 border border-campaign-warning/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-campaign-warning mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-campaign-warning mb-2">Important Notice</h4>
              <p className="text-sm text-campaign-warning/80 leading-relaxed">
                All staked SQUDY tokens will be permanently burned at the end of this campaign, 
                regardless of winning status. This is a burn-to-win mechanism where tokens are 
                destroyed to create scarcity and value for the ecosystem.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}