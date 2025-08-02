import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, Database, Users, Globe } from "lucide-react";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              How we collect, use, and protect your information
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
                  <Shield className="w-5 h-5 text-primary" />
                  Privacy Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  The Squdy team ("we," "our," or "us") is committed to protecting your privacy. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                  information when you use our burn-to-win platform.
                </p>
                <p>
                  By using our platform, you consent to the data practices described in this policy. 
                  We are committed to transparency and will notify you of any material changes to 
                  this policy.
                </p>
              </CardContent>
            </Card>

            {/* Information We Collect */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Information We Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">Blockchain Data:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Wallet addresses (public blockchain data)</li>
                  <li>Transaction hashes and amounts</li>
                  <li>Smart contract interactions</li>
                  <li>Token balances and staking history</li>
                </ul>

                <h4 className="text-foreground font-semibold mt-6">Platform Usage Data:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Campaign participation records</li>
                  <li>Social media task completion status</li>
                  <li>Website usage analytics (anonymized)</li>
                  <li>Device and browser information</li>
                </ul>

                <h4 className="text-foreground font-semibold mt-6">Voluntary Information:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Email addresses (for newsletter subscription)</li>
                  <li>Social media handles (for verification)</li>
                  <li>Communication preferences</li>
                  <li>Feedback and support requests</li>
                </ul>
              </CardContent>
            </Card>

            {/* How We Use Information */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  How We Use Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">Platform Operations:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Process campaign participations and transactions</li>
                  <li>Verify social media task completion</li>
                  <li>Select and notify winners</li>
                  <li>Execute token burning mechanisms</li>
                </ul>

                <h4 className="text-foreground font-semibold mt-6">Communication:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Send campaign updates and notifications</li>
                  <li>Deliver prize notifications to winners</li>
                  <li>Provide customer support</li>
                  <li>Send newsletters (with consent)</li>
                </ul>

                <h4 className="text-foreground font-semibold mt-6">Analytics & Improvement:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Analyze platform usage patterns</li>
                  <li>Improve user experience and functionality</li>
                  <li>Detect and prevent fraud or abuse</li>
                  <li>Develop new features and campaigns</li>
                </ul>
              </CardContent>
            </Card>

            {/* Information Sharing */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Information Sharing & Disclosure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">We May Share Information With:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Blockchain Networks:</strong> All transactions are publicly visible on the blockchain</li>
                  <li><strong>Service Providers:</strong> Third-party services for analytics, hosting, and support</li>
                  <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                  <li><strong>Community:</strong> Winner announcements and campaign results (wallet addresses only)</li>
                </ul>

                <h4 className="text-foreground font-semibold mt-6">We Do NOT Sell:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Personal information to third parties</li>
                  <li>Email addresses for marketing purposes</li>
                  <li>User behavior data to advertisers</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Data Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">Security Measures:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of sensitive data in transit and at rest</li>
                  <li>Secure hosting infrastructure with regular updates</li>
                  <li>Access controls and authentication systems</li>
                  <li>Regular security audits and penetration testing</li>
                </ul>

                <h4 className="text-foreground font-semibold mt-6">Important Notes:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Blockchain transactions are inherently public and permanent</li>
                  <li>We cannot control or secure your private keys or wallet</li>
                  <li>Always use secure wallets and protect your private keys</li>
                  <li>Never share your private keys or seed phrases</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">Retention Periods:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Blockchain Data:</strong> Permanent (immutable on blockchain)</li>
                  <li><strong>Platform Records:</strong> 7 years (for legal and audit purposes)</li>
                  <li><strong>Analytics Data:</strong> 2 years (anonymized after 1 year)</li>
                  <li><strong>Communication Records:</strong> 3 years</li>
                </ul>

                <p>
                  You may request deletion of your personal data, but blockchain transactions 
                  cannot be deleted as they are permanent records.
                </p>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Your Privacy Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">You Have the Right To:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                  <li><strong>Portability:</strong> Receive your data in a portable format</li>
                  <li><strong>Objection:</strong> Object to certain processing activities</li>
                  <li><strong>Withdrawal:</strong> Withdraw consent for marketing communications</li>
                </ul>

                <p>
                  To exercise these rights, contact us through our official channels. 
                  We will respond within 30 days of receiving your request.
                </p>
              </CardContent>
            </Card>

            {/* International Transfers */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  International Data Transfers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Our platform operates globally, and your information may be transferred to 
                  and processed in countries other than your own. We ensure appropriate 
                  safeguards are in place for international data transfers.
                </p>
                <p>
                  By using our platform, you consent to the transfer of your information 
                  to countries that may have different data protection laws than your country.
                </p>
              </CardContent>
            </Card>

            {/* Cookies & Tracking */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Cookies & Tracking Technologies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h4 className="text-foreground font-semibold">We Use:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Essential Cookies:</strong> Required for platform functionality</li>
                  <li><strong>Analytics Cookies:</strong> To understand usage patterns (anonymized)</li>
                  <li><strong>Preference Cookies:</strong> To remember your settings</li>
                </ul>

                <p>
                  You can control cookie settings through your browser preferences. 
                  Disabling certain cookies may affect platform functionality.
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  If you have questions about this Privacy Policy or our data practices, 
                  please contact us:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Email: privacy@squdy.com</li>
                  <li>Discord: Join our official Discord server</li>
                  <li>Telegram: @SqudyOfficial</li>
                  <li>Twitter: @SqudyOfficial</li>
                </ul>
                <p className="text-sm">
                  We are committed to addressing your privacy concerns promptly and transparently.
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

export default PrivacyPage; 