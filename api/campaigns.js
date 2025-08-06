// Campaigns API endpoint for Vercel
const campaigns = [
  {
    id: 1,
    contractId: 1,
    name: "Test Campaign",
    description: "A test campaign for development",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    status: "burned",
    currentAmount: 1000,
    hardCap: 10000,
    participantCount: 5,
    softCap: 500,
    ticketAmount: 100,
    startDate: "2025-08-04T12:10:45.817Z",
    endDate: "2025-08-11T12:10:45.819Z",
    prizes: [
      { name: "First Prize", value: 1000, currency: "USD" },
      { name: "Second Prize", value: 500, currency: "USD" }
    ],
    createdAt: "2025-08-04T12:10:45.819Z",
    updatedAt: "2025-08-04T14:18:38.900Z"
  },
  {
    id: 2,
    contractId: 2,
    name: "Test Campaign 886",
    description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    status: "active",
    currentAmount: 0,
    hardCap: 50000,
    participantCount: 0,
    softCap: 5000,
    ticketAmount: 100,
    startDate: "2025-08-05T13:03",
    endDate: "2025-08-11T13:03",
    prizes: [
      { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
      { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
      { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
    ],
    createdAt: "2025-08-04T13:03:45.272Z",
    updatedAt: "2025-08-04T13:03:49.873Z"
  },
  {
    id: 3,
    contractId: 3,
    name: "Test Campaign 151",
    description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    status: "active",
    currentAmount: 0,
    hardCap: 50000,
    participantCount: 0,
    softCap: 5000,
    ticketAmount: 100,
    startDate: "2025-08-05T14:18",
    endDate: "2025-08-11T14:18",
    prizes: [
      { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
      { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
      { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
    ],
    createdAt: "2025-08-04T14:18:24.870Z",
    updatedAt: "2025-08-04T14:18:29.026Z"
  },
  {
    id: 4,
    contractId: 4,
    name: "Test Campaign 693",
    description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    status: "active",
    currentAmount: 0,
    hardCap: 50000,
    participantCount: 0,
    softCap: 5000,
    ticketAmount: 100,
    startDate: "2025-08-07T12:28",
    endDate: "2025-08-13T12:28",
    prizes: [
      { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
      { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
      { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
    ],
    createdAt: "2025-08-06T12:28:41.716Z",
    updatedAt: "2025-08-06T12:28:57.179Z"
  },
  {
    id: 5,
    contractId: 5,
    name: "Dina-Test Campaign 118",
    description: "This is a test campaign created for testing purposes. Participants can stake SQUDY tokens to win amazing prizes!",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    status: "active",
    currentAmount: 0,
    hardCap: 50000,
    participantCount: 0,
    softCap: 5000,
    ticketAmount: 100,
    startDate: "2025-08-07T15:04",
    endDate: "2025-08-13T15:04",
    prizes: [
      { name: "First Prize", description: "Winner takes all", value: "10000", currency: "USD", quantity: 1 },
      { name: "Second Prize", description: "Runner up reward", value: "5000", currency: "USD", quantity: 1 },
      { name: "Third Prize", description: "Bronze medal", value: "2500", currency: "USD", quantity: 1 }
    ],
    createdAt: "2025-08-06T15:05:00.262Z",
    updatedAt: "2025-08-06T15:05:10.804Z"
  }
];

export default function handler(req, res) {
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
}