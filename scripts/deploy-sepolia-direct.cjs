const hre = require("hardhat");
require("dotenv").config({ path: './backend/.env' });

async function main() {
  console.log("🚀 Direct Sepolia Deployment...");
  
  try {
    console.log("🔧 Network:", hre.network.name);
    console.log("🔧 Chain ID:", hre.network.config.chainId);
    
    // Get deployer address
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new hre.ethers.Wallet(privateKey);
    const deployerAddress = wallet.address;
    console.log("👤 Deployer address:", deployerAddress);
    
    // Test connection
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    console.log("📦 Current block:", blockNumber);
    
    console.log("\n🪙 Deploying SQUDY Token...");
    
    // Deploy SQUDY Token using hardhat direct deploy
    const SqudyToken = await hre.ethers.getContractFactory("SqudyToken");
    console.log("✅ Got SqudyToken factory");
    
    // Deploy with constructor argument
    console.log("🚀 Deploying with owner:", deployerAddress);
    const squdyToken = await SqudyToken.deploy(deployerAddress);
    console.log("✅ Deployment transaction sent");
    
    // Wait for deployment to be mined
    await squdyToken.waitForDeployment();
    console.log("✅ Token deployment confirmed");
    
    // Use the target property to get address (ethers v6 compatible)
    const tokenAddress = squdyToken.target;
    console.log("🪙 SQUDY Token deployed to:", tokenAddress);
    
    console.log("\n🎯 Deploying Campaign Manager...");
    const CampaignManager = await hre.ethers.getContractFactory("AutomatedSqudyCampaignManager");
    console.log("✅ Got CampaignManager factory");
    
    const campaignManager = await CampaignManager.deploy(tokenAddress);
    console.log("✅ Campaign Manager deployment transaction sent");
    
    await campaignManager.waitForDeployment();
    console.log("✅ Campaign Manager deployment confirmed");
    
    const managerAddress = campaignManager.target;
    console.log("🎯 Campaign Manager deployed to:", managerAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      chainId: 11155111,
      deployer: deployerAddress,
      timestamp: new Date().toISOString(),
      contracts: {
        SqudyToken: {
          address: tokenAddress
        },
        AutomatedSqudyCampaignManager: {
          address: managerAddress
        }
      }
    };
    
    // Write deployment info to file
    const fs = require('fs');
    fs.writeFileSync(
      'sepolia-deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("========================");
    console.log("🪙 SQUDY Token:", tokenAddress);
    console.log("🎯 Campaign Manager:", managerAddress);
    console.log("📄 Deployment saved to: sepolia-deployment.json");
    console.log("");
    console.log("🌐 View on Etherscan:");
    console.log(`   Token: https://sepolia.etherscan.io/address/${tokenAddress}`);
    console.log(`   Manager: https://sepolia.etherscan.io/address/${managerAddress}`);
    console.log("");
    console.log("🔗 NEXT STEPS:");
    console.log("1. Grant admin roles to your wallets");
    console.log("2. Verify contracts on Etherscan");
    console.log("3. Test deployment functionality");
    console.log("4. Update frontend with addresses");
    
  } catch (error) {
    console.error("💥 Deployment failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
