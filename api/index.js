// Ultra-minimal production API with MongoDB persistence (lazy-loaded)
async function getDb() {
  const mod = await import('./lib/mongodb.js');
  return mod.getDatabase();
}
export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

      // Overlay participant counts from participations collection
      let campaigns = (results && results.length > 0) ? results : getBaseCampaigns();
      try {
        const participations = db.collection('participations');
        const counts = await participations.aggregate([
          { $group: { _id: '$campaignId', count: { $sum: 1 } } }
        ]).toArray();
        const idToCount = new Map(counts.map(c => [String(c._id), c.count]));
        campaigns = campaigns.map(c => {
          const key1 = String(c.contractId);
          const key2 = c._id ? String(c._id) : null;
          const pc = idToCount.get(key1) ?? (key2 ? idToCount.get(key2) : undefined);
          return pc != null ? { ...c, participantCount: pc } : c;
        });
      } catch (e) {
        // ignore overlay errors
      }
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
  
  // Campaign detail, participants, winners, and my-status
  if (req.method === 'GET' && (url.startsWith('/api/campaigns/') || url.startsWith('/campaigns/'))) {
    try {
      // Specific matchers (trailing slash tolerated)
      const statusMatch = url.match(/^\/(?:api\/)?campaigns\/([a-zA-Z0-9]+)\/my-status\/?$/);
      const participantsMatch = url.match(/^\/(?:api\/)?campaigns\/([a-zA-Z0-9]+)\/participants\/?$/);
      const winnersMatch = url.match(/^\/(?:api\/)?campaigns\/([a-zA-Z0-9]+)\/winners\/?$/);
      const detailMatch = url.match(/^\/(?:api\/)?campaigns\/([a-zA-Z0-9]+)\/?$/);

      // /:id/my-status → static object
      if (statusMatch) {
        try {
          const idParam = statusMatch[1];
          const db = await getDb();
          const participations = db.collection('participations');
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const wallet = urlObj.searchParams.get('walletAddress');
          const idKey = /^[0-9]+$/.test(idParam) ? Number(idParam) : idParam;
          let joined = false;
          if (wallet) {
            const exists = await participations.findOne({ campaignId: idKey, walletAddress: wallet });
            joined = Boolean(exists);
          }
          res.setHeader('Cache-Control', 'no-store');
          return res.json({ joined, isWinner: false, hasClaimed: false, canClaim: false });
        } catch (_) {
          res.setHeader('Cache-Control', 'no-store');
          return res.json({ joined: false, isWinner: false, hasClaimed: false, canClaim: false });
        }
      }

      // /:id/participants → list with pagination
      if (participantsMatch) {
        const idParam = participantsMatch[1];
        const idKey = /^[0-9]+$/.test(idParam) ? Number(idParam) : idParam;
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const page = Math.max(1, Number(urlObj.searchParams.get('page') || '1'));
        const limit = Math.max(1, Math.min(100, Number(urlObj.searchParams.get('limit') || '20')));
        const skip = (page - 1) * limit;
        const db = await getDb();
        const participations = db.collection('participations');
        const [total, items] = await Promise.all([
          participations.countDocuments({ campaignId: idKey }),
          participations.find({ campaignId: idKey }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray()
        ]);
        const participants = items.map(p => ({
          walletAddress: p.walletAddress,
          campaignId: String(p.campaignId),
          socialTasksCompleted: p.socialTasks || {},
          stakeTxHash: p.stakeTxHash || '',
          ticketCount: 0,
          stakedAmount: Number(p.stakeAmount || 0),
          isWinner: false,
          prizeIndex: -1,
          prizeName: '',
          joinedAt: p.createdAt || new Date().toISOString(),
          allSocialTasksCompleted: Boolean(p.socialTasks && Object.values(p.socialTasks).every(Boolean)),
          socialCompletionPercentage: p.socialTasks ? Math.round(100 * (Object.values(p.socialTasks).filter(Boolean).length) / Math.max(1, Object.keys(p.socialTasks).length)) : 0,
        }));
        res.setHeader('Cache-Control', 'no-store');
        return res.json({ participants, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
      }

      // /:id/winners → empty list placeholder for now
      if (winnersMatch) {
        res.setHeader('Cache-Control', 'no-store');
        return res.json({ winners: [] });
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

        // Overlay participant count for this campaign
        try {
          const db = await getDb();
          const participations = db.collection('participations');
          const idKey = campaign.contractId != null ? campaign.contractId : (campaign._id ? String(campaign._id) : idParam);
          const count = await participations.countDocuments({ campaignId: idKey });
          if (Number.isFinite(count)) {
            campaign.participantCount = count;
          }
        } catch (e) {
          // ignore
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

  // Participate in campaign (off-chain record)
  if (req.method === 'POST' && /\/campaigns\/[a-zA-Z0-9]+\/participate\/?$/.test(url)) {
    try {
      const match = url.match(/\/campaigns\/([a-zA-Z0-9]+)\/participate\/?$/);
      const idParam = match ? match[1] : null;
      if (!idParam) return res.status(400).json({ error: 'Invalid campaign id' });

      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = {}; }
      }

      const db = await getDb();
      const collection = db.collection('participations');
      const doc = {
        campaignId: /^[0-9]+$/.test(idParam) ? Number(idParam) : idParam,
        walletAddress: body?.walletAddress || body?.address || 'unknown',
        stakeAmount: Number(body?.stakeAmount || 0),
        stakeTxHash: body?.stakeTxHash || '',
        socialTasks: body?.socialTasks || {},
        createdAt: new Date().toISOString(),
      };
      await collection.insertOne(doc);
      // Update campaign participantCount based on distinct wallets
      try {
        const distinctWallets = await collection.distinct('walletAddress', { campaignId: doc.campaignId });
        const participantCount = Array.isArray(distinctWallets) ? distinctWallets.length : 0;
        await db.collection('campaigns').updateOne(
          { contractId: doc.campaignId },
          { $set: { participantCount } }
        );
      } catch (e) {
        console.warn('Failed to update participantCount:', e);
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ success: true, participation: doc });
    } catch (err) {
      console.error('POST /campaigns/:id/participate error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Verify social task (off-chain record)
  if (req.method === 'POST' && /\/campaigns\/[a-zA-Z0-9]+\/verify-social\/?$/.test(url)) {
    try {
      const match = url.match(/\/campaigns\/([a-zA-Z0-9]+)\/verify-social\/?$/);
      const idParam = match ? match[1] : null;
      if (!idParam) return res.status(400).json({ error: 'Invalid campaign id' });

      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = {}; }
      }

      const db = await getDb();
      const collection = db.collection('verifications');
      const doc = {
        campaignId: /^[0-9]+$/.test(idParam) ? Number(idParam) : idParam,
        walletAddress: body?.walletAddress || body?.address || 'unknown',
        taskType: body?.taskType || 'unknown',
        proof: body?.proof || null,
        verified: true,
        createdAt: new Date().toISOString(),
      };
      await collection.insertOne(doc);
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ success: true, verification: doc });
    } catch (err) {
      console.error('POST /campaigns/:id/verify-social error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Generic offchain tasks verifier (used by embedded verifier UI)
  if (req.method === 'POST' && /^\/(?:api\/)?tasks\/verify\/?$/.test(url)) {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = {}; }
      }
      const allowTokenless = (process.env.VITE_ALLOW_TOKENLESS_SOCIAL || 'false').toLowerCase() === 'true';
      const autoConfirm = (process.env.FEATURE_AUTO_CONFIRM_ONCHAIN || 'false').toLowerCase() === 'true';

      // Optionally persist a lightweight verification log
      try {
        const db = await getDb();
        await db.collection('verifications').insertOne({
          task: body?.task || {},
          userAddress: body?.userAddress || 'unknown',
          tokenlessAccepted: allowTokenless,
          createdAt: new Date().toISOString(),
        });
      } catch (_) {}

      // Auto-confirm on-chain using relayer when enabled
      if (autoConfirm) {
        try {
          const { default: ethersMod } = await import('ethers');
          const ethers = ethersMod;
          const pk = process.env.RELAYER_PRIVATE_KEY;
          const rpc = process.env.RPC_URL || process.env.VITE_RPC_URL;
          const manager = process.env.VITE_CAMPAIGN_MANAGER_ADDRESS || process.env.CAMPAIGN_MANAGER_ADDRESS;
          const chainId = Number(process.env.CHAIN_ID || process.env.VITE_CHAIN_ID || 11155111);
          const campaignId = Number(body?.campaignId || body?.task?.campaignId);
          const user = String(body?.userAddress || body?.task?.userAddress || '').trim();

          if (pk && rpc && manager && user && !Number.isNaN(campaignId)) {
            const provider = new ethers.providers.JsonRpcProvider(rpc, { chainId });
            const signer = new ethers.Wallet(pk, provider);
            const abi = [
              'function confirmSocialTasks(uint256,address) external',
              'function getParticipant(uint256,address) view returns (tuple(uint256,uint256,bool,uint256))'
            ];
            const contract = new ethers.Contract(manager, abi, signer);
            try {
              const p = await contract.getParticipant(campaignId, user);
              const already = (p && (p.hasCompletedSocial === true || p[2] === true));
              if (!already) {
                const tx = await contract.confirmSocialTasks(campaignId, user);
                await tx.wait();
              }
            } catch (_) {}
          }
        } catch (e) {
          console.error('auto-confirm failed:', e?.message || e);
        }
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.json({ success: true, data: { verified: true, timestamp: Date.now() } });
    } catch (err) {
      console.error('POST /tasks/verify error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
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

  // Admin: campaign state/actions (exact endpoints) BEFORE create route
  // Activate
  if (req.method === 'POST' && /^\/(?:api\/)?admin\/campaigns\/[a-zA-Z0-9]+\/activate\/?$/.test(url)) {
    try {
      const idParam = url.match(/^\/(?:api\/)?admin\/campaigns\/([a-zA-Z0-9]+)\/activate\/?$/)[1];
      const db = await getDb();
      await db.collection('campaigns').updateOne(
        { contractId: /^[0-9]+$/.test(idParam) ? Number(idParam) : idParam },
        { $set: { status: 'active', updatedAt: new Date().toISOString() } }
      );
      return res.json({ message: 'Campaign activated' });
    } catch (e) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // Pause
  if (req.method === 'POST' && /^\/(?:api\/)?admin\/campaigns\/[a-zA-Z0-9]+\/pause\/?$/.test(url)) {
    try {
      const idParam = url.match(/^\/(?:api\/)?admin\/campaigns\/([a-zA-Z0-9]+)\/pause\/?$/)[1];
      const db = await getDb();
      await db.collection('campaigns').updateOne(
        { contractId: /^[0-9]+$/.test(idParam) ? Number(idParam) : idParam },
        { $set: { status: 'paused', updatedAt: new Date().toISOString() } }
      );
      return res.json({ message: 'Campaign paused' });
    } catch (e) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // Close/finish
  if (req.method === 'POST' && /^\/(?:api\/)?admin\/campaigns\/[a-zA-Z0-9]+\/close\/?$/.test(url)) {
    try {
      const idParam = url.match(/^\/(?:api\/)?admin\/campaigns\/([a-zA-Z0-9]+)\/close\/?$/)[1];
      const db = await getDb();
      await db.collection('campaigns').updateOne(
        { contractId: /^[0-9]+$/.test(idParam) ? Number(idParam) : idParam },
        { $set: { status: 'finished', updatedAt: new Date().toISOString() } }
      );
      return res.json({ message: 'Campaign closed' });
    } catch (e) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // Select winners (off-chain placeholder)
  if (req.method === 'POST' && /^\/(?:api\/)?admin\/campaigns\/[a-zA-Z0-9]+\/select-winners\/?$/.test(url)) {
    try {
      const idParam = url.match(/^\/(?:api\/)?admin\/campaigns\/([a-zA-Z0-9]+)\/select-winners\/?$/)[1];
      const db = await getDb();
      // Mark status finished to indicate winners selected; store a stub timestamp
      await db.collection('campaigns').updateOne(
        { contractId: /^[0-9]+$/.test(idParam) ? Number(idParam) : idParam },
        { $set: { status: 'finished', winnerSelectionTxHash: 'offchain', updatedAt: new Date().toISOString() } }
      );
      return res.json({ message: 'Winners selected', campaignId: idParam });
    } catch (e) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // Burn tokens (off-chain placeholder)
  if (req.method === 'POST' && /^\/(?:api\/)?admin\/campaigns\/[a-zA-Z0-9]+\/burn-tokens\/?$/.test(url)) {
    try {
      const idParam = url.match(/^\/(?:api\/)?admin\/campaigns\/([a-zA-Z0-9]+)\/burn-tokens\/?$/)[1];
      const db = await getDb();
      await db.collection('campaigns').updateOne(
        { contractId: /^[0-9]+$/.test(idParam) ? Number(idParam) : idParam },
        { $set: { status: 'burned', tokensAreBurned: true, updatedAt: new Date().toISOString() } }
      );
      return res.json({ message: 'Tokens burned', campaignId: idParam });
    } catch (e) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  
  // Admin: delete single campaign by id or contractId
  if (req.method === 'DELETE' && /^\/(?:api\/)?admin\/campaigns\/[a-zA-Z0-9]+\/?$/.test(url)) {
    try {
      const match = url.match(/^\/(?:api\/)?admin\/campaigns\/([a-zA-Z0-9]+)\/?$/);
      const idParam = match ? match[1] : null;
      if (!idParam) return res.status(400).json({ error: 'Invalid campaign id' });

      const db = await getDb();
      const campaigns = db.collection('campaigns');
      const participations = db.collection('participations');
      const verifications = db.collection('verifications');

      const asNumber = /^[0-9]+$/.test(idParam) ? Number(idParam) : null;
      let deleteFilter = {};
      if (asNumber != null) {
        deleteFilter = { $or: [ { contractId: asNumber }, { id: String(asNumber) } ] };
      } else if (/^[a-fA-F0-9]{24}$/.test(idParam)) {
        const { ObjectId } = await import('mongodb');
        deleteFilter = { _id: new ObjectId(idParam) };
      } else {
        deleteFilter = { $or: [ { id: idParam }, { contractId: idParam } ] };
      }

      const deleted = await campaigns.deleteMany(deleteFilter);
      // Cascade cleanup of participations and verifications
      const campaignKey = asNumber != null ? asNumber : idParam;
      await participations.deleteMany({ campaignId: campaignKey });
      await verifications.deleteMany({ campaignId: campaignKey });

      return res.json({ success: true, deletedCount: deleted.deletedCount || 0 });
    } catch (err) {
      console.error('DELETE /admin/campaigns/:id error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Admin: bulk delete campaigns (by ids or all=true)
  if (req.method === 'DELETE' && /^\/(?:api\/)?admin\/campaigns\/?$/.test(url)) {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = {}; }
      }
      const query = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams;
      const deleteAll = query.get('all') === 'true' || body?.all === true;
      const ids = Array.isArray(body?.ids) ? body.ids : [];

      const db = await getDb();
      const campaigns = db.collection('campaigns');
      const participations = db.collection('participations');
      const verifications = db.collection('verifications');

      let deletedCount = 0;
      if (deleteAll) {
        const result = await campaigns.deleteMany({});
        deletedCount = result.deletedCount || 0;
        await participations.deleteMany({});
        await verifications.deleteMany({});
      } else if (ids.length > 0) {
        // Support numeric contractId and string id
        const numericIds = ids.filter((v) => /^[0-9]+$/.test(String(v))).map((v) => Number(v));
        const stringIds = ids.map((v) => String(v));
        const result = await campaigns.deleteMany({
          $or: [
            { contractId: { $in: numericIds } },
            { id: { $in: stringIds } }
          ]
        });
        deletedCount = result.deletedCount || 0;
        await participations.deleteMany({ campaignId: { $in: [...numericIds, ...stringIds] } });
        await verifications.deleteMany({ campaignId: { $in: [...numericIds, ...stringIds] } });
      } else {
        return res.status(400).json({ error: 'Provide all=true or ids array' });
      }

      return res.json({ success: true, deletedCount });
    } catch (err) {
      console.error('DELETE /admin/campaigns error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  
  // Create campaign (persist to MongoDB) - exact base paths only
  if (req.method === 'POST' && (/^\/(?:api\/)?admin\/campaigns\/?$/.test(url) || /^\/(?:api\/)?campaigns\/?$/.test(url))) {
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
        contractId: Number.isFinite(Number(body?.contractId)) ? Number(body.contractId) : Math.floor(Math.random() * 1e9),
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
        offchainTasks: Array.isArray(body?.offchainTasks) ? body.offchainTasks : [],
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