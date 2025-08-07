// Admin stats endpoint (public for now to unblock UI)
import { getDatabase } from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let stats = {
      platform: { totalCampaigns: 0, activeCampaigns: 0, totalParticipants: 0, totalRaised: 0, status: 'operational' },
      blockchain: {
        network: process.env.VITE_NETWORK || 'sepolia',
        chainId: process.env.VITE_CHAIN_ID || '11155111',
        squdyTokenAddress: process.env.VITE_SQUDY_TOKEN_ADDRESS,
        campaignManagerAddress: process.env.VITE_CAMPAIGN_MANAGER_ADDRESS,
        connected: true,
      },
      database: { status: 'connected', lastCheck: new Date().toISOString() },
    };

    try {
      const db = await getDatabase();
      const campaignsCol = db.collection('campaigns');
      const participantsCol = db.collection('participants');

      const [totalCampaigns, activeCampaigns, totalParticipants, list] = await Promise.all([
        campaignsCol.countDocuments(),
        campaignsCol.countDocuments({ status: 'active' }),
        participantsCol.countDocuments().catch(() => 0),
        campaignsCol.find({}).project({ currentAmount: 1, status: 1 }).toArray(),
      ]);

      const totalRaised = (list || []).reduce((sum, c) => sum + (c.currentAmount || 0), 0);

      stats.platform = { totalCampaigns, activeCampaigns, totalParticipants, totalRaised, status: 'operational' };
    } catch (dbErr) {
      // Keep defaults if DB not available
      stats.database = { status: 'degraded', error: dbErr?.message };
    }

    return res.status(200).json({ stats });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


