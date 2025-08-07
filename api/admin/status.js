// Vercel serverless function: Admin Status Check
import { getDatabase } from '../lib/mongodb.js';
import { addCorsHeaders, requireAdmin } from '../lib/auth.js';

const handler = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const db = await getDatabase();
    
    // Get platform statistics
    const campaignsCollection = db.collection('campaigns');
    const participantsCollection = db.collection('participants');

    const [
      totalCampaigns,
      activeCampaigns,
      totalParticipants,
      campaignsList
    ] = await Promise.all([
      campaignsCollection.countDocuments(),
      campaignsCollection.countDocuments({ status: 'active' }),
      participantsCollection.countDocuments(),
      campaignsCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray()
    ]);

    // Calculate total raised across all campaigns
    const totalRaised = campaignsList.reduce((sum, campaign) => {
      return sum + (campaign.currentAmount || 0);
    }, 0);

    const status = {
      isAdmin: true,
      wallet: req.wallet.address,
      platform: {
        totalCampaigns,
        activeCampaigns,
        totalParticipants,
        totalRaised,
        status: 'operational'
      },
      blockchain: {
        network: process.env.VITE_NETWORK || 'sepolia',
        chainId: process.env.VITE_CHAIN_ID || '11155111',
        squdyTokenAddress: process.env.VITE_SQUDY_TOKEN_ADDRESS,
        campaignManagerAddress: process.env.VITE_CAMPAIGN_MANAGER_ADDRESS,
        connected: true
      },
      database: {
        status: 'connected',
        lastCheck: new Date().toISOString()
      },
      recentCampaigns: campaignsList.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        currentAmount: c.currentAmount,
        participantCount: c.participantCount,
        createdAt: c.createdAt
      }))
    };

    console.log(`👑 Admin status check for ${req.wallet.address}`);

    return res.status(200).json(status);

  } catch (error) {
    console.error('Admin status API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      database: { status: 'error', error: error.message }
    });
  }
};

export default function adminStatusHandler(req, res) {
  addCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return requireAdmin(handler)(req, res);
}
