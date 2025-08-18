import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, Scale, FileText } from "lucide-react";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Terms & Conditions
            </h1>
            <p className="text-lg text-muted-foreground">
              Please read these terms carefully before using the Squdy platform
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: January 2024
            </p>
          </div>

          <div className="space-y-8">
            {/* Overview */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Platform Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  The Squdy platform ("Platform") operates burn-to-win campaigns where users stake SQUDY tokens 
                  to participate in lottery-style competitions. By using this platform, you agree to these terms 
                  and conditions.
                </p>
                <p>
                  This platform is operated by the Squdy team and is designed to create deflationary pressure 
                  on the SQUDY token through strategic burning mechanisms while providing entertainment and 
                  rewards to the community.
                </p>
              </CardContent>
            </Card>

            {/* Token Burn Warning */}
            <Card className="bg-destructive/10 border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Token Burn Notice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-destructive/5 p-4 rounded-lg">
                  <p className="text-foreground font-semibold mb-2">⚠️ IMPORTANT: PERMANENT TOKEN BURN</p>
                  <p className="text-muted-foreground">
                    ALL SQUDY tokens staked in campaigns will be PERMANENTLY BURNED at the end of each campaign, 
                    regardless of whether you win or lose. This is irreversible and tokens cannot be recovered 
                    under any circumstances.
                  </p>
                </div>
                <p className="text-muted-foreground">
                  By participating in any campaign, you explicitly acknowledge and accept that your staked 
                  tokens will be destroyed. Only participate with tokens you can afford to lose completely.
                </p>
              </CardContent>
            </Card>

            {/* Eligibility */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Eligibility Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">To participate in campaigns, you must:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Be at least 18 years old or the legal age in your jurisdiction</li>
                  <li>Have a compatible Web3 wallet (MetaMask recommended)</li>
                  <li>Hold sufficient SQUDY tokens to meet campaign requirements</li>
                  <li>Complete all required social media engagement tasks</li>
                  <li>Not be restricted by local laws regarding cryptocurrency or gambling</li>
                  <li>Agree to KYC verification if requested</li>
                </ul>
                <p>
                  Participation is prohibited in jurisdictions where cryptocurrency activities 
                  or lottery-style competitions are illegal.
                </p>
              </CardContent>
            </Card>

            {/* Campaign Rules */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Campaign Participation Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">Staking & Tickets:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Ticket amounts are defined per campaign and cannot be changed once set</li>
                  <li>Multiple tickets increase winning chances proportionally</li>
                  <li>Partial ticket amounts round down (e.g., 499 SQUDY = 4 tickets if ticket = 100)</li>
                  <li>Staked tokens are locked until campaign completion</li>
                </ul>

                <h4 className="text-foreground font-semibold mt-6">Social Requirements:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All social media tasks must be completed before campaign end</li>
                  <li>Tasks include: Twitter follow/engagement, Discord/Telegram joining, newsletter subscription</li>
                  <li>Fake accounts or bot activity will result in disqualification</li>
                  <li>Social verification may be required at any time</li>
                </ul>

                <h4 className="text-foreground font-semibold mt-6">Winner Selection:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Winners are selected randomly via verifiable smart contract</li>
                  <li>Selection is transparent and recorded on the blockchain</li>
                  <li>Only eligible participants who completed all tasks can win</li>
                  <li>Winner selection is final and cannot be appealed</li>
                </ul>
              </CardContent>
            </Card>

            {/* Platform Responsibilities */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  Platform Rights & Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">The Squdy Team Reserves the Right To:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Create, pause, or terminate campaigns at any time</li>
                  <li>Modify campaign parameters before launch (not after)</li>
                  <li>Disqualify participants for rule violations</li>
                  <li>Require additional verification from participants</li>
                  <li>Update these terms with 30 days notice</li>
                </ul>

                <h4 className="text-foreground font-semibold mt-6">Platform Limitations:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We do not guarantee campaign availability or outcomes</li>
                  <li>Technical issues may affect platform functionality</li>
                  <li>Blockchain congestion may delay transactions</li>
                  <li>We are not responsible for wallet or key management</li>
                </ul>
              </CardContent>
            </Card>

            {/* Risk Disclosures */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Risk Disclosures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">Financial Risks:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Cryptocurrency values are highly volatile</li>
                  <li>You may lose 100% of staked tokens (they will be burned)</li>
                  <li>No guarantee of winning any prizes</li>
                  <li>Gas fees and transaction costs apply</li>
                  <li>Smart contract risks including potential bugs or exploits</li>
                </ul>

                <h4 className="text-foreground font-semibold mt-6">Technical Risks:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Blockchain network congestion or failures</li>
                  <li>Wallet compatibility issues</li>
                  <li>Smart contract vulnerabilities</li>
                  <li>Website or platform downtime</li>
                </ul>
              </CardContent>
            </Card>

            {/* Legal */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Legal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  The platform operates as entertainment software and 
                  makes no investment promises or guarantees.
                </p>
                <p>
                  Users are responsible for compliance with their local laws regarding cryptocurrency 
                  and online competitions. The Squdy team provides no legal or financial advice.
                </p>
                <p className="text-sm">
                  For questions about these terms, contact us through our official channels listed 
                  on the platform.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsPage;