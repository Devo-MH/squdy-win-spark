// Campaigns API endpoint for Vercel
const campaigns = [
  {
    id: 1,
    contractId: 1,
    name: "Test Campaign",
    description: "A test campaign for development",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    status: "active",
    currentAmount: 1000,
    hardCap: 10000,
    participantCount: 5,
    softCap: 500,
    ticketAmount: 100,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    prizes: [
      { name: "First Prize", value: 1000, currency: "USD" },
      { name: "Second Prize", value: 500, currency: "USD" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

module.exports = (req, res) => {
  console.log('📋 Campaigns API requested');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    const { id } = req.query;
    
    if (id) {
      // Get single campaign
      const campaign = campaigns.find(c => c.id === parseInt(id));
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      return res.status(200).json({ campaign });
    }
    
    // Get all campaigns
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
    res.status(405).json({ error: 'Method not allowed' });
  }
};