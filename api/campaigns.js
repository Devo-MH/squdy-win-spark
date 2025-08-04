// Campaigns API endpoint for Vercel
const campaigns = [
  {
    id: 1,
    contractId: 1,
    name: "🚀 Squdy Launch Campaign",
    description: "Join the official Squdy platform launch! Complete social media tasks and earn SQUDY tokens.",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    status: "active",
    currentAmount: 2500,
    hardCap: 10000,
    participantCount: 15,
    softCap: 1000,
    ticketAmount: 100,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    prizes: [
      { name: "Grand Prize", value: 5000, currency: "SQUDY" },
      { name: "Second Prize", value: 2500, currency: "SQUDY" },
      { name: "Third Prize", value: 1000, currency: "SQUDY" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    contractId: 2,
    name: "🌟 Community Builder Challenge",
    description: "Help grow the Squdy community! Invite friends, create content, and earn rewards.",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop",
    status: "active",
    currentAmount: 750,
    hardCap: 5000,
    participantCount: 8,
    softCap: 500,
    ticketAmount: 50,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    prizes: [
      { name: "Top Builder", value: 2000, currency: "SQUDY" },
      { name: "Rising Star", value: 1000, currency: "SQUDY" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

module.exports = (req, res) => {
  try {
    console.log('📋 Campaigns API requested', { method: req.method, url: req.url });
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight handled');
      res.status(200).end();
      return;
    }
    
    if (req.method === 'GET') {
      const { id } = req.query;
      
      if (id) {
        // Get single campaign
        const campaign = campaigns.find(c => c.id === parseInt(id));
        if (!campaign) {
          console.log('❌ Campaign not found:', id);
          return res.status(404).json({ error: 'Campaign not found' });
        }
        console.log('✅ Single campaign returned:', campaign.name);
        return res.status(200).json({ campaign });
      }
      
      // Get all campaigns
      console.log('✅ All campaigns returned:', campaigns.length);
      res.status(200).json({
        campaigns: campaigns,
        pagination: {
          page: 1,
          limit: 10,
          total: campaigns.length,
          totalPages: 1
        }
      });
    } else {
      console.log('❌ Method not allowed:', req.method);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};