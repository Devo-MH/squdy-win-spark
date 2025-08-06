const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config({ path: "./backend/.env" });

async function main() {
  console.log("🚀 Starting deployment of Automated Squdy Platform...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Network configuration
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network chain ID:", network.chainId);

  const deploymentResults = {
    network: {
      name: network.name,
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      timestamp: new Date().toISOString()
    },
    contracts: {}
  };

  try {
    // ============ STEP 1: Deploy SQUDY Token ============
    console.log("\n📦 Step 1: Deploying SQUDY Token...");
    
    const SqudyToken = await ethers.getContractFactory("SqudyToken");
    const squdyToken = await SqudyToken.deploy(deployer.address);
    await squdyToken.waitForDeployment();
    
    const squdyTokenAddress = await squdyToken.getAddress();
    console.log("✅ SQUDY Token deployed to:", squdyTokenAddress);
    
    // Verify token deployment
    const tokenName = await squdyToken.name();
    const tokenSymbol = await squdyToken.symbol();
    const tokenDecimals = await squdyToken.decimals();
    const totalSupply = await squdyToken.totalSupply();
    const deployerBalance = await squdyToken.balanceOf(deployer.address);
    
    console.log(`   📋 Token Details:`);
    console.log(`   📛 Name: ${tokenName}`);
    console.log(`   🏷️  Symbol: ${tokenSymbol}`);
    console.log(`   🔢 Decimals: ${tokenDecimals}`);
    console.log(`   💎 Total Supply: ${ethers.formatEther(totalSupply)} SQUDY`);
    console.log(`   💰 Deployer Balance: ${ethers.formatEther(deployerBalance)} SQUDY`);

    deploymentResults.contracts.squdyToken = {
      address: squdyTokenAddress,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: Number(tokenDecimals),
      totalSupply: totalSupply.toString(),
      deployerBalance: deployerBalance.toString()
    };

    // ============ STEP 2: Deploy Campaign Manager ============
    console.log("\n📦 Step 2: Deploying Automated Campaign Manager...");
    
    const AutomatedSqudyCampaignManager = await ethers.getContractFactory("AutomatedSqudyCampaignManager");
    const campaignManager = await AutomatedSqudyCampaignManager.deploy(squdyTokenAddress);
    await campaignManager.waitForDeployment();
    
    const campaignManagerAddress = await campaignManager.getAddress();
    console.log("✅ Campaign Manager deployed to:", campaignManagerAddress);

    // Verify campaign manager deployment
    const managerTokenAddress = await campaignManager.squdyToken();
    const totalCampaigns = await campaignManager.getTotalCampaigns();
    
    console.log(`   📋 Campaign Manager Details:`);
    console.log(`   🔗 Connected Token: ${managerTokenAddress}`);
    console.log(`   📊 Total Campaigns: ${totalCampaigns}`);
    console.log(`   ✅ Token Match: ${managerTokenAddress.toLowerCase() === squdyTokenAddress.toLowerCase() ? '✅' : '❌'}`);

    deploymentResults.contracts.campaignManager = {
      address: campaignManagerAddress,
      connectedToken: managerTokenAddress,
      totalCampaigns: Number(totalCampaigns)
    };

    // ============ STEP 3: Authorize Campaign Manager ============
    console.log("\n🔐 Step 3: Authorizing Campaign Manager to burn tokens...");
    
    const authorizeTx = await squdyToken.setAuthorizedBurner(campaignManagerAddress, true);
    await authorizeTx.wait();
    
    const isAuthorized = await squdyToken.authorizedBurners(campaignManagerAddress);
    console.log(`   ✅ Campaign Manager authorized: ${isAuthorized}`);

    // ============ STEP 4: Setup Initial Campaign (Optional) ============
    console.log("\n🎯 Step 4: Creating initial test campaign...");
    
    const currentTime = Math.floor(Date.now() / 1000);
    const startDate = currentTime + 300; // 5 minutes from now
    const endDate = startDate + 86400; // 24 hours later
    
    const createCampaignTx = await campaignManager.createCampaign(
      "🚀 Launch Campaign",
      "Welcome to SQUDY! Our first burn-to-win campaign with automated winner selection.",
      "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
      ethers.parseEther("1000"), // 1,000 SQUDY soft cap
      ethers.parseEther("10000"), // 10,000 SQUDY hard cap
      ethers.parseEther("100"), // 100 SQUDY per ticket
      startDate,
      endDate,
      ["🥇 Gold Prize: 5000 SQUDY", "🥈 Silver Prize: 3000 SQUDY", "🥉 Bronze Prize: 2000 SQUDY"]
    );
    
    const receipt = await createCampaignTx.wait();
    const campaignCreatedEvent = receipt.logs.find(log => log.topics[0] === ethers.id("CampaignCreated(uint256,address,string)"));
    const campaignId = campaignCreatedEvent ? Number(campaignCreatedEvent.topics[1]) : 1;
    
    console.log(`   ✅ Test campaign created with ID: ${campaignId}`);

    deploymentResults.contracts.testCampaign = {
      id: campaignId,
      name: "🚀 Launch Campaign",
      startDate: new Date(startDate * 1000).toISOString(),
      endDate: new Date(endDate * 1000).toISOString()
    };

    // ============ STEP 5: Transfer some tokens to Campaign Manager ============
    console.log("\n💸 Step 5: Transferring tokens for testing...");
    
    const testAmount = ethers.parseEther("50000"); // 50,000 SQUDY for testing
    const transferTx = await squdyToken.transfer(campaignManagerAddress, testAmount);
    await transferTx.wait();
    
    const managerBalance = await squdyToken.balanceOf(campaignManagerAddress);
    console.log(`   ✅ Campaign Manager balance: ${ethers.formatEther(managerBalance)} SQUDY`);

    // ============ STEP 6: Save deployment info ============
    console.log("\n💾 Step 6: Saving deployment information...");
    
    const deploymentFile = path.join(__dirname, '..', 'deployment-automated.json');
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResults, null, 2));
    
    // Create environment variables
    const envContent = `
# ========================================
# AUTOMATED SQUDY DEPLOYMENT ADDRESSES
# ========================================
VITE_SQUDY_TOKEN_ADDRESS=${squdyTokenAddress}
VITE_CAMPAIGN_MANAGER_ADDRESS=${campaignManagerAddress}
VITE_NETWORK_CHAIN_ID=${network.chainId}

# ========================================
# BACKEND ENVIRONMENT VARIABLES
# ========================================
SQUDY_TOKEN_ADDRESS=${squdyTokenAddress}
CAMPAIGN_MANAGER_ADDRESS=${campaignManagerAddress}
NETWORK_CHAIN_ID=${network.chainId}
DEPLOYER_ADDRESS=${deployer.address}
`;

    const envFile = path.join(__dirname, '..', 'backend', '.env.automated');
    fs.writeFileSync(envFile, envContent.trim());

    // ============ DEPLOYMENT SUMMARY ============
    console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉");
    console.log("=" .repeat(60));
    console.log(`📅 Deployment Time: ${deploymentResults.network.timestamp}`);
    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log("");
    console.log("📋 CONTRACT ADDRESSES:");
    console.log(`🪙 SQUDY Token: ${squdyTokenAddress}`);
    console.log(`🎯 Campaign Manager: ${campaignManagerAddress}`);
    console.log("");
    console.log("🔗 EXPLORER LINKS:");
    
    let explorerBase = "https://etherscan.io";
    if (network.chainId === 11155111n) {
      explorerBase = "https://sepolia.etherscan.io";
    } else if (network.chainId === 56n) {
      explorerBase = "https://bscscan.com";
    } else if (network.chainId === 97n) {
      explorerBase = "https://testnet.bscscan.com";
    }
    
    console.log(`   Token: ${explorerBase}/address/${squdyTokenAddress}`);
    console.log(`   Campaign Manager: ${explorerBase}/address/${campaignManagerAddress}`);
    console.log("");
    console.log("📁 FILES CREATED:");
    console.log(`   📄 deployment-automated.json`);
    console.log(`   📄 backend/.env.automated`);
    console.log("");
    console.log("🚀 NEXT STEPS:");
    console.log("1. Update your frontend environment variables");
    console.log("2. Update backend to use new contract addresses");
    console.log("3. Test the first campaign!");
    console.log("4. Set up PancakeSwap liquidity pool");
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    // Save error info
    deploymentResults.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    const errorFile = path.join(__dirname, '..', 'deployment-error.json');
    fs.writeFileSync(errorFile, JSON.stringify(deploymentResults, null, 2));
    
    throw error;
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Deployment script failed:", error);
    process.exit(1);
  });