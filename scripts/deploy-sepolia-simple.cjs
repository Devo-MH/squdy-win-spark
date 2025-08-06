const hre = require("hardhat");
require("dotenv").config({ path: './backend/.env' });

async function main() {
  console.log("🚀 Simple Sepolia Deployment...");
  
  try {
    console.log("🔧 Network:", hre.network.name);
    console.log("🔧 Chain ID:", hre.network.config.chainId);
    
    // Test basic connection
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    console.log("📦 Current block:", blockNumber);
    
    // Use hardhat's configured signer
    const provider = hre.ethers.provider;
    
    // Create wallet from private key
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new hre.ethers.Wallet(privateKey);
    const deployerAddress = wallet.address;
    console.log("👤 Deployer address:", deployerAddress);
    
    // Skip balance check for now, proceed directly to deployment
    console.log("💰 Proceeding with deployment (balance check skipped due to ethers compatibility)");
    
    // Deploy contracts using the factory pattern
    console.log("\n🪙 Deploying SQUDY Token...");
    const SqudyTokenFactory = await hre.ethers.getContractFactory("SqudyToken");
    const squdyToken = await SqudyTokenFactory.deploy(deployerAddress);
    
    // Wait for deployment
    console.log("⏳ Waiting for SQUDY Token deployment confirmation...");
    const squdyTokenTx = squdyToken.deploymentTransaction();
    const squdyTokenReceipt = await squdyTokenTx.wait();
    const tokenAddress = squdyTokenReceipt.contractAddress;
    console.log("✅ SQUDY Token deployed to:", tokenAddress);
    
    console.log("\n🎯 Deploying Campaign Manager...");
    const CampaignManagerFactory = await hre.ethers.getContractFactory("AutomatedSqudyCampaignManager");
    const campaignManager = await CampaignManagerFactory.deploy(tokenAddress);
    
    // Wait for deployment
    const campaignManagerReceipt = await campaignManager.deploymentTransaction().wait();
    const managerAddress = campaignManagerReceipt.contractAddress;
    console.log("✅ Campaign Manager deployed to:", managerAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      chainId: 11155111,
      deployer: deployerAddress,
      timestamp: new Date().toISOString(),
      blockNumber: await hre.ethers.provider.getBlockNumber(),
      contracts: {
        SqudyToken: {
          address: tokenAddress,
          txHash: squdyTokenReceipt.transactionHash,
          blockNumber: squdyTokenReceipt.blockNumber
        },
        AutomatedSqudyCampaignManager: {
          address: managerAddress,
          txHash: campaignManagerReceipt.transactionHash,
          blockNumber: campaignManagerReceipt.blockNumber
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
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log("🚰 Get Sepolia ETH from:");
      console.log("   https://sepolia-faucet.pk910.de/");
      console.log("   https://sepoliafaucet.com/");
    }
    if (error.data) {
      console.log("Error data:", error.data);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
