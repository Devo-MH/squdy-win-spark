/**
 * Sepolia Deployment Verification Script
 * Quick verification that deployed contracts are working correctly
 */

const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 Verifying Sepolia Deployment...\n');

  // Get contract addresses from environment or command line
  const squdyTokenAddress = process.env.SQUDY_TOKEN_ADDRESS || process.argv[2];
  const campaignManagerAddress = process.env.CAMPAIGN_MANAGER_ADDRESS || process.argv[3];

  if (!squdyTokenAddress || !campaignManagerAddress) {
    console.log('❌ Usage: node verify-deployment.js <token_address> <campaign_manager_address>');
    console.log('   Or set SQUDY_TOKEN_ADDRESS and CAMPAIGN_MANAGER_ADDRESS environment variables');
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log(`🔑 Verifying with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

  try {
    // Connect to deployed contracts
    console.log('📋 Contract Verification:');
    console.log(`🪙 SQUDY Token: ${squdyTokenAddress}`);
    console.log(`🎯 Campaign Manager: ${campaignManagerAddress}\n`);

    // Verify SQUDY Token
    const squdyToken = await ethers.getContractAt('MockSqudyToken', squdyTokenAddress);
    
    const tokenName = await squdyToken.name();
    const tokenSymbol = await squdyToken.symbol();
    const totalSupply = await squdyToken.totalSupply();
    const deployerBalance = await squdyToken.balanceOf(deployer.address);

    console.log('🪙 SQUDY Token Details:');
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Total Supply: ${ethers.utils.formatUnits(totalSupply, 18)} tokens`);
    console.log(`   Deployer Balance: ${ethers.utils.formatUnits(deployerBalance, 18)} tokens\n`);

    // Verify Campaign Manager
    const campaignManager = await ethers.getContractAt('SqudyCampaignManager', campaignManagerAddress);
    
    const campaignCount = await campaignManager.campaignCounter();
    const managerTokenAddress = await campaignManager.squdyToken();

    console.log('🎯 Campaign Manager Details:');
    console.log(`   Campaign Count: ${campaignCount.toString()}`);
    console.log(`   Connected Token: ${managerTokenAddress}`);
    console.log(`   Token Match: ${managerTokenAddress.toLowerCase() === squdyTokenAddress.toLowerCase() ? '✅' : '❌'}\n`);

    // Test basic functionality
    console.log('🧪 Testing Basic Functions:');

    // Test token transfer (small amount)
    const testAmount = ethers.utils.parseUnits('1', 18);
    
    console.log('   📤 Testing token transfer...');
    const transferTx = await squdyToken.transfer(campaignManagerAddress, testAmount);
    await transferTx.wait();
    
    const managerBalance = await squdyToken.balanceOf(campaignManagerAddress);
    console.log(`   ✅ Transfer successful. Manager balance: ${ethers.utils.formatUnits(managerBalance, 18)} tokens`);

    // Test campaign creation (minimal test)
    console.log('   🎯 Testing campaign creation...');
    
    const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const endTime = startTime + 86400; // 24 hours duration
    
    const createTx = await campaignManager.createCampaign(
      'Verification Test Campaign',
      'Test campaign for deployment verification',
      ethers.utils.parseUnits('1000', 18), // 1000 hard cap
      ethers.utils.parseUnits('100', 18),  // 100 soft cap
      ethers.utils.parseUnits('10', 18),   // 10 tokens per ticket
      startTime,
      endTime,
      ['Test Prize'],
      [ethers.utils.parseUnits('100', 6)], // 100 USDC
      ['USD']
    );
    
    const receipt = await createTx.wait();
    console.log(`   ✅ Campaign created. Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   📝 Transaction: ${createTx.hash}`);

    // Get campaign details
    const newCampaignCount = await campaignManager.campaignCounter();
    const campaign = await campaignManager.getCampaign(newCampaignCount);
    
    console.log('\n📊 Created Campaign Details:');
    console.log(`   ID: ${newCampaignCount.toString()}`);
    console.log(`   Name: ${campaign.name}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Hard Cap: ${ethers.utils.formatUnits(campaign.hardCap, 18)} tokens`);

    // Network information
    const network = await ethers.provider.getNetwork();
    const gasPrice = await ethers.provider.getGasPrice();
    
    console.log('\n🌐 Network Information:');
    console.log(`   Chain ID: ${network.chainId}`);
    console.log(`   Network: ${network.name}`);
    console.log(`   Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);

    // Generate frontend config
    const frontendConfig = {
      VITE_SQUDY_TOKEN_ADDRESS: squdyTokenAddress,
      VITE_CAMPAIGN_MANAGER_ADDRESS: campaignManagerAddress,
      VITE_NETWORK_CHAIN_ID: network.chainId,
      VITE_NETWORK: network.name,
      VITE_BLOCK_EXPLORER: 'https://sepolia.etherscan.io'
    };

    console.log('\n📝 Frontend Configuration (.env):');
    Object.entries(frontendConfig).forEach(([key, value]) => {
      console.log(`${key}=${value}`);
    });

    console.log('\n🎉 Deployment Verification Complete!');
    console.log('✅ All contracts deployed and functional');
    console.log('✅ Token transfers working');
    console.log('✅ Campaign creation working');
    console.log('✅ Ready for frontend integration');

    console.log('\n🔗 View on Etherscan:');
    console.log(`   Token: https://sepolia.etherscan.io/address/${squdyTokenAddress}`);
    console.log(`   Campaign Manager: https://sepolia.etherscan.io/address/${campaignManagerAddress}`);
    console.log(`   Test Campaign Creation: https://sepolia.etherscan.io/tx/${createTx.hash}`);

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    
    if (error.code === 'CALL_EXCEPTION') {
      console.error('💡 This might indicate the contract is not deployed or the address is incorrect');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('💡 Insufficient ETH balance for transactions');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('💡 Network connection issue. Check your RPC URL');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };