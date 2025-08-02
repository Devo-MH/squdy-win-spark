const { ethers } = require("hardhat");
require("dotenv").config({ path: "./backend/.env" });

async function main() {
  console.log("🚀 Starting deployment of Squdy Burn-to-Win Platform on Sepolia...");

  // Get deployer account using ethers v6 syntax
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Network configuration
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network chain ID:", network.chainId);

  // VRF Configuration for Sepolia
  let VRF_COORDINATOR, KEY_HASH;
  if (network.chainId === 11155111n) { // Sepolia
    VRF_COORDINATOR = "0x50AE5Ea38517FD5918f3A5E6a8380acEB65F06b8";
    KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";
    console.log("🔗 Using Sepolia VRF Configuration");
  } else if (network.chainId === 1n) { // Ethereum Mainnet
    VRF_COORDINATOR = "0x271682DEB8C4E0901D1a1550aD2e64D568E69909";
    KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef";
    console.log("🔗 Using Ethereum Mainnet VRF Configuration");
  } else {
    throw new Error("Unsupported network. Please use Sepolia (11155111) or Ethereum Mainnet (1)");
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
    const networkName = network.chainId === 11155111n ? "sepolia" : "mainnet";
    envContent = envContent.replace(
      /NETWORK=.*/,
      `NETWORK=${networkName}`
    );

    // Update RPC URLs
    envContent = envContent.replace(
      /BSC_RPC_URL=.*/,
      `ETH_RPC_URL=https://sepolia.drpc.org`
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
    const explorerBase = network.chainId === 11155111n 
      ? "https://sepolia.etherscan.io" 
      : "https://etherscan.io";
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