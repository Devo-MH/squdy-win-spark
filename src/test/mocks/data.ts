import type { Campaign, UserParticipation, Prize, SocialMediaStep, Winner } from '@/types';

// Mock data factories for testing

export const mockPrize = (index: number = 0): Prize => ({
  id: `prize-${index}`,
  name: `Prize ${index + 1}`,
  description: `Description for prize ${index + 1}`,
  value: (index + 1) * 1000,
  currency: index % 3 === 0 ? 'USD' : index % 3 === 1 ? 'SQUDY' : 'NFT',
  quantity: 1,
  image: `https://example.com/prize-${index}.jpg`,
});

export const mockSocialMediaStep = (type: SocialMediaStep['type'], index: number = 0): SocialMediaStep => ({
  id: `social-${type}-${index}`,
  type,
  title: `${type.replace('_', ' ').toUpperCase()} Task`,
  description: `Complete the ${type} task to earn a lottery ticket`,
  link: `https://example.com/${type}`,
  required: true,
  completed: false,
});

export const mockWinners = (campaignId: number): Winner[] => {
  if (campaignId % 4 !== 0) return []; // Only finished campaigns have winners
  
  return [
    {
      id: `winner-${campaignId}-1`,
      walletAddress: '0x1111111111111111111111111111111111111111',
      prize: mockPrize(0),
      selectedAt: new Date().toISOString(),
      transactionHash: '0xabc123def456abc123def456abc123def456abc1',
    },
    {
      id: `winner-${campaignId}-2`,
      walletAddress: '0x2222222222222222222222222222222222222222',
      prize: mockPrize(1),
      selectedAt: new Date().toISOString(),
      transactionHash: '0xabc123def456abc123def456abc123def456abc2',
    },
    {
      id: `winner-${campaignId}-3`,
      walletAddress: '0x3333333333333333333333333333333333333333',
      prize: mockPrize(2),
      selectedAt: new Date().toISOString(),
      transactionHash: '0xabc123def456abc123def456abc123def456abc3',
    },
  ];
};

export const mockCampaign = (id: number = 1): Campaign => {
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Started yesterday
  const endDate = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000); // Ends in 6 days
  
  return {
    id: id.toString(),
    name: `Test Campaign ${id}`,
    description: `This is a test campaign ${id} for the Squdy Burn-to-Win platform. Stake your SQUDY tokens and complete social media tasks to earn lottery tickets!`,
    image: `https://images.unsplash.com/photo-164034043485${id % 10}-6084b1f4901c?w=800&h=400&fit=crop`,
    status: id % 4 === 0 ? 'finished' : id % 4 === 1 ? 'paused' : 'active',
    softCap: 1000 * id,
    hardCap: 10000 * id,
    currentAmount: 5000 * id,
    ticketAmount: 100,
    participants: 25 * id,
    prizes: Array.from({ length: 3 }, (_, i) => mockPrize(i)),
    socialMediaSteps: [
      mockSocialMediaStep('follow_x'),
      mockSocialMediaStep('like_tweet'),
      mockSocialMediaStep('retweet'),
      mockSocialMediaStep('join_discord'),
      mockSocialMediaStep('join_telegram'),
      mockSocialMediaStep('subscribe_email'),
      mockSocialMediaStep('follow_medium'),
    ],
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    duration: 7,
    createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now.toISOString(),
    createdBy: '0x1234567890123456789012345678901234567890',
    contractAddress: '0x0987654321098765432109876543210987654321',
    winners: id % 4 === 0 ? mockWinners(id) : undefined,
    totalBurned: id % 4 === 0 ? 100000 * id : undefined,
    winnerSelectionTx: id % 4 === 0 ? '0xabcdef1234567890abcdef1234567890abcdef12' : undefined,
    bscScanUrl: `https://sepolia.etherscan.io/tx/0xabcdef1234567890abcdef1234567890abcdef${id.toString().padStart(2, '0')}`,
  };
};

export const mockCampaigns: Campaign[] = Array.from({ length: 8 }, (_, i) => mockCampaign(i + 1));

