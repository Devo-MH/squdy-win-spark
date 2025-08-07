// Vercel serverless function: Campaigns API
import { getDatabase } from '../lib/mongodb.js';
import { addCorsHeaders } from '../lib/auth.js';

export default async function handler(req, res) {
  addCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await getDatabase();
    const campaignsCollection = db.collection('campaigns');

    if (req.method === 'GET') {
      // Get all campaigns with pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build query filters
      const query = {};
      if (req.query.status) {
        query.status = req.query.status;
      }

      // Get campaigns
      const campaigns = await campaignsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Get total count
      const total = await campaignsCollection.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      console.log(`📋 Retrieved ${campaigns.length} campaigns (page ${page}/${totalPages})`);

      return res.status(200).json({
        campaigns,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    }

    if (req.method === 'POST') {
      // Create new campaign (admin only)
      const {
        name,
        description,
        imageUrl,
        hardCap,
        softCap,
        ticketAmount,
        startDate,
        endDate,
        prizes
      } = req.body;

      if (!name || !description || !hardCap || !softCap || !ticketAmount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const newCampaign = {
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
        prizes: prizes || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        offchainTasks: []
      };

      const result = await campaignsCollection.insertOne(newCampaign);
      newCampaign._id = result.insertedId;

      console.log(`✅ Created new campaign: ${name}`);

      return res.status(201).json({
        message: 'Campaign created successfully',
        campaign: newCampaign
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Campaigns API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
