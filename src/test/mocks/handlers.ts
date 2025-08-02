import { http, HttpResponse } from 'msw';
import { 
  mockCampaigns, 
  mockCampaign, 
  mockUserParticipation, 
  mockUserStats,
  mockParticipants,
  mockWinners 
} from './data';

const API_BASE_URL = 'http://localhost:3001/api';

export const handlers = [
  // Campaign endpoints
  http.get(`${API_BASE_URL}/campaigns`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let filteredCampaigns = mockCampaigns;
    
    if (status) {
      filteredCampaigns = mockCampaigns.filter(campaign => campaign.status === status);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);

    return HttpResponse.json({
      campaigns: paginatedCampaigns,
      pagination: {
        page,
        limit,
        total: filteredCampaigns.length,
        totalPages: Math.ceil(filteredCampaigns.length / limit),
      },
    });
  }),

  http.get(`${API_BASE_URL}/campaigns/:id`, ({ params }) => {
    const id = parseInt(params.id as string);
    const campaign = mockCampaigns.find(c => c.id === id || c.contractId === id);
    
    if (!campaign) {
      return HttpResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      campaign: mockCampaign(id),
    });
  }),

  http.get(`${API_BASE_URL}/campaigns/:id/participants`, ({ params, request }) => {
    const id = parseInt(params.id as string);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const participants = mockParticipants(id);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedParticipants = participants.slice(startIndex, endIndex);

    return HttpResponse.json({
      participants: paginatedParticipants,
      pagination: {
        page,
        limit,
        total: participants.length,
        totalPages: Math.ceil(participants.length / limit),
      },
    });
  }),

  http.get(`${API_BASE_URL}/campaigns/:id/winners`, ({ params }) => {
    const id = parseInt(params.id as string);
    
    return HttpResponse.json({
      winners: mockWinners(id),
    });
  }),

  http.get(`${API_BASE_URL}/campaigns/:id/my-status`, ({ params }) => {
    const id = parseInt(params.id as string);
    
    return HttpResponse.json({
      participation: mockUserParticipation(id),
    });
  }),

  // Participant endpoints
  http.get(`${API_BASE_URL}/participants/me`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const participations = [mockUserParticipation(1), mockUserParticipation(2)];
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedParticipations = participations.slice(startIndex, endIndex);

    return HttpResponse.json({
      participations: paginatedParticipations,
      pagination: {
        page,
        limit,
        total: participations.length,
        totalPages: Math.ceil(participations.length / limit),
      },
    });
  }),

  http.get(`${API_BASE_URL}/participants/me/stats`, () => {
    return HttpResponse.json({
      stats: mockUserStats(),
    });
  }),

  // Participation actions
  http.post(`${API_BASE_URL}/campaigns/:id/participate`, async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const body = await request.json() as any;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return HttpResponse.json({
      success: true,
      participation: {
        ...mockUserParticipation(id),
        stakedAmount: body.amount,
        ticketCount: Math.floor(body.amount / 100),
      },
    });
  }),

  http.post(`${API_BASE_URL}/campaigns/:id/social-task`, async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const body = await request.json() as any;
    
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return HttpResponse.json({
      success: true,
      taskCompleted: true,
      taskType: body.taskType,
    });
  }),

  // Admin endpoints
  http.get(`${API_BASE_URL}/admin/campaigns`, () => {
    return HttpResponse.json({
      campaigns: mockCampaigns,
    });
  }),

  http.post(`${API_BASE_URL}/admin/campaigns`, async ({ request }) => {
    const body = await request.json() as any;
    
    // Simulate campaign creation delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newCampaign = {
      id: mockCampaigns.length + 1,
      contractId: mockCampaigns.length + 1,
      ...body,
      status: 'draft' as const,
      currentAmount: 0,
      participantCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      success: true,
      campaign: newCampaign,
    });
  }),

  http.put(`${API_BASE_URL}/admin/campaigns/:id`, async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const body = await request.json() as any;
    
    // Simulate update delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const updatedCampaign = {
      ...mockCampaign(id),
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      success: true,
      campaign: updatedCampaign,
    });
  }),

  http.post(`${API_BASE_URL}/admin/campaigns/:id/pause`, async ({ params }) => {
    const id = parseInt(params.id as string);
    
    await new Promise(resolve => setTimeout(resolve, 400));

    return HttpResponse.json({
      success: true,
      campaign: {
        ...mockCampaign(id),
        status: 'paused',
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  http.post(`${API_BASE_URL}/admin/campaigns/:id/resume`, async ({ params }) => {
    const id = parseInt(params.id as string);
    
    await new Promise(resolve => setTimeout(resolve, 400));

    return HttpResponse.json({
      success: true,
      campaign: {
        ...mockCampaign(id),
        status: 'active',
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  http.post(`${API_BASE_URL}/admin/campaigns/:id/select-winners`, async ({ params }) => {
    const id = parseInt(params.id as string);
    
    // Simulate winner selection delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return HttpResponse.json({
      success: true,
      winners: mockWinners(id),
      transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
    });
  }),

  // Auth endpoints
  http.post(`${API_BASE_URL}/auth/nonce`, ({ request }) => {
    return HttpResponse.json({
      nonce: Math.random().toString(36).substring(2, 15),
    });
  }),

  http.post(`${API_BASE_URL}/auth/verify`, async ({ request }) => {
    const body = await request.json() as any;
    
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return HttpResponse.json({
      success: true,
      token: 'mock-jwt-token',
      user: {
        walletAddress: body.walletAddress,
        isAdmin: body.walletAddress === '0x1234567890123456789012345678901234567890',
      },
    });
  }),

  // Error simulation handlers for testing error states
  http.get(`${API_BASE_URL}/campaigns/error-test`, () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),

  http.get(`${API_BASE_URL}/campaigns/timeout-test`, async () => {
    // Simulate timeout
    await new Promise(resolve => setTimeout(resolve, 15000));
    return HttpResponse.json({ data: 'This should timeout' });
  }),

  http.get(`${API_BASE_URL}/campaigns/network-error`, () => {
    // Simulate network error
    return HttpResponse.error();
  }),
];