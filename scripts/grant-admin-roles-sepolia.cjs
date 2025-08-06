const { ethers } = require("ethers");
const fs = require('fs');
require("dotenv").config({ path: './backend/.env' });

// Contract ABI
const CampaignManagerArtifact = require('../artifacts/contracts/AutomatedSqudyCampaignManager.sol/AutomatedSqudyCampaignManager.json');

async function main() {
  console.log("🎯 Granting Admin Roles on Sepolia...");
  
  try {
    // Load deployment info
    const deploymentInfo = JSON.parse(fs.readFileSync('sepolia-deployment.json', 'utf8'));
    const managerAddress = deploymentInfo.contracts.AutomatedSqudyCampaignManager.address;
    
    console.log("🎯 Campaign Manager:", managerAddress);
    console.log("👤 Deployer:", deploymentInfo.deployer);
    
    // Setup provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Connect to the deployed contract
    const campaignManager = new ethers.Contract(
      managerAddress,
      CampaignManagerArtifact.abi,
      wallet
    );
    
    console.log("✅ Connected to Campaign Manager contract");
    
    // Get admin wallets from environment
    const adminWallets = process.env.ADMIN_WALLETS.split(',').map(addr => addr.trim());
    console.log("📋 Admin wallets to configure:", adminWallets);
    
    // Get role constants
    const ADMIN_ROLE = await campaignManager.ADMIN_ROLE();
    const OPERATOR_ROLE = await campaignManager.OPERATOR_ROLE();
    
    console.log("🔑 ADMIN_ROLE:", ADMIN_ROLE);
    console.log("🔑 OPERATOR_ROLE:", OPERATOR_ROLE);
    
    console.log("\n🎯 Granting Admin Roles...");
    
    for (let i = 0; i < adminWallets.length; i++) {
      const adminWallet = adminWallets[i];
      console.log(`\n👤 Processing wallet ${i + 1}/${adminWallets.length}: ${adminWallet}`);
      
      // Check if already has admin role
      const hasAdmin = await campaignManager.hasRole(ADMIN_ROLE, adminWallet);
      const hasOperator = await campaignManager.hasRole(OPERATOR_ROLE, adminWallet);
      
      console.log(`   Current ADMIN_ROLE: ${hasAdmin}`);
      console.log(`   Current OPERATOR_ROLE: ${hasOperator}`);
      
      // Grant ADMIN_ROLE if not already granted
      if (!hasAdmin) {
        console.log("   🔐 Granting ADMIN_ROLE...");
        const adminTx = await campaignManager.grantRole(ADMIN_ROLE, adminWallet);
        await adminTx.wait();
        console.log(`   ✅ ADMIN_ROLE granted. Tx: ${adminTx.hash}`);
      } else {
        console.log("   ✅ Already has ADMIN_ROLE");
      }
      
      // Grant OPERATOR_ROLE if not already granted
      if (!hasOperator) {
        console.log("   🔧 Granting OPERATOR_ROLE...");
        const operatorTx = await campaignManager.grantRole(OPERATOR_ROLE, adminWallet);
        await operatorTx.wait();
        console.log(`   ✅ OPERATOR_ROLE granted. Tx: ${operatorTx.hash}`);
      } else {
        console.log("   ✅ Already has OPERATOR_ROLE");
      }
    }
    
    console.log("\n🎉 ADMIN ROLES CONFIGURATION COMPLETE!");
    console.log("=====================================");
    
    // Verify final configuration
    console.log("\n📊 Final Role Configuration:");
    for (const adminWallet of adminWallets) {
      const hasAdmin = await campaignManager.hasRole(ADMIN_ROLE, adminWallet);
      const hasOperator = await campaignManager.hasRole(OPERATOR_ROLE, adminWallet);
      console.log(`👤 ${adminWallet}:`);
      console.log(`   🔐 ADMIN_ROLE: ${hasAdmin ? '✅' : '❌'}`);
      console.log(`   🔧 OPERATOR_ROLE: ${hasOperator ? '✅' : '❌'}`);
    }
    
    // Update deployment info with role grants
    deploymentInfo.adminRoles = {
      grantedAt: new Date().toISOString(),
      adminWallets: adminWallets,
      roles: {
        ADMIN_ROLE: ADMIN_ROLE,
        OPERATOR_ROLE: OPERATOR_ROLE
      }
    };
    
    fs.writeFileSync('sepolia-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("\n📄 Updated deployment file with role information");
    
    console.log("\n✅ NEXT: Contract verification on Etherscan");
    
  } catch (error) {
    console.error("💥 Admin role grant failed:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
