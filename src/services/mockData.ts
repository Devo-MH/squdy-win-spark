import { Campaign, Prize, SocialMediaStep, User, UserParticipation, Winner, CampaignStats, TokenInfo } from '@/types';

// Mock Token Info
export const tokenInfo: TokenInfo = {
  symbol: 'SQUDY',
  name: 'Squdy Token',
  decimals: 18,
  totalSupply: 1000000000,
  circulatingSupply: 850000000,
  burnedAmount: 150000000,
  contractAddress: '0x1234567890123456789012345678901234567890',
  pancakeSwapUrl: 'https://pancakeswap.finance/swap?outputCurrency=0x1234567890123456789012345678901234567890',
  priceUSD: 0.0025,
  marketCap: 2125000
};

// Mock Social Media Steps
export const defaultSocialMediaSteps: SocialMediaStep[] = [
  {
    id: '1',
    type: 'follow_x',
    title: 'Follow @SqudyOfficial on X',
    description: 'Follow our official X account to stay updated',
    link: 'https://x.com/SqudyOfficial',
    required: true
  },
  {
    id: '2',
    type: 'like_tweet',
    title: 'Like the Campaign Tweet',
    description: 'Like our campaign announcement tweet',
    link: 'https://x.com/SqudyOfficial/status/123456789',
    required: true
  },
  {
    id: '3',
    type: 'retweet',
    title: 'Retweet the Campaign',
    description: 'Retweet our campaign to spread the word',
    link: 'https://x.com/SqudyOfficial/status/123456789',
    required: true
  },
  {
    id: '4',
    type: 'join_discord',
    title: 'Join Discord Server',
    description: 'Join our Discord community',
    link: 'https://discord.gg/squdy',
    required: true
  },
  {
    id: '5',
    type: 'join_telegram',
    title: 'Join Telegram Group',
    description: 'Join our Telegram group for updates',
    link: 'https://t.me/SqudyOfficial',
    required: true
  },
  {
    id: '6',
    type: 'subscribe_email',
    title: 'Subscribe to Newsletter',
    description: 'Subscribe to our newsletter for updates',
    link: '/newsletter',
    required: true
  },
  {
    id: '7',
    type: 'follow_medium',
    title: 'Follow Medium Blog',
    description: 'Follow our Medium blog for articles',
    link: 'https://medium.com/@squdy',
    required: false
  }
];

// Mock Prizes
export const mockPrizes: Prize[] = [
  {
    id: '1',
    name: 'Grand Prize',
    description: 'Cash prize for the main winner',
    value: 10000,
    currency: 'USD',
    quantity: 1,
    image: '/prizes/cash-prize.png'
  },
  {
    id: '2',
    name: 'Second Prize',
    description: 'Exclusive NFT collection',
    value: 5000,
    currency: 'NFT',
    quantity: 3,
    image: '/prizes/nft-prize.png'
  },
  {
    id: '3',
    name: 'Third Prize',
    description: 'SQUDY tokens reward',
    value: 25000,
    currency: 'SQUDY',
    quantity: 10,
    image: '/prizes/token-prize.png'
  }
];

