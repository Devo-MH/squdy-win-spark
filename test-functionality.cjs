#!/usr/bin/env node

/**
 * Comprehensive Functional Test Suite
 * Tests the complete winner selection and token burning workflow
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
};

// Test utilities
function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    TEST_RESULTS.passed++;
    TEST_RESULTS.tests.push({ status: 'PASS', message });
  } else {
    console.log(`❌ ${message}`);
    TEST_RESULTS.failed++;
    TEST_RESULTS.tests.push({ status: 'FAIL', message });
  }
}

function assertEquals(actual, expected, message) {
  assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API helper functions
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
}

// Test functions
async function testServerHealth() {
  console.log('\n🏥 Testing Server Health...');
  
  const result = await apiCall('GET', '/health');
  assert(result.success, 'Server health check');
  assertEquals(result.status, 200, 'Health endpoint returns 200');
}

async function testGetCampaigns() {
  console.log('\n📋 Testing Campaign Retrieval...');
  
  const result = await apiCall('GET', '/api/campaigns');
  assert(result.success, 'Get campaigns endpoint');
  assert(result.data.campaigns, 'Response contains campaigns array');
  assert(Array.isArray(result.data.campaigns), 'Campaigns is an array');
  
  return result.data.campaigns;
}

async function testCreateCampaign() {
  console.log('\n🎯 Testing Campaign Creation...');
  
  const campaignData = {
    name: `Test Campaign ${Date.now()}`,
    description: 'Automated test campaign for winner selection and token burning',
    imageUrl: 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop',
    softCap: 5000,
    hardCap: 50000,
    ticketAmount: 100,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    prizes: [
      { name: 'First Prize', description: 'Winner takes all', value: '10000', currency: 'USD', quantity: 1 },
      { name: 'Second Prize', description: 'Runner up', value: '5000', currency: 'USD', quantity: 1 }
    ]
  };
  
  const result = await apiCall('POST', '/api/admin/campaigns', campaignData);
  assert(result.success, 'Create campaign endpoint');
  assert(result.data.campaign, 'Response contains campaign data');
  assert(result.data.campaign.id, 'Campaign has ID');
  
  return result.data.campaign;
}

async function testCloseCampaign(campaignId) {
  console.log('\n🔒 Testing Campaign Closure...');
  
  const result = await apiCall('POST', `/api/admin/campaigns/${campaignId}/close`);
  assert(result.success, 'Close campaign endpoint');
  assert(result.data.campaign, 'Response contains updated campaign');
  assertEquals(result.data.campaign.status, 'finished', 'Campaign status is finished');
  
  return result.data.campaign;
}

async function testSelectWinners(campaignId) {
  console.log('\n🏆 Testing Winner Selection...');
  
  const result = await apiCall('POST', `/api/admin/campaigns/${campaignId}/select-winners`);
  assert(result.success, 'Select winners endpoint');
  assert(result.data.campaign, 'Response contains updated campaign');
  assertEquals(result.data.campaign.status, 'winners_selected', 'Campaign status is winners_selected');
  assert(result.data.campaign.winners, 'Campaign has winners array');
  assert(Array.isArray(result.data.campaign.winners), 'Winners is an array');
  
  console.log(`   🎉 Winners selected: ${result.data.campaign.winners.length}`);
  result.data.campaign.winners.forEach((winner, index) => {
    console.log(`   ${index + 1}. ${winner.walletAddress} - ${winner.prizeName}`);
  });
  
  return result.data.campaign;
}

async function testBurnTokens(campaignId) {
  console.log('\n🔥 Testing Token Burning...');
  
  const result = await apiCall('POST', `/api/admin/campaigns/${campaignId}/burn-tokens`);
  assert(result.success, 'Burn tokens endpoint');
  assert(result.data.campaign, 'Response contains updated campaign');
  assertEquals(result.data.campaign.status, 'burned', 'Campaign status is burned');
  
  console.log(`   🔥 Tokens burned successfully for campaign ${campaignId}`);
  
  return result.data.campaign;
}

async function testCompleteWorkflow() {
  console.log('\n🔄 Testing Complete Winner Selection & Token Burning Workflow...');
  
  try {
    // Step 1: Create a test campaign
    const campaign = await testCreateCampaign();
    const campaignId = campaign.contractId || campaign.id;
    
    console.log(`\n📝 Created test campaign with ID: ${campaignId}`);
    
    // Step 2: Close the campaign to make it eligible for winner selection
    const closedCampaign = await testCloseCampaign(campaignId);
    console.log(`✅ Campaign closed, status: ${closedCampaign.status}`);
    
    // Step 3: Select winners
    const campaignWithWinners = await testSelectWinners(campaignId);
    console.log(`✅ Winners selected, status: ${campaignWithWinners.status}`);
    
    // Step 4: Burn remaining tokens
    const finalCampaign = await testBurnTokens(campaignId);
    console.log(`✅ Tokens burned, final status: ${finalCampaign.status}`);
    
    // Step 5: Verify the complete state transition
    console.log('\n🔍 Verifying State Transitions...');
    assertEquals(finalCampaign.status, 'burned', 'Final campaign status is burned');
    assert(finalCampaign.winners && finalCampaign.winners.length > 0, 'Campaign has winners');
    
    console.log('\n🎉 Complete workflow test PASSED!');
    return true;
    
  } catch (error) {
    console.log(`\n❌ Complete workflow test FAILED: ${error.message}`);
    return false;
  }
}

async function testEdgeCases() {
  console.log('\n🧪 Testing Edge Cases...');
  
  // Test 1: Try to select winners on non-existent campaign
  console.log('\n1. Testing invalid campaign ID...');
  const invalidResult = await apiCall('POST', '/api/admin/campaigns/99999/select-winners');
  assert(!invalidResult.success, 'Invalid campaign ID should fail');
  assertEquals(invalidResult.status, 404, 'Should return 404 for invalid campaign');
  
  // Test 2: Try to burn tokens before selecting winners
  console.log('\n2. Testing premature token burning...');
  const campaigns = await testGetCampaigns();
  if (campaigns.length > 0) {
    const activeCampaign = campaigns.find(c => c.status === 'active' || c.status === 'finished');
    if (activeCampaign) {
      const burnResult = await apiCall('POST', `/api/admin/campaigns/${activeCampaign.contractId || activeCampaign.id}/burn-tokens`);
      // This should either fail or be handled gracefully
      console.log(`   Burn attempt on ${activeCampaign.status} campaign: ${burnResult.success ? 'Success' : 'Failed as expected'}`);
    }
  }
}

async function testPerformanceMetrics() {
  console.log('\n⚡ Testing Performance Metrics...');
  
  const campaigns = await testGetCampaigns();
  if (campaigns.length === 0) {
    console.log('   No campaigns available for performance testing');
    return;
  }
  
  // Test API response times
  const startTime = Date.now();
  await apiCall('GET', '/api/campaigns');
  const responseTime = Date.now() - startTime;
  
  assert(responseTime < 1000, `API response time under 1 second (${responseTime}ms)`);
  console.log(`   📊 Campaign list API response time: ${responseTime}ms`);
}

// Main test runner
async function runAllTests() {
  console.log('🧪 SQUDY Winner Selection & Token Burning Functional Tests');
  console.log('========================================================\n');
  
  try {
    // Wait for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    await sleep(3000);
    
    // Basic functionality tests
    await testServerHealth();
    await testGetCampaigns();
    await testPerformanceMetrics();
    
    // Edge case tests
    await testEdgeCases();
    
    // Complete workflow test (main test)
    const workflowSuccess = await testCompleteWorkflow();
    
    // Final results
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('======================');
    console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
    console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
    console.log(`📋 Total: ${TEST_RESULTS.passed + TEST_RESULTS.failed}`);
    
    if (TEST_RESULTS.failed === 0 && workflowSuccess) {
      console.log('\n🎉 ALL TESTS PASSED! Winner selection and token burning functionality is working correctly.');
      console.log('\n✅ Key Validations Completed:');
      console.log('   • API endpoints responding correctly');
      console.log('   • Campaign state transitions working');
      console.log('   • Winner selection logic functional');
      console.log('   • Token burning process operational');
      console.log('   • Error handling working for edge cases');
      console.log('\n🚀 The system is ready for real blockchain integration!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed. Please review the results above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n💥 Test suite failed with error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testCompleteWorkflow,
  testSelectWinners,
  testBurnTokens
};