export const mockUserParticipation = (campaignId: number = 1): UserParticipation => ({
  id: `participation-${campaignId}`,
  userId: 'user-1',
  campaignId: campaignId.toString(),
  walletAddress: '0x1234567890123456789012345678901234567890',
  stakedAmount: 500,
  ticketCount: 5,
  socialMediaSteps: [
    { ...mockSocialMediaStep('follow_x'), completed: true, completedAt: new Date().toISOString() },
    { ...mockSocialMediaStep('like_tweet'), completed: true, completedAt: new Date().toISOString() },
    { ...mockSocialMediaStep('retweet'), completed: false },
    { ...mockSocialMediaStep('join_discord'), completed: true, completedAt: new Date().toISOString() },
    { ...mockSocialMediaStep('join_telegram'), completed: false },
    { ...mockSocialMediaStep('subscribe_email'), completed: true, completedAt: new Date().toISOString() },
    { ...mockSocialMediaStep('follow_medium'), completed: false },
  ],
  allStepsCompleted: false,
  joinedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  isWinner: campaignId === 1,
  prize: campaignId === 1 ? mockPrize(0) : undefined,
});

export const mockUserStats = () => ({
  totalStaked: 2500,
  totalWon: 1000,
  campaignsParticipated: 3,
  winRate: 33.33,
});

export const mockParticipants = (campaignId: number) => {
  return Array.from({ length: 25 }, (_, i) => ({
    walletAddress: `0x${(i + 1).toString(16).padStart(40, '0')}`,
    stakedAmount: (i + 1) * 100,
    ticketCount: i + 1,
    joinedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    allTasksCompleted: i % 3 === 0,
  }));
};

// Mock blockchain data
export const mockTokenBalance = '1500.0';
export const mockTokenAllowance = '0.0';

// Mock transaction responses
export const mockTransactionResponse = {
  hash: '0x1234567890abcdef1234567890abcdef12345678',
  wait: async () => ({
    status: 1,
    blockNumber: 12345678,
    gasUsed: '21000',
    effectiveGasPrice: '20000000000',
  }),
};

// Mock contract campaign data
export const mockContractCampaign = [
  'Test Campaign',
  'Campaign description',
  '1000000000000000000000', // softCap (1000 tokens)
  '10000000000000000000000', // hardCap (10000 tokens)
  '100000000000000000000', // ticketAmount (100 tokens)
  '5000000000000000000000', // currentAmount (5000 tokens)
  true, // isActive
  Math.floor(Date.now() / 1000) - 86400, // startTime (yesterday)
  Math.floor(Date.now() / 1000) + 6 * 86400, // endTime (in 6 days)
];

// Error scenarios for testing
export const mockApiError = {
  error: 'Something went wrong',
  message: 'An unexpected error occurred',
  status: 500,
};

export const mockValidationError = {
  error: 'Validation failed',
  message: 'Please check your input',
  status: 400,
  details: {
    amount: 'Amount must be greater than 0',
    walletAddress: 'Invalid wallet address format',
  },
};

export const mockNotFoundError = {
  error: 'Not found',
  message: 'The requested resource was not found',
  status: 404,
};

// Factory functions for dynamic data generation
export const createMockCampaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  ...mockCampaign(),
  ...overrides,
});

export const createMockUserParticipation = (overrides: Partial<UserParticipation> = {}): UserParticipation => ({
  ...mockUserParticipation(),
  ...overrides,
});

export const createMockPrize = (overrides: Partial<Prize> = {}): Prize => ({
  ...mockPrize(),
  ...overrides,
});

// Utility functions for test data generation
export const generateRandomWallet = () => 
  `0x${Math.random().toString(16).substr(2, 40).padStart(40, '0')}`;

export const generateRandomAmount = (min: number = 100, max: number = 10000) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

export const generateRandomDate = (daysAgo: number = 30) => 
  new Date(Date.now() - Math.random() * daysAgo * 24 * 60 * 60 * 1000).toISOString();