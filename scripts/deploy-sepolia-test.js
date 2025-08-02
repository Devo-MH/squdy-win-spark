/**
 * Sepolia Testnet Deployment Script
 * Deploy and test the complete SQUDY system on Sepolia testnet
 * Supports both mock SQUDY and real SQUDY token testing
 */

const { ethers } = require('hardhat');
const fs = require('fs');

// Configuration
const CONFIG = {
  USE_MOCK_TOKEN: process.env.USE_MOCK_TOKEN !== 'false', // Default to true
  EXISTING_SQUDY_ADDRESS: process.env.SQUDY_TOKEN_ADDRESS || '', // Set if using real SQUDY
  TEST_PARTICIPANTS: 5,
  STAKE_AMOUNT: ethers.utils.parseUnits('100', 18), // 100 tokens per participant
  CAMPAIGN_DURATION: 24 * 60 * 60, // 24 hours
};

async function main() {
  console.log('🌐 SQUDY Sepolia Testnet Deployment & Testing');
  console.log('=============================================\n');

  // Get signers
  const [deployer, ...testAccounts] = await ethers.getSigners();
  console.log(`🔑 Deployer: ${deployer.address}`);
  console.log(`💰 Deployer balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  console.log(`👥 Test accounts available: ${testAccounts.length}\n`);

  let squdyToken;
  let deploymentResults = {};

  try {
    // Phase 1: Deploy or connect to SQUDY Token
    if (CONFIG.USE_MOCK_TOKEN) {
      console.log('🪙 Phase 1: Deploying Mock SQUDY Token...');
      
      const MockSqudyToken = await ethers.getContractFactory('MockSqudyToken');
      squdyToken = await MockSqudyToken.deploy();
      await squdyToken.deployed();
      
      deploymentResults.squdyToken = {
        address: squdyToken.address,
        type: 'mock',
        txHash: squdyToken.deployTransaction.hash,
      };
      
      console.log(`✅ Mock SQUDY Token deployed: ${squdyToken.address}`);
      console.log(`   Transaction: ${squdyToken.deployTransaction.hash}`);
      
      // Mint tokens for testing
      const totalSupply = await squdyToken.totalSupply();
      console.log(`   Total supply: ${ethers.utils.formatUnits(totalSupply, 18)} tSQUDY\n`);
      
    } else if (CONFIG.EXISTING_SQUDY_ADDRESS) {
      console.log('🔗 Phase 1: Connecting to Real SQUDY Token...');
      
      squdyToken = await ethers.getContractAt('IERC20', CONFIG.EXISTING_SQUDY_ADDRESS);
      
      deploymentResults.squdyToken = {
        address: CONFIG.EXISTING_SQUDY_ADDRESS,
        type: 'real',
      };
      
      console.log(`✅ Connected to SQUDY Token: ${CONFIG.EXISTING_SQUDY_ADDRESS}`);
      
      // Check deployer balance
      const balance = await squdyToken.balanceOf(deployer.address);
      console.log(`   Deployer SQUDY balance: ${ethers.utils.formatUnits(balance, 18)} SQUDY\n`);
      
    } else {
      throw new Error('❌ No SQUDY token configuration provided. Set USE_MOCK_TOKEN=true or SQUDY_TOKEN_ADDRESS');
    }

    // Phase 2: Deploy Campaign Manager
    console.log('🎯 Phase 2: Deploying Campaign Manager...');
    
    const CampaignManager = await ethers.getContractFactory('SqudyCampaignManager');
    const campaignManager = await CampaignManager.deploy(squdyToken.address);
    await campaignManager.deployed();
    
    deploymentResults.campaignManager = {
      address: campaignManager.address,
      txHash: campaignManager.deployTransaction.hash,
    };
    
    console.log(`✅ Campaign Manager deployed: ${campaignManager.address}`);
    console.log(`   Transaction: ${campaignManager.deployTransaction.hash}\n`);

    // Phase 3: Setup Test Environment
    console.log('⚙️  Phase 3: Setting up test environment...');
    
    // Prepare test participants
    const participants = testAccounts.slice(0, CONFIG.TEST_PARTICIPANTS);
    
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      console.log(`   👤 Preparing participant ${i + 1}: ${participant.address}`);
      
      if (CONFIG.USE_MOCK_TOKEN) {
        // Mint mock tokens for testing
        const mintTx = await squdyToken.mint(participant.address, CONFIG.STAKE_AMOUNT.mul(2));
        await mintTx.wait();
        console.log(`      Minted ${ethers.utils.formatUnits(CONFIG.STAKE_AMOUNT.mul(2), 18)} tSQUDY`);
      } else {
        // For real SQUDY, check if participant has tokens
        const balance = await squdyToken.balanceOf(participant.address);
        console.log(`      SQUDY balance: ${ethers.utils.formatUnits(balance, 18)}`);
        
        if (balance.lt(CONFIG.STAKE_AMOUNT)) {
          console.log(`      ⚠️  Insufficient SQUDY for testing. Need ${ethers.utils.formatUnits(CONFIG.STAKE_AMOUNT, 18)} SQUDY`);
        }
      }
    }
    console.log();

    // Phase 4: Create Test Campaign
    console.log('🎯 Phase 4: Creating test campaign...');
    
    const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
    const endTime = startTime + CONFIG.CAMPAIGN_DURATION;
    
    const createTx = await campaignManager.createCampaign(
      'Sepolia Test Campaign',
      'Complete functionality test on Sepolia testnet',
      ethers.utils.parseUnits('1000', 18), // 1000 token hard cap
      ethers.utils.parseUnits('500', 18),  // 500 token soft cap
      ethers.utils.parseUnits('100', 18),  // 100 tokens per ticket
      startTime,
      endTime,
      ['First Prize', 'Second Prize'],
      [ethers.utils.parseUnits('500', 6), ethers.utils.parseUnits('200', 6)], // USDC values
      ['USD', 'USD']
    );
    
    const receipt = await createTx.wait();
    const campaignId = 1; // First campaign
    
    deploymentResults.testCampaign = {
      id: campaignId,
      txHash: createTx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
    
    console.log(`✅ Test campaign created (ID: ${campaignId})`);
    console.log(`   Transaction: ${createTx.hash}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);

    // Phase 5: Test Staking Process
    console.log('💰 Phase 5: Testing staking process...');
    
    // Wait for campaign to start
    console.log('   ⏳ Waiting for campaign to start...');
    while (Math.floor(Date.now() / 1000) < startTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      process.stdout.write('.');
    }
    console.log(' Campaign started!\n');
    
    // Execute staking for each participant
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      console.log(`   👤 Participant ${i + 1} staking...`);
      
      try {
        // Approve tokens
        console.log('      Approving tokens...');
        const approveTx = await squdyToken.connect(participant).approve(
          campaignManager.address,
          CONFIG.STAKE_AMOUNT
        );
        await approveTx.wait();
        
        // Stake tokens
        console.log('      Staking tokens...');
        const stakeTx = await campaignManager.connect(participant).stakeToCampaign(
          campaignId,
          CONFIG.STAKE_AMOUNT
        );
        const stakeReceipt = await stakeTx.wait();
        
        console.log(`      ✅ Staked ${ethers.utils.formatUnits(CONFIG.STAKE_AMOUNT, 18)} tokens`);
        console.log(`      Gas used: ${stakeReceipt.gasUsed.toString()}`);
        console.log(`      Transaction: ${stakeTx.hash}\n`);
        
      } catch (error) {
        console.log(`      ❌ Staking failed: ${error.message}\n`);
      }
    }

    // Phase 6: Test Winner Selection
    console.log('🏆 Phase 6: Testing winner selection...');
    
    // Close campaign
    console.log('   🔒 Closing campaign...');
    const closeTx = await campaignManager.closeCampaign(campaignId);
    await closeTx.wait();
    console.log(`   ✅ Campaign closed: ${closeTx.hash}`);
    
    // Select winners
    console.log('   🎲 Selecting winners...');
    const selectTx = await campaignManager.selectWinners(campaignId);
    const selectReceipt = await selectTx.wait();
    
    deploymentResults.selectWinners = {
      txHash: selectTx.hash,
      gasUsed: selectReceipt.gasUsed.toString(),
    };
    
    console.log(`   ✅ Winners selected: ${selectTx.hash}`);
    console.log(`   Gas used: ${selectReceipt.gasUsed.toString()}`);
    
    // Get winners from events
    const winnerEvents = selectReceipt.events?.filter(e => e.event === 'WinnersSelected');
    if (winnerEvents && winnerEvents.length > 0) {
      console.log('   🎉 Winners:');
      winnerEvents[0].args.winners.forEach((winner, index) => {
        console.log(`      ${index + 1}. ${winner}`);
      });
    }
    console.log();

    // Phase 7: Test Token Burning
    console.log('🔥 Phase 7: Testing token burning...');
    
    const burnTx = await campaignManager.burnAllTokens(campaignId);
    const burnReceipt = await burnTx.wait();
    
    deploymentResults.burnTokens = {
      txHash: burnTx.hash,
      gasUsed: burnReceipt.gasUsed.toString(),
    };
    
    console.log(`   ✅ Tokens burned: ${burnTx.hash}`);
    console.log(`   Gas used: ${burnReceipt.gasUsed.toString()}\n`);

    // Phase 8: Verification
    console.log('🔍 Phase 8: Final verification...');
    
    const finalCampaign = await campaignManager.getCampaign(campaignId);
    console.log(`   Campaign status: ${finalCampaign.status}`);
    
    if (CONFIG.USE_MOCK_TOKEN) {
      const finalSupply = await squdyToken.totalSupply();
      console.log(`   Token supply after burn: ${ethers.utils.formatUnits(finalSupply, 18)} tSQUDY`);
    }

    // Save deployment results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `sepolia-deployment-${timestamp}.json`;
    
    deploymentResults.network = 'sepolia';
    deploymentResults.timestamp = new Date().toISOString();
    deploymentResults.config = CONFIG;
    
    fs.writeFileSync(outputFile, JSON.stringify(deploymentResults, null, 2));
    
    // Generate summary
    console.log('\n🎉 SEPOLIA TESTING COMPLETE!');
    console.log('============================');
    console.log(`✅ Network: Sepolia Testnet`);
    console.log(`✅ Token Type: ${CONFIG.USE_MOCK_TOKEN ? 'Mock SQUDY' : 'Real SQUDY'}`);
    console.log(`✅ SQUDY Token: ${squdyToken.address}`);
    console.log(`✅ Campaign Manager: ${campaignManager.address}`);
    console.log(`✅ Test Campaign: ${campaignId}`);
    console.log(`✅ Participants: ${participants.length}`);
    console.log('\n🔗 Block Explorer Links:');
    console.log(`   Token: https://sepolia.etherscan.io/address/${squdyToken.address}`);
    console.log(`   Campaign Manager: https://sepolia.etherscan.io/address/${campaignManager.address}`);
    console.log(`   Winner Selection: https://sepolia.etherscan.io/tx/${deploymentResults.selectWinners.txHash}`);
    console.log(`   Token Burning: https://sepolia.etherscan.io/tx/${deploymentResults.burnTokens.txHash}`);
    console.log(`\n📄 Results saved to: ${outputFile}`);
    
    // Environment file for frontend
    const envContent = `
# Sepolia Testnet Configuration
VITE_SQUDY_TOKEN_ADDRESS=${squdyToken.address}
VITE_CAMPAIGN_MANAGER_ADDRESS=${campaignManager.address}
VITE_NETWORK_CHAIN_ID=11155111
VITE_NETWORK_NAME=sepolia
VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io
`;
    
    fs.writeFileSync('.env.sepolia', envContent);
    console.log(`📝 Frontend config saved to: .env.sepolia`);
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Copy .env.sepolia to .env to use Sepolia in frontend');
    console.log('2. Connect MetaMask to Sepolia testnet');
    console.log('3. Test frontend integration with deployed contracts');
    console.log('4. Verify contracts on Etherscan');

  } catch (error) {
    console.error(`\n❌ Deployment failed: ${error.message}`);
    console.error(error);
    
    if (Object.keys(deploymentResults).length > 0) {
      fs.writeFileSync('sepolia-deployment-failed.json', JSON.stringify(deploymentResults, null, 2));
      console.log('💾 Partial results saved to: sepolia-deployment-failed.json');
    }
    
    process.exit(1);
  }
}

// Helper functions
async function estimateSepoliaGasCosts() {
  const gasPrice = await ethers.provider.getGasPrice();
  const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
  
  console.log(`⛽ Sepolia gas price: ${gasPriceGwei} gwei`);
  
  const estimates = {
    tokenDeployment: 1500000,
    campaignManagerDeployment: 2500000,
    campaignCreation: 300000,
    tokenApproval: 50000,
    staking: 150000,
    winnerSelection: 400000,
    tokenBurning: 200000,
  };
  
  console.log('\n💰 Estimated Gas Costs:');
  let totalGas = 0;
  
  for (const [operation, gas] of Object.entries(estimates)) {
    const cost = gasPrice.mul(gas);
    const costEth = ethers.utils.formatEther(cost);
    console.log(`   ${operation}: ${gas.toLocaleString()} gas = ${costEth} SepoliaETH`);
    totalGas += gas;
  }
  
  const totalCost = gasPrice.mul(totalGas);
  console.log(`   Total Estimated: ${ethers.utils.formatEther(totalCost)} SepoliaETH\n`);
}

if (require.main === module) {
  estimateSepoliaGasCosts()
    .then(() => main())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };