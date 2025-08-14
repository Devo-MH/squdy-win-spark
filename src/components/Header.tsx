import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, Menu, X, ChevronDown, ExternalLink, Power, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { toast } from "sonner";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { 
    account, 
    isConnected, 
    isConnecting, 
    isCorrectNetwork, 
    networkName, 
    connect, 
    disconnect,
    switchToChain 
  } = useWeb3();

  const formatAddress = (address: string | null | undefined) => {
    if (!address || typeof address !== 'string') {
      return 'Unknown';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      const targetChainId = import.meta.env.MODE === 'production' ? 1 : 11155111; // Ethereum Mainnet : Sepolia
      await switchToChain(targetChainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const handleBuySQUDY = () => {
    toast.info('Redirecting to PancakeSwap...');
    window.open('https://pancakeswap.finance/swap?outputCurrency=0xbcac31281cd38f0150ea506c001e6d0ba902669f&chain=bsc', '_blank');
  };

  const WalletButton = () => {
    if (!isConnected) {
      return (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleConnectWallet}
          disabled={isConnecting}
        >
          <Wallet className="w-4 h-4" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <Wallet className="w-4 h-4" />
            <span>{formatAddress(account!)}</span>
            {!isCorrectNetwork && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="p-2">
            <div className="text-sm text-muted-foreground">Connected to</div>
            <div className="font-medium">{formatAddress(account!)}</div>
            <div className="flex items-center justify-between mt-1">
              <Badge variant={isCorrectNetwork ? "default" : "destructive"}>
                {networkName}
              </Badge>
              {!isCorrectNetwork && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSwitchNetwork}
                  className="text-xs h-6"
                >
                  Switch Network
                </Button>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.open(`https://sepolia.etherscan.io/address/${account}`, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Etherscan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={disconnect} className="text-red-600">
            <Power className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-primary/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/squdy-logo.png" 
              alt="Squdy Token"
              className="h-12 w-auto"
              onError={(e) => {
                // Fallback to text logo if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Squdy Token
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-foreground hover:text-primary transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/campaigns" 
              className="text-foreground hover:text-primary transition-colors"
            >
              Campaigns
            </Link>
            <Link 
              to="/admin" 
              className="text-foreground hover:text-primary transition-colors"
            >
              Admin
            </Link>

            <Link 
              to="/terms" 
              className="text-foreground hover:text-primary transition-colors"
            >
              Terms
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <WalletButton />
            <Button variant="neon" size="sm" onClick={handleBuySQUDY}>
              Buy SQUDY
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-primary/20">
            <nav className="flex flex-col space-y-4 mt-4">
              <Link 
                to="/" 
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/campaigns" 
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Campaigns
              </Link>
              <Link 
                to="/admin" 
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link>

              <Link 
                to="/terms" 
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Terms
              </Link>
              <div className="flex flex-col space-y-2 pt-4">
                <WalletButton />
                <Button variant="neon" size="sm" onClick={handleBuySQUDY}>
                  Buy SQUDY
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;