const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

console.log('🚀 Squdy Backend with MongoDB Starting...');
console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${port}`);

// Import models
const Campaign = require('./models/mongodb/Campaign');
const User = require('./models/mongodb/User');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8081',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// MongoDB Connection
const connectDB = async () => {
  try {
    // MongoDB connection string (try Atlas free tier first, fallback to simple server)
    const mongoURI = process.env.MONGODB_URI || 
                     process.env.MONGO_URL || 
                     'mongodb://localhost:27017/squdy-campaigns';
    
    console.log('🔗 Connecting to MongoDB...');
    console.log(`📍 URI: ${mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // Create initial data if none exists
    await seedInitialData();
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('🔄 Falling back to simple server mode...');
    
    // If MongoDB fails, use the simple server logic
    return false;
  }
  return true;
};

// Seed initial campaign data
const seedInitialData = async () => {
  try {
    const campaignCount = await Campaign.countDocuments();
    if (campaignCount === 0) {
      console.log('🌱 Seeding initial campaign data...');
      
      const initialCampaign = new Campaign({
        contractId: 1,
        name: "Test Campaign",
        description: "A test campaign for development and testing purposes",
        imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
        status: "active",
        currentAmount: 1000,
        hardCap: 10000,
        ticketAmount: 100,
        participantCount: 5,
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        offchainTasks: [
          {
            id: 'twitter-follow',
            type: 'twitter_follow',
            label: 'Follow @SqudyToken',
            description: 'Follow our Twitter account for updates',
            required: true,
            targetAccount: 'SqudyToken',
            reward: 10
          },
          {
            id: 'telegram-join',
            type: 'telegram_join',
            label: 'Join Telegram',
            description: 'Join our Telegram community',
            required: true,
            targetAccount: 'SqudyToken',
            reward: 15
          }
        ]
      });
      
      await initialCampaign.save();
      console.log('✅ Initial campaign created');
    }
  } catch (error) {
    console.error('⚠️  Seeding error:', error.message);
  }
};

// API Routes

// Health check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'mongodb',
    dbStatus: dbStatus,
    version: '1.0.0'
  });
});

