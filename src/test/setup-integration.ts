import { beforeEach, vi } from 'vitest';

// Integration test specific setup
beforeEach(() => {
  // Reset all mocks before each integration test
  vi.clearAllMocks();
  
  // Set longer timeouts for integration tests
  vi.setConfig({ testTimeout: 20000 });
});

// Mock API responses with more realistic delays for integration tests
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    // Add realistic delays to API calls
    campaignAPI: {
      getCampaigns: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        return {
          campaigns: [
            {
              id: 1,
              contractId: 1,
              name: 'Integration Test Campaign',
              description: 'A campaign for integration testing',
              imageUrl: 'https://example.com/image.jpg',
              status: 'active',
              currentAmount: 5000,
              hardCap: 10000,
              softCap: 1000,
              ticketAmount: 100,
              participantCount: 50,
              startDate: new Date().toISOString(),
              endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              prizes: [
                { name: 'First Prize', value: 1000, currency: 'USD' }
              ],
              socialRequirements: {
                twitter: { followAccount: '@test', likePostId: '123', retweetPostId: '123' },
                discord: { serverId: '123', inviteLink: 'https://discord.gg/test' },
                telegram: { groupId: '123', inviteLink: 'https://t.me/test' },
                medium: { profileUrl: 'https://medium.com/test' },
                newsletter: { endpoint: '/newsletter' }
              }
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        };
      }),
      
      getCampaignById: vi.fn().mockImplementation(async (id: number) => {
        await new Promise(resolve => setTimeout(resolve, 80));
        return {
          campaign: {
            id,
            contractId: id,
            name: `Campaign ${id}`,
            description: `Description for campaign ${id}`,
            imageUrl: 'https://example.com/image.jpg',
            status: 'active',
            currentAmount: 5000,
            hardCap: 10000,
            softCap: 1000,
            ticketAmount: 100,
            participantCount: 50,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            prizes: [
              { name: 'First Prize', value: 1000, currency: 'USD' }
            ],
            socialRequirements: {
              twitter: { followAccount: '@test', likePostId: '123', retweetPostId: '123' },
              discord: { serverId: '123', inviteLink: 'https://discord.gg/test' },
              telegram: { groupId: '123', inviteLink: 'https://t.me/test' },
              medium: { profileUrl: 'https://medium.com/test' },
              newsletter: { endpoint: '/newsletter' }
            }
          }
        };
      }),

      getMyStatus: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 60));
        return {
          hasStaked: false,
          stakedAmount: 0,
          ticketCount: 0,
          socialTasksCompleted: {
            twitterFollow: false,
            twitterLike: false,
            twitterRetweet: false,
            discordJoined: false,
            telegramJoined: false,
            mediumFollowed: false,
            newsletterSubscribed: false
          },
          allTasksCompleted: false,
          isEligible: false
        };
      }),
    },

    participantAPI: {
      getMyParticipations: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 120));
        return {
          participations: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
          }
        };
      }),

      getMyStats: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 90));
        return {
          totalParticipations: 0,
          totalStaked: 0,
          totalWon: 0,
          winRate: 0
        };
      }),
    }
  };
});

// Mock Web3 integration with realistic delays
vi.mock('@/services/contracts', async () => {
  const actual = await vi.importActual<typeof import('@/services/contracts')>('@/services/contracts');
  return {
    ...actual,
    useContracts: vi.fn().mockReturnValue({
      getTokenBalance: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return '1000.0';
      }),
      getTokenAllowance: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return '0.0';
      }),
      approveTokens: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Longer for transactions
        return { hash: '0xtxhash' };
      }),
      stakeToCampaign: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return { hash: '0xtxhash' };
      }),
    }),
  };
});

// Integration tests use real React Query with longer timeouts
// No additional mocking needed for React Query in integration tests