// Mock Campaigns
export const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Lunar Prize Pool',
    description: 'A massive campaign with multiple prize tiers including exclusive NFTs and cash rewards. Join the biggest burn-to-win event in the SQUDY ecosystem!',
    image: '/campaigns/lunar-prize.jpg',
    status: 'active',
    softCap: 100000,
    hardCap: 500000,
    currentAmount: 350000,
    ticketAmount: 100,
    participants: 1250,
    prizes: mockPrizes,
    socialMediaSteps: defaultSocialMediaSteps,
    startDate: '2024-01-15',
    endDate: '2024-02-15',
    duration: 30,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-15',
    createdBy: '0xAdminWallet123456789012345678901234567890',
    contractAddress: '0xCampaignContract123456789012345678901234567890'
  },
  {
    id: '2',
    name: 'DeFi Champions',
    description: 'Compete with other DeFi enthusiasts for amazing rewards and recognition. Show your DeFi knowledge and win big!',
    image: '/campaigns/defi-champions.jpg',
    status: 'active',
    softCap: 50000,
    hardCap: 200000,
    currentAmount: 180000,
    ticketAmount: 50,
    participants: 890,
    prizes: [
      {
        id: '4',
        name: 'Champion Prize',
        description: 'Cash prize for DeFi champions',
        value: 5000,
        currency: 'USD',
        quantity: 1
      },
      {
        id: '5',
        name: 'Runner-up Prize',
        description: 'Gaming gear and merchandise',
        value: 1000,
        currency: 'USD',
        quantity: 5
      }
    ],
    socialMediaSteps: defaultSocialMediaSteps.slice(0, 5),
    startDate: '2024-01-20',
    endDate: '2024-02-20',
    duration: 30,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
    createdBy: '0xAdminWallet123456789012345678901234567890',
    contractAddress: '0xDeFiContract123456789012345678901234567890'
  },
  {
    id: '3',
    name: 'Genesis Burn',
    description: 'The first ever SQUDY burn campaign that started it all. A historic event that set the foundation for our ecosystem.',
    image: '/campaigns/genesis-burn.jpg',
    status: 'finished',
    softCap: 75000,
    hardCap: 300000,
    currentAmount: 300000,
    ticketAmount: 75,
    participants: 2100,
    prizes: [
      {
        id: '6',
        name: 'Genesis Prize',
        description: 'Historic cash prize',
        value: 15000,
        currency: 'USD',
        quantity: 1
      },
      {
        id: '7',
        name: 'Hardware Wallet',
        description: 'Premium hardware wallet',
        value: 500,
        currency: 'USD',
        quantity: 10
      }
    ],
    socialMediaSteps: defaultSocialMediaSteps,
    startDate: '2023-12-01',
    endDate: '2023-12-31',
    duration: 30,
    createdAt: '2023-11-25',
    updatedAt: '2023-12-31',
    createdBy: '0xAdminWallet123456789012345678901234567890',
    contractAddress: '0xGenesisContract123456789012345678901234567890',
    winners: [
      {
        id: '1',
        walletAddress: '0xWinner123456789012345678901234567890123456',
        prize: {
          id: '6',
          name: 'Genesis Prize',
          description: 'Historic cash prize',
          value: 15000,
          currency: 'USD',
          quantity: 1
        },
        selectedAt: '2023-12-31T23:59:59Z',
        transactionHash: '0xWinnerTx1234567890123456789012345678901234567890'
      }
    ],
    totalBurned: 300000,
    winnerSelectionTx: '0xWinnerSelection1234567890123456789012345678901234567890',
    bscScanUrl: 'https://bscscan.com/tx/0xWinnerSelection1234567890123456789012345678901234567890'
  }
];

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    walletAddress: '0xUser1234567890123456789012345678901234567890',
    email: 'user1@example.com',
    username: 'CryptoEnthusiast',
    totalStaked: 5000,
    totalWon: 15000,
    campaignsParticipated: 3,
    createdAt: '2023-12-01'
  },
  {
    id: '2',
    walletAddress: '0xUser2345678901234567890123456789012345678901',
    email: 'user2@example.com',
    username: 'DeFiMaster',
    totalStaked: 3000,
    totalWon: 5000,
    campaignsParticipated: 2,
    createdAt: '2023-12-15'
  }
];

// Mock User Participations
export const mockUserParticipations: UserParticipation[] = [
  {
    id: '1',
    userId: '1',
    campaignId: '1',
    walletAddress: '0xUser1234567890123456789012345678901234567890',
    stakedAmount: 500,
    ticketCount: 5,
    socialMediaSteps: defaultSocialMediaSteps.map(step => ({ ...step, completed: true, completedAt: '2024-01-16' })),
    allStepsCompleted: true,
    joinedAt: '2024-01-16',
    isWinner: false
  },
  {
    id: '2',
    userId: '2',
    campaignId: '1',
    walletAddress: '0xUser2345678901234567890123456789012345678901',
    stakedAmount: 200,
    ticketCount: 2,
    socialMediaSteps: defaultSocialMediaSteps.map(step => ({ ...step, completed: true, completedAt: '2024-01-17' })),
    allStepsCompleted: true,
    joinedAt: '2024-01-17',
    isWinner: false
  }
];

// Mock Campaign Stats
export const campaignStats: CampaignStats = {
  totalCampaigns: 15,
  activeCampaigns: 2,
  totalParticipants: 8500,
  totalStaked: 2500000,
  totalBurned: 1500000,
  totalPrizesAwarded: 45
};

// Helper function to get campaign by ID
export const getCampaignById = (id: string): Campaign | undefined => {
  return mockCampaigns.find(campaign => campaign.id === id);
};

// Helper function to get user participations by campaign ID
export const getUserParticipationsByCampaignId = (campaignId: string): UserParticipation[] => {
  return mockUserParticipations.filter(participation => participation.campaignId === campaignId);
};

// Helper function to calculate user's ticket count based on staked amount
export const calculateTicketCount = (stakedAmount: number, ticketAmount: number): number => {
  return Math.floor(stakedAmount / ticketAmount);
};

// Helper function to check if user has completed all required social media steps
export const checkSocialMediaCompletion = (steps: SocialMediaStep[]): boolean => {
  return steps.filter(step => step.required).every(step => step.completed);
}; 