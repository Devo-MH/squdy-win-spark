const { ethers } = require("ethers");
const fs = require('fs');
require("dotenv").config({ path: './backend/.env' });

// Contract ABIs and Bytecodes
const SqudyTokenArtifact = require('../artifacts/contracts/SqudyToken.sol/SqudyToken.json');
const CampaignManagerArtifact = require('../artifacts/contracts/CampaignManager.sol/AutomatedSqudyCampaignManager.json');

async function main() {
  console.log("🚀 Raw Ethers.js Sepolia Deployment...");
  
  try {
    // Setup provider and wallet (ethers v5 syntax)
    const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log("👤 Deployer address:", wallet.address);
    console.log("🌐 RPC URL:", process.env.SEPOLIA_RPC_URL || process.env.RPC_URL);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");
    
    if (balance.lt(ethers.utils.parseEther("0.008"))) {
      console.log("❌ Insufficient balance for deployment (need ~0.008+ ETH)");
      return;
    } else if (balance.lt(ethers.utils.parseEther("0.02"))) {
      console.log("⚠️  Low balance warning: proceeding with ~" + ethers.utils.formatEther(balance) + " ETH. If gas runs out, top-up and rerun.");
    }
    
    // Test connection
    const network = await provider.getNetwork();
    console.log("🔗 Connected to network:", network.name, "Chain ID:", network.chainId.toString());
    
    console.log("\n🪙 Deploying SQUDY Token...");
    
    // Deploy SQUDY Token (constructor: router, initialOwner)
    const router = process.env.ROUTER_ADDRESS || ethers.constants.AddressZero;
    const initialOwner = process.env.INITIAL_OWNER || wallet.address;
    const tokenFactory = new ethers.ContractFactory(
      SqudyTokenArtifact.abi,
      SqudyTokenArtifact.bytecode,
      wallet
    );
    
    // Pre-calc gas and cost to avoid sending tx that will fail due to funds
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.utils.parseUnits("1", "gwei");
    const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.utils.parseUnits("20", "gwei");
    const tokenDeployTx = tokenFactory.getDeployTransaction(router, initialOwner);
    const estimatedGasToken = await provider.estimateGas({ ...tokenDeployTx, from: wallet.address });
    const estCostToken = estimatedGasToken.mul(maxFeePerGas);
    console.log("⛽ Token gas estimate:", estimatedGasToken.toString(), "units");
    console.log("⛽ maxFeePerGas:", ethers.utils.formatUnits(maxFeePerGas, "gwei"), "gwei");
    console.log("💵 Estimated token max cost:", ethers.utils.formatEther(estCostToken), "ETH");
    
    const requiredWithBuffer = estCostToken.mul(110).div(100);
    if (balance.lt(requiredWithBuffer)) {
      console.log("❌ Not enough ETH for token deployment. Need at least ~", ethers.utils.formatEther(requiredWithBuffer), "ETH incl. 10% buffer.");
      return;
    }
    
    const squdyToken = await tokenFactory.deploy(router, initialOwner, {
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasLimit: estimatedGasToken.mul(105).div(100),
    });
    console.log("⏳ Token deployment transaction sent:", squdyToken.deployTransaction.hash);
    
    const tokenReceipt = await squdyToken.deployTransaction.wait();
    const tokenAddress = squdyToken.address;
    console.log("✅ SQUDY Token deployed to:", tokenAddress);
    console.log("📦 Block number:", tokenReceipt.blockNumber);
    
    console.log("\n🎯 Deploying Campaign Manager...");
    
    // Deploy Campaign Manager (constructor: token)
    const managerFactory = new ethers.ContractFactory(
      CampaignManagerArtifact.abi,
      CampaignManagerArtifact.bytecode,
      wallet
    );
    
    // Estimate manager deployment
    const managerDeployTx = managerFactory.getDeployTransaction(tokenAddress);
    const estimatedGasMgr = await provider.estimateGas({ ...managerDeployTx, from: wallet.address });
    const estCostMgr = estimatedGasMgr.mul(maxFeePerGas);
    console.log("⛽ Manager gas estimate:", estimatedGasMgr.toString(), "units");
    console.log("💵 Estimated manager max cost:", ethers.utils.formatEther(estCostMgr), "ETH");
    
    const balanceAfterToken = await provider.getBalance(wallet.address);
    const requiredMgrWithBuffer = estCostMgr.mul(110).div(100);
    if (balanceAfterToken.lt(requiredMgrWithBuffer)) {
      console.log("❌ Not enough ETH left to deploy Campaign Manager. Need at least ~", ethers.utils.formatEther(requiredMgrWithBuffer), "ETH incl. 10% buffer.");
      console.log("   Top-up the deployer and rerun to deploy the manager.");
      return;
    }
    
    const campaignManager = await managerFactory.deploy(tokenAddress, {
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasLimit: estimatedGasMgr.mul(105).div(100),
    });
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
          txHash: tokenReceipt.transactionHash || tokenReceipt.hash,
          blockNumber: tokenReceipt.blockNumber
        },
        CampaignManager: {
          address: managerAddress,
          txHash: managerReceipt.transactionHash || managerReceipt.hash,
          blockNumber: managerReceipt.blockNumber
        }
      }
    };
    
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
    console.log("1. Grant admin/operator roles where needed");
    console.log("2. Verify contracts on Etherscan");
    console.log("3. Update frontend env with addresses");
    
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
