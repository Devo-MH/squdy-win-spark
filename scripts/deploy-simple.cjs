const { ethers } = require("hardhat");
require("dotenv").config({ path: "./backend/.env" });

async function main() {
  console.log("🚀 Starting deployment of Squdy Burn-to-Win Platform on Sepolia...");

  // Create provider and wallet manually
  const provider = new ethers.JsonRpcProvider("https://sepolia.drpc.org");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("📝 Deploying contracts with account:", wallet.address);
  console.log("💰 Account balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH");

  // Network configuration
  const network = await provider.getNetwork();
  console.log("🌐 Network chain ID:", network.chainId);

  try {
    // Deploy Mock SQUDY Token
    console.log("\n📦 Deploying Mock SQUDY Token...");
    const MockSqudyToken = await ethers.getContractFactory("MockSqudyToken", wallet);
    const mockSqudyToken = await MockSqudyToken.deploy();
    await mockSqudyToken.waitForDeployment();
    const mockSqudyTokenAddress = await mockSqudyToken.getAddress();
    console.log("✅ Mock SQUDY Token deployed to:", mockSqudyTokenAddress);

    // Deploy Squdy Campaign Manager (no VRF parameters needed)
    console.log("\n📦 Deploying Squdy Campaign Manager...");
    const SqudyCampaignManager = await ethers.getContractFactory("SqudyCampaignManager", wallet);
    const squdyCampaignManager = await SqudyCampaignManager.deploy(mockSqudyTokenAddress);
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
    const hasAdminRole = await squdyCampaignManager.hasRole(await squdyCampaignManager.ADMIN_ROLE(), wallet.address);
    
    console.log("📊 Campaign Manager Details:");
    console.log("   Campaign Count:", campaignCount.toString());
    console.log("   Deployer is Admin:", hasAdminRole);

    // Mint tokens to deployer for testing
    console.log("\n💰 Minting tokens to deployer for testing...");
    const mintAmount = ethers.parseEther("1000000"); // 1 million tokens
    await mockSqudyToken.mint(wallet.address, mintAmount);
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
      `ADMIN_WALLETS=${wallet.address}`
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
      deployer: wallet.address,
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