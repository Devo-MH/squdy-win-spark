const { ethers } = require("hardhat");
require("dotenv").config({ path: "./backend/.env" });

async function main() {
  console.log("🚀 Starting deployment of Squdy Burn-to-Win Platform...");

  // Get deployer account using ethers v6 syntax
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

  // Network configuration
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network chain ID:", network.chainId);

  // VRF Configuration based on network
  let VRF_COORDINATOR, KEY_HASH;
  if (network.chainId === 97n) { // BSC Testnet
    VRF_COORDINATOR = "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f";
    KEY_HASH = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314";
    console.log("🔗 Using BSC Testnet VRF Configuration");
  } else if (network.chainId === 56n) { // BSC Mainnet
    VRF_COORDINATOR = "0xc587d9053cd1118f25F645F9E08BB98c9712A4EE";
    KEY_HASH = "0xba6e730de88d94a5510ae6613898bfb0c3de5d16e609c5b7da808abb1254c720";
    console.log("🔗 Using BSC Mainnet VRF Configuration");
  } else {
    throw new Error("Unsupported network. Please use BSC Testnet (97) or Mainnet (56)");
  }

  const SUBSCRIPTION_ID = 1; // You need to create a subscription on Chainlink VRF

  try {
    // Deploy Mock SQUDY Token
    console.log("\n📦 Deploying Mock SQUDY Token...");
    const MockSqudyToken = await ethers.getContractFactory("MockSqudyToken");
    const mockSqudyToken = await MockSqudyToken.deploy();
    await mockSqudyToken.waitForDeployment();
    const mockSqudyTokenAddress = await mockSqudyToken.getAddress();
    console.log("✅ Mock SQUDY Token deployed to:", mockSqudyTokenAddress);

    // Deploy Squdy Campaign Manager
    console.log("\n📦 Deploying Squdy Campaign Manager...");
    const SqudyCampaignManager = await ethers.getContractFactory("SqudyCampaignManager");
    const squdyCampaignManager = await SqudyCampaignManager.deploy(
      mockSqudyTokenAddress,
      VRF_COORDINATOR,
      KEY_HASH,
      SUBSCRIPTION_ID
    );
    await squdyCampaignManager.waitForDeployment();
    const squdyCampaignManagerAddress = await squdyCampaignManager.getAddress();
    console.log("✅ Squdy Campaign Manager deployed to:", squdyCampaignManagerAddress);

    // Wait for a few block confirmations
    console.log("\n⏳ Waiting for confirmations...");
    await mockSqudyToken.deploymentTransaction().wait(5);
    await squdyCampaignManager.deploymentTransaction().wait(5);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    // Check token details
    const tokenName = await mockSqudyToken.name();
    const tokenSymbol = await mockSqudyToken.symbol();
    const tokenDecimals = await mockSqudyToken.decimals();
    const totalSupply = await mockSqudyToken.totalSupply();
    
    console.log("📊 Token Details:");
    console.log("   Name:", tokenName);
    console.log("   Symbol:", tokenSymbol);
    console.log("   Decimals:", tokenDecimals.toString());
    console.log("   Total Supply:", ethers.formatEther(totalSupply), "SQUDY");

    // Check campaign manager details
    const campaignCount = await squdyCampaignManager.getCampaignCount();
    const hasAdminRole = await squdyCampaignManager.hasRole(await squdyCampaignManager.ADMIN_ROLE(), deployer.address);
    
    console.log("📊 Campaign Manager Details:");
    console.log("   Campaign Count:", campaignCount.toString());
    console.log("   Deployer is Admin:", hasAdminRole);

    // Mint tokens to deployer for testing
    console.log("\n💰 Minting tokens to deployer for testing...");
    const mintAmount = ethers.parseEther("1000000"); // 1 million tokens
    await mockSqudyToken.mint(deployer.address, mintAmount);
    console.log("✅ Minted", ethers.formatEther(mintAmount), "SQUDY to deployer");

    // Update .env file with deployed addresses
    console.log("\n📝 Updating .env file with deployed contract addresses...");
    
    // Read current .env file
    const fs = require("fs");
    const path = require("path");
    const envPath = path.join(__dirname, "../backend/.env");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Update SQUDY_TOKEN_ADDRESS
    envContent = envContent.replace(
      /SQUDY_TOKEN_ADDRESS=.*/,
      `SQUDY_TOKEN_ADDRESS=${mockSqudyTokenAddress}`
    );

    // Update CAMPAIGN_MANAGER_ADDRESS
    envContent = envContent.replace(
      /CAMPAIGN_MANAGER_ADDRESS=.*/,
      `CAMPAIGN_MANAGER_ADDRESS=${squdyCampaignManagerAddress}`
    );

    // Update ADMIN_WALLETS with deployer address
    envContent = envContent.replace(
      /ADMIN_WALLETS=.*/,
      `ADMIN_WALLETS=${deployer.address}`
    );

    // Update network configuration
    const networkName = network.chainId === 97n ? "testnet" : "mainnet";
    envContent = envContent.replace(
      /NETWORK=.*/,
      `NETWORK=${networkName}`
    );

    // Write updated .env file
    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env file updated successfully!");

    // Create deployment summary
    const deploymentSummary = {
      network: networkName,
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      contracts: {
        squdyToken: {
          address: mockSqudyTokenAddress,
          name: tokenName,
          symbol: tokenSymbol,
          decimals: tokenDecimals.toString(),
          totalSupply: ethers.formatEther(totalSupply)
        },
        campaignManager: {
          address: squdyCampaignManagerAddress,
          campaignCount: campaignCount.toString(),
          deployerIsAdmin: hasAdminRole
        }
      },
      vrf: {
        coordinator: VRF_COORDINATOR,
        keyHash: KEY_HASH,
        subscriptionId: SUBSCRIPTION_ID
      },
      deploymentTime: new Date().toISOString()
    };

    // Save deployment summary
    const summaryPath = path.join(__dirname, "../deployment-summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(deploymentSummary, null, 2));
    console.log("📄 Deployment summary saved to:", summaryPath);

    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Copy the contract addresses to your frontend .env file");
    console.log("2. Update your admin wallet addresses in the .env file");
    console.log("3. Set up your social media API keys");
    console.log("4. Configure your email settings");
    console.log("5. Start your backend and frontend services");

    console.log("\n🔗 Contract Links:");
    const explorerBase = network.chainId === 97n 
      ? "https://testnet.bscscan.com" 
      : "https://bscscan.com";
    console.log(`SQUDY Token: ${explorerBase}/address/${mockSqudyTokenAddress}`);
    console.log(`Campaign Manager: ${explorerBase}/address/${squdyCampaignManagerAddress}`);

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 