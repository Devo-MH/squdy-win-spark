/**
 * Test Deployment Script
 * Deploys contracts to testnet and runs comprehensive functionality tests
 */

const { ethers } = require('hardhat');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  CAMPAIGN_NAME: 'Test Campaign for Blockchain Validation',
  HARD_CAP: ethers.utils.parseUnits('10000', 18), // 10,000 SQUDY
  SOFT_CAP: ethers.utils.parseUnits('5000', 18),  // 5,000 SQUDY
  TICKET_AMOUNT: ethers.utils.parseUnits('100', 18), // 100 SQUDY per ticket
  PARTICIPANT_COUNT: 10,
  STAKE_AMOUNT: ethers.utils.parseUnits('500', 18), // 500 SQUDY per participant
};

async function main() {
  console.log('🚀 Starting comprehensive blockchain test deployment...\n');

  // Get deployment accounts
  const [deployer, ...participants] = await ethers.getSigners();
  console.log(`📋 Deployer: ${deployer.address}`);
  console.log(`👥 Test participants: ${participants.length}\n`);

  // Check deployer balance
  const deployerBalance = await deployer.getBalance();
  console.log(`💰 Deployer balance: ${ethers.utils.formatEther(deployerBalance)} ETH`);
  
  if (deployerBalance.lt(ethers.utils.parseEther('0.1'))) {
    throw new Error('❌ Insufficient ETH for deployment. Need at least 0.1 ETH');
  }

  let deploymentResults = {};

  try {
    // Phase 1: Deploy SQUDY Token
    console.log('📦 Phase 1: Deploying SQUDY Token...');
    const SqudyToken = await ethers.getContractFactory('SqudyToken');
    const squdyToken = await SqudyToken.deploy();
    await squdyToken.deployed();
    
    deploymentResults.squdyToken = {
      address: squdyToken.address,
      txHash: squdyToken.deployTransaction.hash,
    };
    
    console.log(`✅ SQUDY Token deployed to: ${squdyToken.address}`);
    console.log(`   Transaction: ${squdyToken.deployTransaction.hash}\n`);

    // Phase 2: Deploy Campaign Manager
    console.log('📦 Phase 2: Deploying Campaign Manager...');
    const CampaignManager = await ethers.getContractFactory('SqudyCampaignManager');
    const campaignManager = await CampaignManager.deploy(squdyToken.address);
    await campaignManager.deployed();
    
    deploymentResults.campaignManager = {
      address: campaignManager.address,
      txHash: campaignManager.deployTransaction.hash,
    };
    
    console.log(`✅ Campaign Manager deployed to: ${campaignManager.address}`);
    console.log(`   Transaction: ${campaignManager.deployTransaction.hash}\n`);

    // Phase 3: Setup Initial State
    console.log('⚙️  Phase 3: Setting up initial state...');
    
    // Mint tokens for participants
    for (let i = 0; i < Math.min(TEST_CONFIG.PARTICIPANT_COUNT, participants.length); i++) {
      const participant = participants[i];
      const mintAmount = TEST_CONFIG.STAKE_AMOUNT.mul(2); // Double for safety
      
      console.log(`   Minting ${ethers.utils.formatUnits(mintAmount, 18)} SQUDY for ${participant.address}...`);
      const mintTx = await squdyToken.mint(participant.address, mintAmount);
      await mintTx.wait();
    }
    
    console.log(`✅ Tokens minted for ${Math.min(TEST_CONFIG.PARTICIPANT_COUNT, participants.length)} participants\n`);

    // Phase 4: Create Test Campaign
    console.log('🎯 Phase 4: Creating test campaign...');
    
    const startDate = Math.floor(Date.now() / 1000); // Now
    const endDate = startDate + (7 * 24 * 60 * 60); // 7 days from now
    
    const createCampaignTx = await campaignManager.createCampaign(
      TEST_CONFIG.CAMPAIGN_NAME,
      'Test campaign for blockchain validation',
      TEST_CONFIG.HARD_CAP,
      TEST_CONFIG.SOFT_CAP,
      TEST_CONFIG.TICKET_AMOUNT,
      startDate,
      endDate,
      ['First Prize', 'Second Prize'], // Prize names
      [ethers.utils.parseUnits('5000', 6), ethers.utils.parseUnits('2500', 6)], // Prize values in USDC (6 decimals)
      ['USD', 'USD'] // Prize currencies
    );
    
    const receipt = await createCampaignTx.wait();
    const campaignId = 1; // First campaign
    
    deploymentResults.testCampaign = {
      id: campaignId,
      txHash: createCampaignTx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
    
    console.log(`✅ Test campaign created with ID: ${campaignId}`);
    console.log(`   Transaction: ${createCampaignTx.hash}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);

    // Phase 5: Add Participants
    console.log('👥 Phase 5: Adding participants to campaign...');
    
    const participantAddresses = [];
    
    for (let i = 0; i < Math.min(TEST_CONFIG.PARTICIPANT_COUNT, participants.length); i++) {
      const participant = participants[i];
      
      // Approve tokens
      console.log(`   Approving tokens for ${participant.address}...`);
      const approveTx = await squdyToken.connect(participant).approve(
        campaignManager.address,
        TEST_CONFIG.STAKE_AMOUNT
      );
      await approveTx.wait();
      
      // Stake to campaign
      console.log(`   Staking ${ethers.utils.formatUnits(TEST_CONFIG.STAKE_AMOUNT, 18)} SQUDY...`);
      const stakeTx = await campaignManager.connect(participant).stakeToCampaign(
        campaignId,
        TEST_CONFIG.STAKE_AMOUNT
      );
      await stakeTx.wait();
      
      participantAddresses.push(participant.address);
    }
    
    console.log(`✅ ${participantAddresses.length} participants added to campaign\n`);

    // Phase 6: Close Campaign
    console.log('🔒 Phase 6: Closing campaign...');
    
    const closeTx = await campaignManager.closeCampaign(campaignId);
    const closeReceipt = await closeTx.wait();
    
    deploymentResults.closeCampaign = {
      txHash: closeTx.hash,
      gasUsed: closeReceipt.gasUsed.toString(),
    };
    
    console.log(`✅ Campaign closed`);
    console.log(`   Transaction: ${closeTx.hash}`);
    console.log(`   Gas used: ${closeReceipt.gasUsed.toString()}\n`);

    // Phase 7: Select Winners (TEST TARGET)
    console.log('🏆 Phase 7: Selecting winners...');
    
    const selectWinnersTx = await campaignManager.selectWinners(campaignId);
    const winnersReceipt = await selectWinnersTx.wait();
    
    deploymentResults.selectWinners = {
      txHash: selectWinnersTx.hash,
      gasUsed: winnersReceipt.gasUsed.toString(),
    };
    
    console.log(`✅ Winners selected`);
    console.log(`   Transaction: ${selectWinnersTx.hash}`);
    console.log(`   Gas used: ${winnersReceipt.gasUsed.toString()}`);
    
    // Get winners
    const winnersEvent = winnersReceipt.events?.find(e => e.event === 'WinnersSelected');
    if (winnersEvent) {
      console.log(`   Winners: ${winnersEvent.args.winners.join(', ')}\n`);
      deploymentResults.selectWinners.winners = winnersEvent.args.winners;
    }

    // Phase 8: Burn Tokens (TEST TARGET)
    console.log('🔥 Phase 8: Burning remaining tokens...');
    
    const burnTx = await campaignManager.burnAllTokens(campaignId);
    const burnReceipt = await burnTx.wait();
    
    deploymentResults.burnTokens = {
      txHash: burnTx.hash,
      gasUsed: burnReceipt.gasUsed.toString(),
    };
    
    console.log(`✅ Tokens burned`);
    console.log(`   Transaction: ${burnTx.hash}`);
    console.log(`   Gas used: ${burnReceipt.gasUsed.toString()}`);
    
    // Get burn amount
    const burnEvent = burnReceipt.events?.find(e => e.event === 'TokensBurned');
    if (burnEvent) {
      const burnedAmount = ethers.utils.formatUnits(burnEvent.args.amount, 18);
      console.log(`   Burned amount: ${burnedAmount} SQUDY\n`);
      deploymentResults.burnTokens.burnedAmount = burnedAmount;
    }

    // Phase 9: Validation
    console.log('✅ Phase 9: Validating final state...');
    
    const finalCampaign = await campaignManager.getCampaign(campaignId);
    const totalSupplyAfter = await squdyToken.totalSupply();
    
    console.log(`   Campaign status: ${finalCampaign.status}`);
    console.log(`   Total supply after burn: ${ethers.utils.formatUnits(totalSupplyAfter, 18)} SQUDY`);
    
    deploymentResults.validation = {
      campaignStatus: finalCampaign.status.toString(),
      totalSupplyAfter: ethers.utils.formatUnits(totalSupplyAfter, 18),
    };

    // Save deployment results
    const outputPath = 'deployment-results.json';
    fs.writeFileSync(outputPath, JSON.stringify(deploymentResults, null, 2));
    
    console.log(`\n📊 Deployment results saved to: ${outputPath}`);
    
    // Generate summary report
    console.log('\n🎉 BLOCKCHAIN TEST DEPLOYMENT COMPLETE!');
    console.log('=====================================');
    console.log(`✅ SQUDY Token: ${deploymentResults.squdyToken.address}`);
    console.log(`✅ Campaign Manager: ${deploymentResults.campaignManager.address}`);
    console.log(`✅ Test Campaign ID: ${campaignId}`);
    console.log(`✅ Participants: ${participantAddresses.length}`);
    console.log(`✅ Winners Selected: ${deploymentResults.selectWinners.winners?.length || 'N/A'}`);
    console.log(`✅ Tokens Burned: ${deploymentResults.burnTokens.burnedAmount || 'N/A'} SQUDY`);
    console.log('\n🔍 Gas Usage Summary:');
    console.log(`   Campaign Creation: ${deploymentResults.testCampaign.gasUsed}`);
    console.log(`   Winner Selection: ${deploymentResults.selectWinners.gasUsed}`);
    console.log(`   Token Burning: ${deploymentResults.burnTokens.gasUsed}`);
    
    const totalGas = parseInt(deploymentResults.testCampaign.gasUsed) + 
                     parseInt(deploymentResults.selectWinners.gasUsed) + 
                     parseInt(deploymentResults.burnTokens.gasUsed);
    console.log(`   Total Operations: ${totalGas.toLocaleString()}`);
    
    console.log('\n🌐 Next Steps:');
    console.log('1. Update frontend .env with contract addresses');
    console.log('2. Test frontend integration with deployed contracts');
    console.log('3. Verify contracts on block explorer');
    console.log('4. Run end-to-end tests');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    
    // Save partial results for debugging
    if (Object.keys(deploymentResults).length > 0) {
      fs.writeFileSync('deployment-results-failed.json', JSON.stringify(deploymentResults, null, 2));
      console.log('💾 Partial deployment results saved to: deployment-results-failed.json');
    }
    
    process.exit(1);
  }
}

// Helper function to estimate costs
async function estimateCosts() {
  const gasPrice = await ethers.provider.getGasPrice();
  const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
  
  console.log(`⛽ Current gas price: ${gasPriceGwei} gwei`);
  
  // Estimated gas for operations
  const estimates = {
    tokenDeployment: 2000000,
    campaignManagerDeployment: 3000000,
    campaignCreation: 300000,
    winnerSelection: 500000,
    tokenBurning: 200000,
  };
  
  let totalEstimatedCost = ethers.BigNumber.from(0);
  
  console.log('\n💰 Estimated Costs:');
  for (const [operation, gas] of Object.entries(estimates)) {
    const cost = gasPrice.mul(gas);
    const costEth = ethers.utils.formatEther(cost);
    console.log(`   ${operation}: ${gas.toLocaleString()} gas = ${costEth} ETH`);
    totalEstimatedCost = totalEstimatedCost.add(cost);
  }
  
  console.log(`   Total Estimated: ${ethers.utils.formatEther(totalEstimatedCost)} ETH\n`);
  
  return totalEstimatedCost;
}

if (require.main === module) {
  estimateCosts().then(() => main())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main, estimateCosts };