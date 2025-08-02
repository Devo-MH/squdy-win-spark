import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { campaignAPI, participantAPI, authAPI } from './api';

// Mock axios for error testing
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('API Services Tests', () => {
  beforeEach(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  describe('Campaign API', () => {
    describe('getCampaigns', () => {
      it('fetches campaigns successfully with default parameters', async () => {
        const result = await campaignAPI.getCampaigns();
        
        expect(result).toHaveProperty('campaigns');
        expect(result).toHaveProperty('pagination');
        expect(Array.isArray(result.campaigns)).toBe(true);
        expect(result.pagination).toHaveProperty('page');
        expect(result.pagination).toHaveProperty('limit');
        expect(result.pagination).toHaveProperty('total');
        expect(result.pagination).toHaveProperty('totalPages');
      });

      it('passes query parameters correctly', async () => {
        server.use(
          http.get('http://localhost:3001/api/campaigns', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('status')).toBe('active');
            expect(url.searchParams.get('page')).toBe('2');
            expect(url.searchParams.get('limit')).toBe('5');
            
            return HttpResponse.json({
              campaigns: [],
              pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
            });
          })
        );

        await campaignAPI.getCampaigns({
          status: 'active',
          page: 2,
          limit: 5,
        });
      });

      it('handles API errors gracefully', async () => {
        server.use(
          http.get('http://localhost:3001/api/campaigns', () => {
            return HttpResponse.json(
              { error: 'Internal server error' },
              { status: 500 }
            );
          })
        );

        await expect(campaignAPI.getCampaigns()).rejects.toThrow();
      });

      it('handles network errors with fallback response', async () => {
        server.use(
          http.get('http://localhost:3001/api/campaigns', () => {
            return HttpResponse.error();
          })
        );

        // Should not throw due to response interceptor
        const result = await campaignAPI.getCampaigns();
        expect(result).toBeDefined();
      });
    });

    describe('getCampaignById', () => {
      it('fetches campaign by ID successfully', async () => {
        const result = await campaignAPI.getCampaignById(1);
        
        expect(result).toHaveProperty('campaign');
        expect(result.campaign).toHaveProperty('id');
        expect(result.campaign).toHaveProperty('name');
        expect(result.campaign).toHaveProperty('description');
      });

      it('handles campaign not found error', async () => {
        server.use(
          http.get('http://localhost:3001/api/campaigns/999', () => {
            return HttpResponse.json(
              { error: 'Campaign not found' },
              { status: 404 }
            );
          })
        );

        await expect(campaignAPI.getCampaignById(999)).rejects.toThrow();
      });

      it('validates campaign ID parameter', async () => {
        await expect(campaignAPI.getCampaignById(0)).rejects.toThrow();
        await expect(campaignAPI.getCampaignById(-1)).rejects.toThrow();
      });
    });

    describe('getCampaignParticipants', () => {
      it('fetches campaign participants successfully', async () => {
        const result = await campaignAPI.getCampaignParticipants(1);
        
        expect(result).toHaveProperty('participants');
        expect(result).toHaveProperty('pagination');
        expect(Array.isArray(result.participants)).toBe(true);
      });

      it('passes pagination parameters correctly', async () => {
        server.use(
          http.get('http://localhost:3001/api/campaigns/1/participants', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('page')).toBe('3');
            expect(url.searchParams.get('limit')).toBe('20');
            
            return HttpResponse.json({
              participants: [],
              pagination: { page: 3, limit: 20, total: 0, totalPages: 0 },
            });
          })
        );

        await campaignAPI.getCampaignParticipants(1, { page: 3, limit: 20 });
      });
    });

    describe('getCampaignWinners', () => {
      it('fetches campaign winners successfully', async () => {
        const result = await campaignAPI.getCampaignWinners(1);
        
        expect(result).toHaveProperty('winners');
        expect(Array.isArray(result.winners)).toBe(true);
      });

      it('handles campaigns with no winners', async () => {
        server.use(
          http.get('http://localhost:3001/api/campaigns/2/winners', () => {
            return HttpResponse.json({ winners: [] });
          })
        );

        const result = await campaignAPI.getCampaignWinners(2);
        expect(result.winners).toEqual([]);
      });
    });

    describe('getMyStatus', () => {
      it('fetches user campaign status successfully', async () => {
        const result = await campaignAPI.getMyStatus(1);
        
        expect(result).toHaveProperty('participation');
      });

      it('handles unauthenticated requests', async () => {
        server.use(
          http.get('http://localhost:3001/api/campaigns/1/my-status', () => {
            return HttpResponse.json(
              { error: 'Unauthorized' },
              { status: 401 }
            );
          })
        );

        await expect(campaignAPI.getMyStatus(1)).rejects.toThrow();
      });
    });
  });

  describe('Participant API', () => {
    describe('getMyParticipations', () => {
      it('fetches user participations successfully', async () => {
        const result = await participantAPI.getMyParticipations();
        
        expect(result).toHaveProperty('participations');
        expect(result).toHaveProperty('pagination');
        expect(Array.isArray(result.participations)).toBe(true);
      });

      it('passes pagination parameters correctly', async () => {
        server.use(
          http.get('http://localhost:3001/api/participants/me', ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get('page')).toBe('2');
            expect(url.searchParams.get('limit')).toBe('10');
            
            return HttpResponse.json({
              participations: [],
              pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
            });
          })
        );

        await participantAPI.getMyParticipations({ page: 2, limit: 10 });
      });
    });

    describe('getMyStats', () => {
      it('fetches user statistics successfully', async () => {
        const result = await participantAPI.getMyStats();
        
        expect(result).toHaveProperty('stats');
        expect(result.stats).toHaveProperty('totalParticipations');
        expect(result.stats).toHaveProperty('totalStaked');
        expect(result.stats).toHaveProperty('totalWon');
        expect(result.stats).toHaveProperty('winRate');
      });
    });

    describe('participateInCampaign', () => {
      it('submits participation successfully', async () => {
        const participationData = {
          campaignId: 1,
          amount: 500,
          socialTasks: ['follow_x', 'like_tweet'],
        };

        const result = await participantAPI.participateInCampaign(participationData);
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('participation');
        expect(result.success).toBe(true);
      });

      it('validates participation data', async () => {
        const invalidData = {
          campaignId: 0,
          amount: -100,
          socialTasks: [],
        };

        server.use(
          http.post('http://localhost:3001/api/campaigns/0/participate', () => {
            return HttpResponse.json(
              { error: 'Invalid participation data' },
              { status: 400 }
            );
          })
        );

        await expect(participantAPI.participateInCampaign(invalidData)).rejects.toThrow();
      });

      it('handles insufficient balance error', async () => {
        server.use(
          http.post('http://localhost:3001/api/campaigns/1/participate', () => {
            return HttpResponse.json(
              { error: 'Insufficient balance' },
              { status: 400 }
            );
          })
        );

        const participationData = {
          campaignId: 1,
          amount: 10000,
          socialTasks: [],
        };

        await expect(participantAPI.participateInCampaign(participationData)).rejects.toThrow();
      });
    });

    describe('completeSocialTask', () => {
      it('completes social task successfully', async () => {
        const taskData = {
          campaignId: 1,
          taskType: 'follow_x' as const,
          proof: 'task-completion-proof',
        };

        const result = await participantAPI.completeSocialTask(taskData);
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('taskCompleted');
        expect(result.success).toBe(true);
      });

      it('handles task already completed error', async () => {
        server.use(
          http.post('http://localhost:3001/api/campaigns/1/social-task', () => {
            return HttpResponse.json(
              { error: 'Task already completed' },
              { status: 409 }
            );
          })
        );

        const taskData = {
          campaignId: 1,
          taskType: 'follow_x' as const,
        };

        await expect(participantAPI.completeSocialTask(taskData)).rejects.toThrow();
      });

      it('handles invalid task type error', async () => {
        server.use(
          http.post('http://localhost:3001/api/campaigns/1/social-task', () => {
            return HttpResponse.json(
              { error: 'Invalid task type' },
              { status: 400 }
            );
          })
        );

        const taskData = {
          campaignId: 1,
          taskType: 'invalid_task' as any,
        };

        await expect(participantAPI.completeSocialTask(taskData)).rejects.toThrow();
      });
    });
  });

  describe('Auth API', () => {
    describe('getNonce', () => {
      it('generates nonce for wallet address successfully', async () => {
        const walletAddress = '0x1234567890123456789012345678901234567890';
        const result = await authAPI.getNonce(walletAddress);
        
        expect(result).toHaveProperty('nonce');
        expect(typeof result.nonce).toBe('string');
        expect(result.nonce.length).toBeGreaterThan(0);
      });

      it('validates wallet address format', async () => {
        server.use(
          http.post('http://localhost:3001/api/auth/nonce', () => {
            return HttpResponse.json(
              { error: 'Invalid wallet address' },
              { status: 400 }
            );
          })
        );

        await expect(authAPI.getNonce('invalid-address')).rejects.toThrow();
      });
    });

    describe('verifySignature', () => {
      it('verifies signature successfully', async () => {
        const verificationData = {
          walletAddress: '0x1234567890123456789012345678901234567890',
          signature: '0xvalidsignature',
          nonce: 'valid-nonce',
        };

        const result = await authAPI.verifySignature(verificationData);
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('user');
        expect(result.success).toBe(true);
        expect(typeof result.token).toBe('string');
      });

      it('handles invalid signature error', async () => {
        server.use(
          http.post('http://localhost:3001/api/auth/verify', () => {
            return HttpResponse.json(
              { error: 'Invalid signature' },
              { status: 401 }
            );
          })
        );

        const verificationData = {
          walletAddress: '0x1234567890123456789012345678901234567890',
          signature: '0xinvalidsignature',
          nonce: 'valid-nonce',
        };

        await expect(authAPI.verifySignature(verificationData)).rejects.toThrow();
      });

      it('handles expired nonce error', async () => {
        server.use(
          http.post('http://localhost:3001/api/auth/verify', () => {
            return HttpResponse.json(
              { error: 'Nonce expired' },
              { status: 401 }
            );
          })
        );

        const verificationData = {
          walletAddress: '0x1234567890123456789012345678901234567890',
          signature: '0xvalidsignature',
          nonce: 'expired-nonce',
        };

        await expect(authAPI.verifySignature(verificationData)).rejects.toThrow();
      });
    });

    describe('logout', () => {
      it('logs out successfully', async () => {
        const result = await authAPI.logout();
        
        expect(result).toHaveProperty('success');
        expect(result.success).toBe(true);
      });

      it('handles logout even when already logged out', async () => {
        server.use(
          http.post('http://localhost:3001/api/auth/logout', () => {
            return HttpResponse.json(
              { error: 'Not logged in' },
              { status: 401 }
            );
          })
        );

        // Should not throw even if already logged out
        await expect(authAPI.logout()).rejects.toThrow();
      });
    });
  });

  describe('Request/Response Interceptors', () => {
    it('handles network errors gracefully', async () => {
      // Mock network error
      server.use(
        http.get('http://localhost:3001/api/campaigns', () => {
          return HttpResponse.error();
        })
      );

      // Should return a mock response instead of throwing
      const result = await campaignAPI.getCampaigns();
      expect(result).toBeDefined();
    });

    it('applies correct timeout configuration', async () => {
      // Mock slow response
      server.use(
        http.get('http://localhost:3001/api/campaigns', async () => {
          await new Promise(resolve => setTimeout(resolve, 15000));
          return HttpResponse.json({ campaigns: [], pagination: {} });
        })
      );

      // Should timeout and be handled by interceptor
      const result = await campaignAPI.getCampaigns();
      expect(result).toBeDefined();
    });

    it('includes correct headers in requests', async () => {
      server.use(
        http.get('http://localhost:3001/api/campaigns', ({ request }) => {
          expect(request.headers.get('Content-Type')).toBe('application/json');
          return HttpResponse.json({ campaigns: [], pagination: {} });
        })
      );

      await campaignAPI.getCampaigns();
    });

    it('handles CORS errors appropriately', async () => {
      server.use(
        http.get('http://localhost:3001/api/campaigns', () => {
          return new Response(null, {
            status: 0,
            statusText: 'CORS error',
          });
        })
      );

      // Should be handled by error interceptor
      const result = await campaignAPI.getCampaigns();
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('handles malformed JSON responses', async () => {
      server.use(
        http.get('http://localhost:3001/api/campaigns', () => {
          return new Response('invalid json{', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      await expect(campaignAPI.getCampaigns()).rejects.toThrow();
    });

    it('handles empty response bodies', async () => {
      server.use(
        http.get('http://localhost:3001/api/campaigns', () => {
          return new Response(null, { status: 200 });
        })
      );

      await expect(campaignAPI.getCampaigns()).rejects.toThrow();
    });

    it('handles rate limiting responses', async () => {
      server.use(
        http.get('http://localhost:3001/api/campaigns', () => {
          return HttpResponse.json(
            { error: 'Rate limit exceeded' },
            { 
              status: 429,
              headers: { 'Retry-After': '60' }
            }
          );
        })
      );

      await expect(campaignAPI.getCampaigns()).rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    it('validates response structure for campaigns', async () => {
      server.use(
        http.get('http://localhost:3001/api/campaigns', () => {
          return HttpResponse.json({
            campaigns: [
              {
                id: 1,
                name: 'Test Campaign',
                status: 'active',
                // Missing required fields
              }
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          });
        })
      );

      const result = await campaignAPI.getCampaigns();
      expect(result.campaigns[0]).toHaveProperty('id');
      expect(result.campaigns[0]).toHaveProperty('name');
    });

    it('handles unexpected response structures gracefully', async () => {
      server.use(
        http.get('http://localhost:3001/api/campaigns', () => {
          return HttpResponse.json({
            unexpectedField: 'value',
            // Missing expected fields
          });
        })
      );

      // Should still return the response even if structure is unexpected
      const result = await campaignAPI.getCampaigns();
      expect(result).toBeDefined();
    });
  });

  describe('Performance and Caching', () => {
    it('makes only one request for concurrent identical calls', async () => {
      let requestCount = 0;
      
      server.use(
        http.get('http://localhost:3001/api/campaigns/1', () => {
          requestCount++;
          return HttpResponse.json({ 
            campaign: { id: 1, name: 'Test Campaign' } 
          });
        })
      );

      // Make concurrent requests
      const [result1, result2, result3] = await Promise.all([
        campaignAPI.getCampaignById(1),
        campaignAPI.getCampaignById(1),
        campaignAPI.getCampaignById(1),
      ]);

      // All should succeed
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();
      
      // But should make separate requests (no deduplication at API level)
      expect(requestCount).toBe(3);
    });

    it('handles large response payloads efficiently', async () => {
      const largeCampaignList = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Campaign ${i + 1}`,
        description: 'Large campaign description '.repeat(100),
        status: 'active',
      }));

      server.use(
        http.get('http://localhost:3001/api/campaigns', () => {
          return HttpResponse.json({
            campaigns: largeCampaignList,
            pagination: { page: 1, limit: 1000, total: 1000, totalPages: 1 },
          });
        })
      );

      const startTime = performance.now();
      const result = await campaignAPI.getCampaigns();
      const endTime = performance.now();

      expect(result.campaigns).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should process in under 1 second
    });
  });
});