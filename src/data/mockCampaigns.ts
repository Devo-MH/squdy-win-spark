// Mock campaign data for fallback when backend is unavailable
export const mockCampaigns = [
  {
    contractId: 1,
    name: "Squdy Genesis Campaign",
    description: "Join the first ever Squdy campaign! Stake SQUDY tokens to participate in this exclusive launch event with amazing prizes for early adopters.",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    softCap: 1000,
    hardCap: 50000,
    ticketAmount: 100,
    currentAmount: 15750,
    startDate: "2024-08-01T00:00:00.000Z",
    endDate: "2024-08-30T23:59:59.000Z",
    status: "active" as const,
    participantCount: 157,
    offchainTasks: [
      {
        id: "twitter_follow",
        title: "Follow @SqudyOfficial",
        description: "Follow our official Twitter account",
        type: "twitter_follow",
        points: 100,
        completed: false
      },
      {
        id: "discord_join",
        title: "Join Discord",
        description: "Join our community Discord server",
        type: "discord_join", 
        points: 150,
        completed: false
      },
      {
        id: "telegram_join",
        title: "Join Telegram",
        description: "Join our Telegram announcement channel",
        type: "telegram_join",
        points: 75,
        completed: false
      }
    ],
    prizes: [
      {
        name: "Grand Prize",
        description: "50,000 SQUDY Tokens + NFT Badge",
        value: 50000,
        currency: "SQUDY",
        quantity: 1
      },
      {
        name: "Runner Up",
        description: "25,000 SQUDY Tokens",
        value: 25000,
        currency: "SQUDY", 
        quantity: 3
      },
      {
        name: "Community Prize",
        description: "10,000 SQUDY Tokens",
        value: 10000,
        currency: "SQUDY",
        quantity: 10
      }
    ],
    winners: [],
    totalBurned: 0,
    bscScanUrl: "https://sepolia.etherscan.io/",
    createdAt: "2024-08-01T00:00:00.000Z",
    updatedAt: "2024-08-04T12:00:00.000Z",
    daysLeft: 26,
    progressPercentage: 31.5
  },
  {
    contractId: 2,
    name: "DeFi Warriors Competition",
    description: "Compete in our DeFi strategy challenge! Test your knowledge and trading skills to win exclusive rewards in this skill-based campaign.",
    imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop",
    softCap: 2000,
    hardCap: 75000,
    ticketAmount: 200,
    currentAmount: 28400,
    startDate: "2024-08-05T00:00:00.000Z",
    endDate: "2024-09-05T23:59:59.000Z",
    status: "active" as const,
    participantCount: 142,
    offchainTasks: [
      {
        id: "quiz_complete",
        title: "Complete DeFi Quiz",
        description: "Answer 10 questions about DeFi protocols",
        type: "quiz",
        points: 200,
        completed: false
      },
      {
        id: "twitter_retweet",
        title: "Retweet Campaign",
        description: "Retweet our campaign announcement",
        type: "twitter_retweet",
        points: 50,
        completed: false
      }
    ],
    prizes: [
      {
        name: "DeFi Master",
        description: "100,000 SQUDY + Strategy NFT",
        value: 100000,
        currency: "SQUDY",
        quantity: 1
      },
      {
        name: "DeFi Expert", 
        description: "50,000 SQUDY Tokens",
        value: 50000,
        currency: "SQUDY",
        quantity: 5
      }
    ],
    winners: [],
    totalBurned: 0,
    bscScanUrl: "https://sepolia.etherscan.io/",
    createdAt: "2024-08-05T00:00:00.000Z",
    updatedAt: "2024-08-04T12:00:00.000Z",
    daysLeft: 32,
    progressPercentage: 37.9
  },
  {
    contractId: 3,
    name: "Community Builder Rewards",
    description: "Help grow the Squdy community! Complete social tasks and invite friends to earn rewards in this community-focused campaign.",
    imageUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop",
    softCap: 500,
    hardCap: 25000,
    ticketAmount: 50,
    currentAmount: 8750,
    startDate: "2024-07-15T00:00:00.000Z",
    endDate: "2024-08-15T23:59:59.000Z",
    status: "active" as const,
    participantCount: 175,
    offchainTasks: [
      {
        id: "referral_3",
        title: "Invite 3 Friends",
        description: "Refer 3 friends to join Squdy",
        type: "referral",
        points: 300,
        completed: false
      },
      {
        id: "medium_follow",
        title: "Follow on Medium",
        description: "Follow our Medium publication",
        type: "medium_follow",
        points: 75,
        completed: false
      }
    ],
    prizes: [
      {
        name: "Community Champion",
        description: "25,000 SQUDY + Community Badge",
        value: 25000,
        currency: "SQUDY",
        quantity: 1
      },
      {
        name: "Community Supporter",
        description: "10,000 SQUDY Tokens",
        value: 10000,
        currency: "SQUDY",
        quantity: 10
      }
    ],
    winners: [],
    totalBurned: 0,
    bscScanUrl: "https://sepolia.etherscan.io/",
    createdAt: "2024-07-15T00:00:00.000Z",
    updatedAt: "2024-08-04T12:00:00.000Z",
    daysLeft: 11,
    progressPercentage: 35.0
  }
];

export const getMockCampaigns = () => {
  return {
    campaigns: mockCampaigns,
    pagination: {
      page: 1,
      limit: 10,
      total: mockCampaigns.length,
      totalPages: 1
    }
  };
};

export const getMockCampaignById = (id: number) => {
  const campaign = mockCampaigns.find(c => c.contractId === id);
  return campaign ? { campaign } : null;
};