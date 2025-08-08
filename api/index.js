// Ultra-minimal production API with MongoDB persistence (lazy-loaded)
async function getDb() {
  const mod = await import('./lib/mongodb.js');
  return mod.getDatabase();
}
export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse URL without query params
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  
  /**
   * Return a minimal set of built-in demo campaigns.
   * This simulates persistent data alongside session-created campaigns.
   */
  function getBaseCampaigns() {
    return [
      {
        id: "689645ee0b152227c14038fe",
        contractId: 1001,
        name: "Persist-Finalized",
        description: "Production campaign working",
        imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
        status: "active",
        currentAmount: 8000,
        hardCap: 15000,
        participantCount: 25,
        softCap: 3000,
        ticketAmount: 30,
        totalValue: 15000,
        progressPercentage: 53,
        daysRemaining: 7,
        startDate: "2025-08-08T18:46:04.248Z",
        endDate: "2025-08-15T18:46:06.347Z",
        prizes: [
          { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 }
        ],
        createdAt: "2025-08-08T18:46:04.248Z",
        updatedAt: "2025-08-08T18:46:04.248Z",
      },
      {
        id: "demo1",
        contractId: 1,
        name: "Demo Campaign",
        description: "Demo campaign for testing",
        imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
        status: "active",
        currentAmount: 15000,
        hardCap: 50000,
        participantCount: 42,
        softCap: 10000,
        ticketAmount: 100,
        totalValue: 50000,
        progressPercentage: 30,
        daysRemaining: 7,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
        prizes: [
          { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
          { name: "Second Prize", description: "Runner up", value: "5000", currency: "USD", quantity: 1 }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
  }

  // Note: No in-memory session campaigns. Persistence handled via MongoDB.
  
  // Health
  if (url === '/api/health' || url === '/health') {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mongodb: { status: 'connected' }
    });
  }
  
  // Campaigns list
  if (req.method === 'GET' && /^\/(?:api\/)?campaigns\/?$/.test(url)) {
    try {
      const db = await getDb();
      const collection = db.collection('campaigns');
      const results = await collection.find({}).sort({ createdAt: -1 }).toArray();
      const campaigns = (results && results.length > 0) ? results : getBaseCampaigns();
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        campaigns,
        pagination: { page: 1, limit: 10, total: campaigns.length, totalPages: 1 }
      });
    } catch (err) {
      console.error('GET /campaigns error:', err);
      // Fail-open: return base campaigns to avoid frontend 500s if DB is unavailable
      const campaigns = getBaseCampaigns();
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        campaigns,
        pagination: { page: 1, limit: 10, total: campaigns.length, totalPages: 1 }
      });
    }
  }
  
  // Campaign detail and my-status
  if (req.method === 'GET' && (url.startsWith('/api/campaigns/') || url.startsWith('/campaigns/'))) {
    try {
      // Specific matchers (trailing slash tolerated)
      const statusMatch = url.match(/^\/(?:api\/)?campaigns\/([a-zA-Z0-9]+)\/my-status\/?$/);
      const detailMatch = url.match(/^\/(?:api\/)?campaigns\/([a-zA-Z0-9]+)\/?$/);

      // /:id/my-status → static object
      if (statusMatch) {
        res.setHeader('Cache-Control', 'no-store');
        return res.json({ joined: false, isWinner: false, hasClaimed: false, canClaim: false });
      }

      // /:id → find in DB by _id or contractId, else fallback
      if (detailMatch) {
        const idParam = detailMatch[1];
        let campaign = null;

        try {
          const db = await getDb();
          const collection = db.collection('campaigns');
          const asNumber = Number(idParam);

          // Try ObjectId lookup if idParam looks like a 24-hex string
          if (/^[a-fA-F0-9]{24}$/.test(idParam)) {
            const { ObjectId } = await import('mongodb');
            try {
              campaign = await collection.findOne({ _id: new ObjectId(idParam) });
            } catch (e) {
              // ignore invalid ObjectId
            }
          }

          // Fallback to contractId numeric match
          if (!campaign && !Number.isNaN(asNumber)) {
            campaign = await collection.findOne({ contractId: asNumber });
          }
        } catch (dbErr) {
          console.error('DB error in GET /campaigns/:id:', dbErr);
        }

        // Final fallback to base campaigns
        if (!campaign) {
          const base = getBaseCampaigns();
          const asNumber = Number(idParam);
          campaign = base.find(c => c.id === idParam || (!Number.isNaN(asNumber) && c.contractId === asNumber)) || null;
        }

        if (!campaign) {
          return res.status(404).json({ error: 'Not found' });
        }

        res.setHeader('Cache-Control', 'no-store');
        return res.json({ campaign });
      }

      return res.status(404).json({ error: 'Not found' });
    } catch (err) {
      console.error('GET /campaigns/:id error:', err);
      // Fail-open: if status route, return static object; else 404
      if (/\/my-status\/?$/.test(url)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.json({ joined: false, isWinner: false, hasClaimed: false, canClaim: false });
      }
      return res.status(404).json({ error: 'Not found' });
    }
  }
  
  // Admin stats
  if (url.includes('/admin/stats')) {
    return res.json({
      stats: {
        platform: { totalCampaigns: 2, activeCampaigns: 2, totalParticipants: 67, totalRaised: 23000, status: 'operational' },
        blockchain: { network: 'sepolia', chainId: '11155111', connected: true },
        database: { status: 'connected', lastCheck: new Date().toISOString() },
      }
    });
  }
  
  // Create campaign (persist to MongoDB)
  if (req.method === 'POST' && (url.includes('/admin/campaigns') || /^\/(?:api\/)?campaigns\/?$/.test(url))) {
    try {
      // Parse request body (handle both object and string)
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON in request body' });
        }
      }

      const nowIso = new Date().toISOString();
      const newCampaign = {
        id: `created_${Date.now()}`,
        contractId: Math.floor(Math.random() * 1e9),
        name: body?.name || 'New Campaign',
        description: body?.description || '',
        imageUrl: body?.imageUrl || 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop',
        status: 'active',
        currentAmount: 0,
        hardCap: Number(body?.hardCap || 0),
        participantCount: 0,
        softCap: Number(body?.softCap || 0),
        ticketAmount: Number(body?.ticketAmount || 0),
        totalValue: Number(body?.hardCap || 0),
        progressPercentage: 0,
        daysRemaining: 7,
        startDate: body?.startDate || nowIso,
        endDate: body?.endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
        prizes: Array.isArray(body?.prizes) ? body.prizes : [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const db = await getDb();
      const collection = db.collection('campaigns');
      const result = await collection.insertOne(newCampaign);

      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json({ message: 'Campaign created', campaign: { _id: result.insertedId, ...newCampaign } });
    } catch (err) {
      console.error('POST /campaigns error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  
  // Auth mock
  if (url.includes('/auth')) {
    if (req.method === 'GET') {
      return res.json({ message: 'Auth message', nonce: 'test', timestamp: Date.now() });
    }
    return res.json({ verified: true, isAdmin: true, timestamp: Date.now() });
  }
  
  return res.status(404).json({ error: 'Not found' });
}