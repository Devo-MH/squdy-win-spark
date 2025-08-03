require('dotenv').config();
const { sequelize, User, Campaign } = require('../models');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Create demo users
    const demoUsers = await User.bulkCreate([
      {
        walletAddress: '0x1234567890123456789012345678901234567890',
        username: 'demo_user_1',
        email: 'demo1@example.com',
        isActive: true,
      },
      {
        walletAddress: '0x0987654321098765432109876543210987654321',
        username: 'demo_user_2', 
        email: 'demo2@example.com',
        isActive: true,
      },
      {
        walletAddress: '0x1111111111111111111111111111111111111111',
        username: 'campaign_creator',
        email: 'creator@example.com',
        isActive: true,
      },
    ], { 
      ignoreDuplicates: true,
      returning: true 
    });
    
    console.log(`✅ Created ${demoUsers.length} demo users`);
    
    // Create demo campaigns
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next week
    
    const demoCampaigns = await Campaign.bulkCreate([
      {
        title: 'Web3 Gaming Championship',
        description: 'Join the ultimate Web3 gaming tournament and compete for amazing prizes!',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop',
        targetAmount: 10000,
        currentAmount: 2500,
        maxParticipants: 100,
        participantCount: 25,
        ticketAmount: 100,
        startDate,
        endDate,
        status: 'active',
        prizes: [
          { place: 1, amount: 5000, description: '1st Place - Grand Prize' },
          { place: 2, amount: 3000, description: '2nd Place - Runner Up' },
          { place: 3, amount: 2000, description: '3rd Place - Bronze Medal' },
        ],
        offchainTasks: [
          {
            id: 'twitter-follow-1',
            type: 'twitter_follow',
            label: 'Follow @SqudyGaming',
            required: true,
            targetAccount: 'SqudyGaming',
            description: 'Follow our official Twitter account for updates',
          },
          {
            id: 'discord-join-1',
            type: 'discord_join',
            label: 'Join Discord Community',
            required: true,
            description: 'Join our Discord server for community interaction',
          },
          {
            id: 'twitter-retweet-1',
            type: 'twitter_retweet',
            label: 'Retweet Campaign Announcement',
            required: false,
            description: 'Help spread the word about our campaign',
          },
        ],
        createdBy: demoUsers[2]?.id || demoUsers[0].id,
      },
      {
        title: 'DeFi Innovation Challenge',
        description: 'Stake SQUDY tokens and win prizes in our DeFi innovation challenge.',
        imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=600&fit=crop',
        targetAmount: 50000,
        currentAmount: 15000,
        maxParticipants: 200,
        participantCount: 60,
        ticketAmount: 250,
        startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Started 2 days ago
        endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // Ends in 5 days
        status: 'active',
        prizes: [
          { place: 1, amount: 25000, description: 'Winner Takes All' },
          { place: 2, amount: 15000, description: 'Second Place' },
          { place: 3, amount: 10000, description: 'Third Place' },
        ],
        offchainTasks: [
          {
            id: 'twitter-follow-2',
            type: 'twitter_follow',
            label: 'Follow @SqudyDeFi',
            required: true,
            targetAccount: 'SqudyDeFi',
            description: 'Follow our DeFi updates',
          },
          {
            id: 'telegram-join-1',
            type: 'telegram_join',
            label: 'Join Telegram Channel',
            required: true,
            description: 'Join our Telegram for real-time updates',
          },
        ],
        createdBy: demoUsers[2]?.id || demoUsers[0].id,
      },
      {
        title: 'NFT Creator Showcase',
        description: 'Show off your NFT creations and win community recognition.',
        imageUrl: 'https://images.unsplash.com/photo-1640161704729-cbe966a08476?w=800&h=600&fit=crop',
        targetAmount: 25000,
        currentAmount: 8500,
        maxParticipants: 150,
        participantCount: 34,
        ticketAmount: 200,
        startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // Starts in 3 days
        endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // Ends in 2 weeks
        status: 'draft',
        prizes: [
          { place: 1, amount: 15000, description: 'Best NFT Collection' },
          { place: 2, amount: 7000, description: 'Most Creative' },
          { place: 3, amount: 3000, description: 'Community Choice' },
        ],
        offchainTasks: [
          {
            id: 'twitter-follow-3',
            type: 'twitter_follow',
            label: 'Follow @SqudyNFT',
            required: true,
            targetAccount: 'SqudyNFT',
            description: 'Follow our NFT community account',
          },
          {
            id: 'website-visit-1',
            type: 'website_visit',
            label: 'Visit NFT Gallery',
            required: false,
            targetUrl: 'https://gallery.squdy.io',
            description: 'Check out our NFT gallery',
          },
        ],
        createdBy: demoUsers[2]?.id || demoUsers[0].id,
      },
    ], { 
      ignoreDuplicates: true 
    });
    
    console.log(`✅ Created ${demoCampaigns.length} demo campaigns`);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Demo Data Summary:');
    console.log(`   • Users: ${demoUsers.length}`);
    console.log(`   • Campaigns: ${demoCampaigns.length}`);
    console.log('\n🔗 Demo Accounts:');
    demoUsers.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.username} (${user.walletAddress})`);
    });
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;