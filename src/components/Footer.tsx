import { Link } from "react-router-dom";
import { Twitter, MessageCircle, BookOpen, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary/50 border-t border-primary/20 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Squdy
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              The ultimate burn-to-win platform for SQUDY token holders. Participate in campaigns, win prizes, and contribute to token deflation.
            </p>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Platform</h3>
            <div className="space-y-2 text-sm">
              <Link to="/" className="block text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link to="/campaigns" className="block text-muted-foreground hover:text-primary transition-colors">
                Active Campaigns
              </Link>
              <Link to="/admin" className="block text-muted-foreground hover:text-primary transition-colors">
                Admin Panel
              </Link>
              <a 
                href="https://pancakeswap.finance/swap?outputCurrency=0xbcac31281cd38f0150ea506c001e6d0ba902669f&chain=bsc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Buy SQUDY
              </a>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <div className="space-y-2 text-sm">
            <Link to="https://docs.squdy.fun" target="_blank" className="block text-muted-foreground hover:text-primary transition-colors">
                Documentation
              </Link>
              <Link to="/terms" className="block text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="block text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/conditions" className="block text-muted-foreground hover:text-primary transition-colors">
                Conditions
              </Link>
            </div>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Community</h3>
            <div className="flex space-x-4">
              <a 
                href="https://x.com/SqudyToken" target="_blank"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://t.me/SqudyToken" target="_blank"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Telegram"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              <a 
                href="https://docs.squdy.fun" target="_blank"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Medium"
              >
                <BookOpen className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary/20 mt-8 pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2025 Squdy Token. All rights reserved. Built for the Meme community.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;