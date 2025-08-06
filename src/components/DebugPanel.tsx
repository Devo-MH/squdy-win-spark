import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCampaigns } from '@/hooks/useCampaigns';
import { RefreshCw, Bug, Smartphone, Monitor } from 'lucide-react';

export const DebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { data: campaignsData, isLoading, error, refetch } = useCampaigns({ limit: 10 });
  
  const campaigns = campaignsData?.campaigns || [];
  const activeCampaigns = campaigns.filter(c => c.status === "active");
  
  // Device detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const screenWidth = window.innerWidth;
  
  // API endpoint detection
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur"
        >
          <Bug className="w-4 h-4" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-96 overflow-y-auto">
      <Card className="bg-background/95 backdrop-blur border-2 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Debug Panel
            </CardTitle>
            <Button 
              onClick={() => setIsVisible(false)}
              size="sm" 
              variant="ghost"
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Device Info */}
          <div>
            <h4 className="font-semibold mb-1 flex items-center gap-1">
              {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
              Device
            </h4>
            <div className="space-y-1">
              <Badge variant={isMobile ? "default" : "secondary"} className="text-xs">
                {isMobile ? 'Mobile' : 'Desktop'}
              </Badge>
              {isIOS && <Badge variant="outline" className="text-xs">iOS</Badge>}
              <div className="text-muted-foreground">Screen: {screenWidth}px</div>
              <div className="text-muted-foreground text-xs break-all">
                UA: {navigator.userAgent.substring(0, 50)}...
              </div>
            </div>
          </div>

          {/* API Info */}
          <div>
            <h4 className="font-semibold mb-1">API</h4>
            <div className="space-y-1">
              <Badge variant={import.meta.env.PROD ? "default" : "secondary"} className="text-xs">
                {import.meta.env.PROD ? 'Production' : 'Development'}
              </Badge>
              <div className="text-muted-foreground text-xs break-all">
                URL: {apiUrl}
              </div>
            </div>
          </div>

          {/* Campaign Data */}
          <div>
            <h4 className="font-semibold mb-1 flex items-center justify-between">
              Campaigns
              <Button 
                onClick={() => refetch()}
                size="sm" 
                variant="ghost"
                className="h-5 w-5 p-0"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </h4>
            <div className="space-y-1">
              <Badge variant={isLoading ? "secondary" : error ? "destructive" : "default"} className="text-xs">
                {isLoading ? 'Loading...' : error ? 'Error' : 'Loaded'}
              </Badge>
              <div className="text-muted-foreground">
                Total: {campaigns.length} | Active: {activeCampaigns.length}
              </div>
              {error && (
                <div className="text-destructive text-xs break-all">
                  Error: {error.message}
                </div>
              )}
              
              {/* Campaign List */}
              <div className="max-h-24 overflow-y-auto">
                {campaigns.map((campaign, index) => (
                  <div key={index} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                    <span className="truncate mr-2">{campaign.name}</span>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {campaign.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Network Test */}
          <div>
            <h4 className="font-semibold mb-1">Network Test</h4>
            <Button 
              onClick={async () => {
                try {
                  const response = await fetch(apiUrl + '/campaigns');
                  const data = await response.json();
                  console.log('Direct fetch result:', data);
                  alert(`Direct fetch: ${data.campaigns?.length || 0} campaigns`);
                } catch (error) {
                  console.error('Direct fetch error:', error);
                  alert(`Fetch error: ${error.message}`);
                }
              }}
              size="sm"
              variant="outline" 
              className="w-full"
            >
              Test Direct Fetch
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};