// Get all campaigns
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get single campaign
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ contractId: parseInt(req.params.id) });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Create new campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    // Get the next contract ID
    const lastCampaign = await Campaign.findOne().sort({ contractId: -1 });
    const nextContractId = lastCampaign ? lastCampaign.contractId + 1 : 1;
    
    const campaignData = {
      ...req.body,
      contractId: nextContractId,
      status: 'active'
    };
    
    const campaign = new Campaign(campaignData);
    await campaign.save();
    
    console.log(`✅ Campaign created: ${campaign.name} (ID: ${campaign.contractId})`);
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// User participation
app.post('/api/campaigns/:id/participate', async (req, res) => {
  try {
    const { walletAddress, stakeAmount, socialTasks } = req.body;
    const campaignId = parseInt(req.params.id);
    
    // Find or create user
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user) {
      user = new User({ 
        walletAddress: walletAddress.toLowerCase(),
        totalStaked: 0
      });
    }
    
    // Find campaign
    const campaign = await Campaign.findOne({ contractId: campaignId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check if user already participated
    const existingParticipation = user.participatedCampaigns.find(
      p => p.campaignId.toString() === campaign._id.toString()
    );
    
    if (existingParticipation) {
      return res.status(400).json({ error: 'User already participated in this campaign' });
    }
    
    // Add participation
    user.participatedCampaigns.push({
      campaignId: campaign._id,
      stakeAmount: parseFloat(stakeAmount) || 0,
      socialTasks: Object.entries(socialTasks || {}).map(([taskId, task]) => ({
        taskId,
        completed: task.completed || false,
        completedAt: task.completed ? new Date() : null,
        proof: task.proof || ''
      }))
    });
    
    user.totalStaked += parseFloat(stakeAmount) || 0;
    await user.save();
    
    // Update campaign stats
    campaign.participantCount += 1;
    campaign.currentAmount += parseFloat(stakeAmount) || 0;
    await campaign.save();
    
    console.log(`🎯 User ${walletAddress} participated in campaign ${campaign.name}`);
    res.json({ 
      message: 'Successfully participated in campaign',
      user: user.walletAddress,
      campaign: campaign.name
    });
    
  } catch (error) {
    console.error('Error in participation:', error);
    res.status(500).json({ error: 'Failed to register participation' });
  }
});

// Check user campaign status
app.get('/api/campaigns/:id/status', async (req, res) => {
  try {
    const walletAddress = req.query.wallet?.toLowerCase();
    const campaignId = parseInt(req.params.id);
    
    if (!walletAddress) {
      return res.json({ isParticipating: false, status: null });
    }
    
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.json({ isParticipating: false, status: null });
    }
    
    const campaign = await Campaign.findOne({ contractId: campaignId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const participation = user.participatedCampaigns.find(
      p => p.campaignId.toString() === campaign._id.toString()
    );
    
    if (!participation) {
      return res.json({ isParticipating: false, status: null });
    }
    
    res.json({
      isParticipating: true,
      status: 'participated',
      stakeAmount: participation.stakeAmount,
      joinedAt: participation.joinedAt,
      socialTasks: participation.socialTasks
    });
    
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Admin: Select winners
app.post('/api/campaigns/:id/select-winners', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = await Campaign.findOne({ contractId: campaignId });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Mock winner selection
    const winners = [
      { address: '0x1234...5678', amount: 1000, rank: 1 },
      { address: '0x2345...6789', amount: 500, rank: 2 },
      { address: '0x3456...7890', amount: 250, rank: 3 }
    ];
    
    campaign.winners = winners;
    campaign.status = 'winners_selected';
    await campaign.save();
    
    console.log(`🏆 Winners selected for campaign: ${campaign.name}`);
    res.json({ message: 'Winners selected successfully', winners });
    
  } catch (error) {
    console.error('Error selecting winners:', error);
    res.status(500).json({ error: 'Failed to select winners' });
  }
});

// Admin: Burn tokens
app.post('/api/campaigns/:id/burn', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = await Campaign.findOne({ contractId: campaignId });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const burnAmount = campaign.currentAmount;
    campaign.burnedTokens = burnAmount;
    campaign.status = 'burned';
    await campaign.save();
    
    console.log(`🔥 Tokens burned for campaign: ${campaign.name} (${burnAmount} tokens)`);
    res.json({ 
      message: 'Tokens burned successfully', 
      burnedAmount: burnAmount 
    });
    
  } catch (error) {
    console.error('Error burning tokens:', error);
    res.status(500).json({ error: 'Failed to burn tokens' });
  }
});

// Social task verification (demo mode)
app.post('/api/tasks/verify', async (req, res) => {
  try {
    const { taskType, walletAddress, proof } = req.body;
    
    console.log(`🎭 Demo verification: ${taskType} for ${walletAddress}`);
    
    // In demo mode, auto-verify all tasks
    const isVerified = true;
    
    res.json({
      verified: isVerified,
      taskType,
      proof,
      message: isVerified ? 'Task verified successfully!' : 'Task verification failed'
    });
  } catch (error) {
    console.error('Error verifying task:', error);
    res.status(500).json({ error: 'Failed to verify task' });
  }
});

// Start server
const startServer = async () => {
  const dbConnected = await connectDB();
  
  if (!dbConnected) {
    console.log('⚠️  MongoDB not available, check MONGODB_URI environment variable');
    console.log('💡 For free MongoDB hosting, try MongoDB Atlas: https://www.mongodb.com/atlas');
    console.log('🔄 Server starting without database (limited functionality)');
  }
  
  app.listen(port, () => {
    console.log(`🚀 Squdy Backend running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`📋 Campaigns: http://localhost:${port}/api/campaigns`);
    
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.log('🚂 Running on Railway Platform');
    }
    
    console.log('✅ Server ready for requests');
  });
};

startServer().catch(console.error);