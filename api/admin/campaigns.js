// Vercel serverless function: Admin Campaigns Management
import { getDatabase } from '../lib/mongodb.js';
import { addCorsHeaders, requireAdmin } from '../lib/auth.js';

const handler = async (req, res) => {
  try {
    const db = await getDatabase();
    const campaignsCollection = db.collection('campaigns');

    if (req.method === 'GET') {
      // Get all campaigns for admin with additional details
      const campaigns = await campaignsCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      // Add admin-specific stats
      const stats = {
        total: campaigns.length,
        active: campaigns.filter(c => c.status === 'active').length,
        completed: campaigns.filter(c => c.status === 'completed').length,
        cancelled: campaigns.filter(c => c.status === 'cancelled').length,
        totalRaised: campaigns.reduce((sum, c) => sum + (c.currentAmount || 0), 0),
        totalParticipants: campaigns.reduce((sum, c) => sum + (c.participantCount || 0), 0)
      };

      console.log(`👑 Admin retrieved ${campaigns.length} campaigns`);

      return res.status(200).json({
        campaigns,
        stats
      });
    }

    if (req.method === 'POST') {
      // Create new campaign
      const {
        name,
        description,
        imageUrl,
        hardCap,
        softCap,
        ticketAmount,
        startDate,
        endDate,
        prizes,
        offchainTasks
      } = req.body;

      if (!name || !description || !hardCap || !softCap || !ticketAmount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Generate sequential ID
      const lastCampaign = await campaignsCollection
        .findOne({}, { sort: { id: -1 } });
      const nextId = (lastCampaign?.id || 0) + 1;

      const newCampaign = {
        id: nextId,
        contractId: nextId, // Will be updated when deployed to blockchain
        name,
        description,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop',
        status: 'active',
        currentAmount: 0,
        hardCap: parseFloat(hardCap),
        softCap: parseFloat(softCap),
        ticketAmount: parseFloat(ticketAmount),
        participantCount: 0,
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        prizes: prizes || [
          { name: "First Prize", description: "Winner takes all", value: "1000", currency: "USD", quantity: 1 }
        ],
        offchainTasks: offchainTasks || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.wallet.address
      };

      const result = await campaignsCollection.insertOne(newCampaign);
      newCampaign._id = result.insertedId;

      console.log(`👑 Admin created campaign: ${name} (ID: ${nextId})`);

      return res.status(201).json({
        message: 'Campaign created successfully',
        campaign: newCampaign
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Admin campaigns API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default function adminCampaignsHandler(req, res) {
  addCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return requireAdmin(handler)(req, res);
}
