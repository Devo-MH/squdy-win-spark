/*
 Simple local API tester
 Usage: node testCampaignAPI.js
 Requires: axios (npm i axios)
 Targets local server: http://localhost:3001
*/

async function getAxios() {
  try {
    if (typeof require !== 'undefined') {
      // CommonJS environment
      // eslint-disable-next-line global-require
      return require('axios');
    }
  } catch (_) {
    // fallthrough to ESM dynamic import
  }
  const mod = await import('axios');
  return mod.default || mod;
}

(async () => {
  const axios = await getAxios();

  const BASE_URL = 'http://localhost:3001/api';

  const samplePayload = {
    name: `Test Campaign ${Date.now()}`,
    description: 'This is a test campaign created by testCampaignAPI.js',
    imageUrl: 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop',
    softCap: 5000,
    hardCap: 50000,
    ticketAmount: 100,
    startDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1h
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7d
    prizes: [
      { name: 'First Prize', description: 'Winner takes all', value: '10000', currency: 'USD', quantity: 1 },
      { name: 'Second Prize', description: 'Runner up', value: '5000', currency: 'USD', quantity: 1 },
    ],
  };

  const log = (label, data) => {
    console.log(`\n=== ${label} ===`);
    console.log(JSON.stringify(data, null, 2));
  };

  const logError = (label, err) => {
    if (err && err.response) {
      console.error(`\nxxx ${label} FAILED: status=${err.response.status}`);
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(`\nxxx ${label} FAILED:`);
      console.error(err?.message || String(err));
    }
  };

  try {
    // 1) Create campaign
    const createRes = await axios.post(`${BASE_URL}/campaigns`, samplePayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    log('CREATE RESPONSE', createRes.data);

    const created = createRes?.data?.campaign;
    const createdId = created?._id || created?.id; // prefer Mongo _id
    if (!createdId) {
      console.warn('Could not detect created campaign id. Proceeding to list anyway.');
    }

    // 2) List campaigns
    const listRes = await axios.get(`${BASE_URL}/campaigns`);
    log('LIST RESPONSE', listRes.data);

    // 3) Fetch created campaign by id (using Mongo _id)
    if (createdId) {
      try {
        const byIdRes = await axios.get(`${BASE_URL}/campaigns/${createdId}`);
        log('GET BY ID RESPONSE', byIdRes.data);
      } catch (err) {
        logError(`GET BY ID (${createdId})`, err);
      }
    }
  } catch (err) {
    logError('CREATE/LIST FLOW', err);
  }
})();


