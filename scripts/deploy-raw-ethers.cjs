const { ethers } = require("ethers");
const fs = require('fs');
require("dotenv").config({ path: './backend/.env' });

// Contract ABIs and Bytecodes
const SqudyTokenArtifact = require('../artifacts/contracts/SqudyToken.sol/SqudyToken.json');
const CampaignManagerArtifact = require('../artifacts/contracts/AutomatedSqudyCampaignManager.sol/AutomatedSqudyCampaignManager.json');

async function main() {
  console.log("🚀 Raw Ethers.js Sepolia Deployment...");
  
  try {
    // Setup provider and wallet (ethers v5 syntax)
    const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log("👤 Deployer address:", wallet.address);
    console.log("🌐 RPC URL:", process.env.SEPOLIA_RPC_URL);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");
    
    if (balance.lt(ethers.utils.parseEther("0.01"))) {
      console.log("❌ Insufficient balance for deployment");
      console.log("🚰 Get Sepolia ETH from: https://sepolia-faucet.pk910.de/");
      return;
    }
    
    // Test connection
    const network = await provider.getNetwork();
    console.log("🔗 Connected to network:", network.name, "Chain ID:", network.chainId.toString());
    
    console.log("\n🪙 Deploying SQUDY Token...");
    
    // Deploy SQUDY Token
    const tokenFactory = new ethers.ContractFactory(
      SqudyTokenArtifact.abi,
      SqudyTokenArtifact.bytecode,
      wallet
    );
    
    const squdyToken = await tokenFactory.deploy(wallet.address);
    console.log("⏳ Token deployment transaction sent:", squdyToken.deployTransaction.hash);
    
    const tokenReceipt = await squdyToken.deployTransaction.wait();
    const tokenAddress = squdyToken.address;
    console.log("✅ SQUDY Token deployed to:", tokenAddress);
    console.log("📦 Block number:", tokenReceipt.blockNumber);
    
    console.log("\n🎯 Deploying Campaign Manager...");
    
    // Deploy Campaign Manager
    const managerFactory = new ethers.ContractFactory(
      CampaignManagerArtifact.abi,
      CampaignManagerArtifact.bytecode,
      wallet
    );
    
    const campaignManager = await managerFactory.deploy(tokenAddress);
    console.log("⏳ Manager deployment transaction sent:", campaignManager.deployTransaction.hash);
    
    const managerReceipt = await campaignManager.deployTransaction.wait();
    const managerAddress = campaignManager.address;
    console.log("✅ Campaign Manager deployed to:", managerAddress);
    console.log("📦 Block number:", managerReceipt.blockNumber);
    
    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      chainId: 11155111,
      deployer: wallet.address,
      timestamp: new Date().toISOString(),
      contracts: {
        SqudyToken: {
          address: tokenAddress,
          txHash: tokenReceipt.hash,
          blockNumber: tokenReceipt.blockNumber
        },
        AutomatedSqudyCampaignManager: {
          address: managerAddress,
          txHash: managerReceipt.hash,
          blockNumber: managerReceipt.blockNumber
        }
      }
    };
    
    // Write deployment info to file
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
      console.log("🚰 Get Sepolia ETH from: https://sepolia-faucet.pk910.de/");
    }
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
