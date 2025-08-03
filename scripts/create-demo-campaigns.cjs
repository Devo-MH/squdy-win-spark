const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

const demoCampaigns = [
  {
    title: "🎮 Gaming NFT Giveaway",
    description: "Win exclusive gaming NFTs worth $5,000! Complete simple social tasks and stake SQUDY tokens to enter this epic giveaway.",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    targetAmount: 10000,
    ticketPrice: 100,
    startTime: Date.now(),
    endTime: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    maxParticipants: 1000,
    prizePool: 5000,
    offchainTasks: [
      {
        id: "discord-join",
        type: "discord_join",
        label: "Join Our Discord Server",
        required: true,
        reward: 50,
        config: { serverId: "demo_server_id" }
      },
      {
        id: "telegram-join", 
        type: "telegram_join",
        label: "Join Telegram Channel",
        required: true,
        reward: 50,
        config: { channelId: "@squdydemo" }
      }
    ]
  },
  {
    title: "💰 DeFi Yield Farm Rewards",
    description: "Participate in our DeFi yield farming program and win $10,000 in various crypto tokens. Perfect for DeFi enthusiasts!",
    imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=600&fit=crop",
    targetAmount: 25000,
    ticketPrice: 250,
    startTime: Date.now() + (24 * 60 * 60 * 1000), // Tomorrow
    endTime: Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days
    maxParticipants: 500,
    prizePool: 10000,
    offchainTasks: [
      {
        id: "website-visit",
        type: "website_visit", 
        label: "Visit Our Website",
        required: true,
        reward: 25,
        config: { url: "https://squdy.vercel.app" }
      },
      {
        id: "discord-react",
        type: "discord_react",
        label: "React to Announcement",
        required: false,
        reward: 25,
        config: { serverId: "demo_server_id", messageId: "demo_message" }
      }
    ]
  },
  {
    title: "🚀 Early Adopter Bonus",
    description: "Be among the first 100 users to try our platform! Win $2,000 in SQUDY tokens and exclusive early adopter NFTs.",
    imageUrl: "https://images.unsplash.com/photo-1518183214770-9cffbec72538?w=1200&h=600&fit=crop",
    targetAmount: 5000,
    ticketPrice: 50,
    startTime: Date.now(),
    endTime: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days
    maxParticipants: 100,
    prizePool: 2000,
    offchainTasks: [
      {
        id: "email-subscribe",
        type: "email_signup",
        label: "Subscribe to Newsletter", 
        required: true,
        reward: 100,
        config: { endpoint: "/api/newsletter" }
      }
    ]
  },
  {
    title: "🎨 NFT Art Collection Drop",
    description: "Win rare NFT artworks from top digital artists. Collection worth $15,000 featuring 10 unique pieces!",
    imageUrl: "https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=1200&h=600&fit=crop",
    targetAmount: 50000,
    ticketPrice: 500,
    startTime: Date.now() + (2 * 24 * 60 * 60 * 1000), // Day after tomorrow
    endTime: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    maxParticipants: 2000,
    prizePool: 15000,
    offchainTasks: [
      {
        id: "telegram-forward",
        type: "telegram_share",
        label: "Share Campaign on Telegram",
        required: false,
        reward: 75,
        config: { channelId: "@squdydemo" }
      },
      {
        id: "discord-message",
        type: "discord_message",
        label: "Introduce Yourself in Discord",
        required: false,
        reward: 75,
        config: { serverId: "demo_server_id", channelId: "general" }
      }
    ]
  },
  {
    title: "⚡ Flash Campaign - 24H Only",
    description: "Lightning-fast 24-hour campaign! Win $1,000 instantly. First come, first served with only 50 spots available!",
    imageUrl: "https://images.unsplash.com/photo-1551808525-51a94da548ce?w=1200&h=600&fit=crop",
    targetAmount: 2500,
    ticketPrice: 50,
    startTime: Date.now() + (12 * 60 * 60 * 1000), // 12 hours from now
    endTime: Date.now() + (36 * 60 * 60 * 1000), // 36 hours from now (24h duration)
    maxParticipants: 50,
    prizePool: 1000,
    offchainTasks: [
      {
        id: "quick-follow",
        type: "twitter_follow",
        label: "Follow @SqudyPlatform (Demo)",
        required: true,
        reward: 200,
        config: { account: "squdyplatform" }
      }
    ]
  }
];

async function createDemoCampaigns() {
  console.log('🎪 Creating demo campaigns...');
  
  for (let i = 0; i < demoCampaigns.length; i++) {
    const campaign = demoCampaigns[i];
    
    try {
      console.log(`📝 Creating: ${campaign.title}`);
      
      const response = await axios.post(`${API_URL}/campaigns`, campaign, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Created campaign ${i + 1}: ${response.data.campaign.title}`);
      console.log(`   🆔 ID: ${response.data.campaign.id}`);
      console.log(`   💰 Prize: $${campaign.prizePool}`);
      console.log(`   🎫 Ticket Price: ${campaign.ticketPrice} SQUDY`);
      console.log(`   📋 Tasks: ${campaign.offchainTasks.length}`);
      
    } catch (error) {
      console.error(`❌ Failed to create ${campaign.title}:`, error.response?.data || error.message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎉 Demo campaigns creation completed!');
  console.log('🔗 Check them out at: http://localhost:8081');
}

async function checkServerHealth() {
  try {
    const response = await axios.get(`${API_URL.replace('/api', '')}/health`);
    console.log('✅ Backend server is running:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Backend server not reachable. Make sure it\'s running on port 3001');
    console.error('💡 Run: cd backend && node server.js');
    return false;
  }
}

async function main() {
  console.log('🚀 Demo Campaign Setup Script');
  console.log('================================');
  
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    process.exit(1);
  }
  
  await createDemoCampaigns();
  
  console.log('\n📊 Next Steps:');
  console.log('1. Open http://localhost:8081 in your browser');
  console.log('2. Connect your MetaMask wallet (Sepolia network)');
  console.log('3. Get free test tokens from the banner');
  console.log('4. Try participating in the demo campaigns!');
  console.log('\n🎯 Ready for launch! 🚀');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createDemoCampaigns };