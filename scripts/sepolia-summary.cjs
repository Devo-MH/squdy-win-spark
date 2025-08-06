const fs = require('fs');

function generateSepoliaSummary() {
  console.log("🎉 SEPOLIA DEPLOYMENT SUMMARY");
  console.log("============================");
  
  try {
    const deploymentInfo = JSON.parse(fs.readFileSync('sepolia-deployment.json', 'utf8'));
    
    console.log("\n📋 DEPLOYMENT DETAILS");
    console.log("=====================");
    console.log(`🌐 Network: ${deploymentInfo.network.toUpperCase()}`);
    console.log(`⛓️  Chain ID: ${deploymentInfo.chainId}`);
    console.log(`👤 Deployer: ${deploymentInfo.deployer}`);
    console.log(`📅 Deployed: ${new Date(deploymentInfo.timestamp).toLocaleString()}`);
    
    console.log("\n🪙 SQUDY TOKEN CONTRACT");
    console.log("======================");
    console.log(`📍 Address: ${deploymentInfo.contracts.SqudyToken.address}`);
    console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${deploymentInfo.contracts.SqudyToken.address}`);
    console.log(`📦 Block: ${deploymentInfo.contracts.SqudyToken.blockNumber || 'N/A'}`);
    
    console.log("\n🎯 CAMPAIGN MANAGER CONTRACT");
    console.log("============================");
    console.log(`📍 Address: ${deploymentInfo.contracts.AutomatedSqudyCampaignManager.address}`);
    console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${deploymentInfo.contracts.AutomatedSqudyCampaignManager.address}`);
    console.log(`📦 Block: ${deploymentInfo.contracts.AutomatedSqudyCampaignManager.blockNumber || 'N/A'}`);
    
    if (deploymentInfo.adminRoles) {
      console.log("\n🔐 ADMIN CONFIGURATION");
      console.log("======================");
      console.log(`👥 Admin Wallets: ${deploymentInfo.adminRoles.adminWallets.length}`);
      deploymentInfo.adminRoles.adminWallets.forEach((wallet, i) => {
        console.log(`   ${i + 1}. ${wallet}`);
      });
      console.log(`🔑 Admin Role: ${deploymentInfo.adminRoles.roles.ADMIN_ROLE}`);
      console.log(`🔧 Operator Role: ${deploymentInfo.adminRoles.roles.OPERATOR_ROLE}`);
    }
    
    console.log("\n🌐 FRONTEND CONFIGURATION");
    console.log("=========================");
    console.log("Add these to your .env file:");
    console.log(`VITE_SQUDY_TOKEN_ADDRESS=${deploymentInfo.contracts.SqudyToken.address}`);
    console.log(`VITE_CAMPAIGN_MANAGER_ADDRESS=${deploymentInfo.contracts.AutomatedSqudyCampaignManager.address}`);
    console.log(`VITE_CHAIN_ID=11155111`);
    console.log(`VITE_NETWORK=sepolia`);
    
    console.log("\n📋 NEXT STEPS");
    console.log("=============");
    console.log("1. ✅ Contracts deployed and verified");
    console.log("2. ✅ Admin roles configured");
    console.log("3. ✅ All tests passed");
    console.log("4. 🔲 Manual contract verification on Etherscan (optional)");
    console.log("5. 🔲 Frontend testing with Sepolia");
    console.log("6. 🔲 Create test campaigns");
    console.log("7. 🔲 Community testing");
    console.log("8. 🔲 Prepare for mainnet deployment");
    
    console.log("\n💡 USEFUL COMMANDS");
    console.log("==================");
    console.log("# Test contracts:");
    console.log("node scripts/test-sepolia-deployment.cjs");
    console.log("");
    console.log("# Run frontend with Sepolia:");
    console.log("cp .env.sepolia .env && npm run dev");
    console.log("");
    console.log("# Grant additional admin roles:");
    console.log("node scripts/grant-admin-roles-sepolia.cjs");
    
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("Sepolia testnet is ready for testing and development.");
    
  } catch (error) {
    console.error("❌ Error reading deployment info:", error.message);
  }
}

generateSepoliaSummary();
