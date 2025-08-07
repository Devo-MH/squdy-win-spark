// Vercel serverless function: Single Campaign API
import { ObjectId } from 'mongodb';
import { getDatabase } from '../lib/mongodb.js';
import { addCorsHeaders, requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  addCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    const db = await getDatabase();
    const campaignsCollection = db.collection('campaigns');

    if (req.method === 'GET') {
      // Get single campaign
      let campaign;
      
      // Try to find by numeric ID first (for backwards compatibility)
      if (!isNaN(id)) {
        campaign = await campaignsCollection.findOne({ id: parseInt(id) });
      }
      
      // If not found, try ObjectId
      if (!campaign) {
        try {
          campaign = await campaignsCollection.findOne({ _id: new ObjectId(id) });
        } catch (objectIdError) {
          // If ObjectId is invalid, return not found
          return res.status(404).json({ error: 'Campaign not found' });
        }
      }

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      console.log(`📋 Retrieved campaign: ${campaign.name}`);

      return res.status(200).json({ campaign });
    }

    if (req.method === 'PUT') {
      // Update campaign (admin only - would need auth middleware)
      const updates = req.body;
      delete updates._id; // Don't allow updating _id
      
      updates.updatedAt = new Date().toISOString();

      let result;
      
      // Try to update by numeric ID first
      if (!isNaN(id)) {
        result = await campaignsCollection.updateOne(
          { id: parseInt(id) },
          { $set: updates }
        );
      }
      
      // If not found, try ObjectId
      if (!result || result.matchedCount === 0) {
        try {
          result = await campaignsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
          );
        } catch (objectIdError) {
          return res.status(404).json({ error: 'Campaign not found' });
        }
      }

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      console.log(`✅ Updated campaign: ${id}`);

      return res.status(200).json({ 
        message: 'Campaign updated successfully',
        modifiedCount: result.modifiedCount
      });
    }

    if (req.method === 'DELETE') {
      // Delete campaign (admin only - would need auth middleware)
      let result;
      
      // Try to delete by numeric ID first
      if (!isNaN(id)) {
        result = await campaignsCollection.deleteOne({ id: parseInt(id) });
      }
      
      // If not found, try ObjectId
      if (!result || result.deletedCount === 0) {
        try {
          result = await campaignsCollection.deleteOne({ _id: new ObjectId(id) });
        } catch (objectIdError) {
          return res.status(404).json({ error: 'Campaign not found' });
        }
      }

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      console.log(`🗑️ Deleted campaign: ${id}`);

      return res.status(200).json({ 
        message: 'Campaign deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Campaign API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
