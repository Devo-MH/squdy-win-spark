const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying to Sepolia Testnet...");
  
  try {
    // Get the deployer account
    const signers = await hre.ethers.getSigners();
    const deployer = signers[0];
    console.log("👤 Deployer address:", await deployer.getAddress());
    
    // Check balance
    const deployerAddress = await deployer.getAddress();
    const balance = await hre.ethers.provider.getBalance(deployerAddress);
    console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "ETH");
    
    if (balance < hre.ethers.parseEther("0.01")) {
      console.log("❌ Insufficient balance for deployment");
      console.log("🚰 Get Sepolia ETH from: https://sepolia-faucet.pk910.de/");
      return;
    }
    
    console.log("✅ Sufficient balance for deployment");
    console.log("");
    
    // Deploy SQUDY Token
    console.log("🪙 Deploying SQUDY Token...");
    const SqudyToken = await hre.ethers.getContractFactory("SqudyToken");
    const squdyToken = await SqudyToken.deploy();
    
    console.log("⏳ Waiting for SQUDY Token deployment...");
    await squdyToken.waitForDeployment();
    
    const tokenAddress = await squdyToken.getAddress();
    console.log("✅ SQUDY Token deployed to:", tokenAddress);
    
    // Deploy Campaign Manager
    console.log("");
    console.log("🎯 Deploying Campaign Manager...");
    const CampaignManager = await hre.ethers.getContractFactory("AutomatedSqudyCampaignManager");
    const campaignManager = await CampaignManager.deploy(tokenAddress);
    
    console.log("⏳ Waiting for Campaign Manager deployment...");
    await campaignManager.waitForDeployment();
    
    const managerAddress = await campaignManager.getAddress();
    console.log("✅ Campaign Manager deployed to:", managerAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      timestamp: new Date().toISOString(),
      deployer: deployerAddress,
      contracts: {
        SqudyToken: {
          address: tokenAddress,
          txHash: squdyToken.deploymentTransaction().hash
        },
        AutomatedSqudyCampaignManager: {
          address: managerAddress,
          txHash: campaignManager.deploymentTransaction().hash
        }
      }
    };
    
    // Write deployment info to file
    const fs = require('fs');
    fs.writeFileSync(
      'sepolia-deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("");
    console.log("🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("========================");
    console.log("🪙 SQUDY Token:", tokenAddress);
    console.log("🎯 Campaign Manager:", managerAddress);
    console.log("📄 Deployment info saved to: sepolia-deployment.json");
    console.log("");
    console.log("🔗 NEXT STEPS:");
    console.log("1. Verify contracts on Etherscan");
    console.log("2. Grant admin roles");
    console.log("3. Test the deployment");
    console.log("4. Update frontend with new addresses");
    console.log("");
    console.log("🌐 View on Etherscan:");
    console.log(`   Token: https://sepolia.etherscan.io/address/${tokenAddress}`);
    console.log(`   Manager: https://sepolia.etherscan.io/address/${managerAddress}`);
    
  } catch (error) {
    console.error("💥 Deployment failed:", error.message);
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log("🚰 Get Sepolia ETH from: https://sepolia-faucet.pk910.de/");
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});