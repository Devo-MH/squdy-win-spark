const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of Squdy Burn-to-Win Platform...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Network configuration
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network chain ID:", network.chainId);

  // BSC Testnet VRF Configuration
  const VRF_COORDINATOR = "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f"; // BSC Testnet
  const KEY_HASH = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314"; // BSC Testnet
  const SUBSCRIPTION_ID = 1; // You need to create a subscription on Chainlink VRF

  // BSC Mainnet VRF Configuration (uncomment for mainnet)
  // const VRF_COORDINATOR = "0xc587d9053cd1118f25F645F9E08BB98c9712A4EE"; // BSC Mainnet
  // const KEY_HASH = "0xba6e730de88d94a5510ae6613898bfb0c3de5d16e609c5b7da808abb1254c720"; // BSC Mainnet
  // const SUBSCRIPTION_ID = 1; // You need to create a subscription on Chainlink VRF

  // Deploy Mock SQUDY Token (for testing)
  console.log("\n📦 Deploying Mock SQUDY Token...");
  const MockSqudyToken = await ethers.getContractFactory("MockSqudyToken");
  const mockSqudyToken = await MockSqudyToken.deploy();
  await mockSqudyToken.deployed();
  console.log("✅ Mock SQUDY Token deployed to:", mockSqudyToken.address);

  // Deploy Squdy Campaign Manager
  console.log("\n📦 Deploying Squdy Campaign Manager...");
  const SqudyCampaignManager = await ethers.getContractFactory("SqudyCampaignManager");
  const squdyCampaignManager = await SqudyCampaignManager.deploy(
    mockSqudyToken.address,
    VRF_COORDINATOR,
    KEY_HASH,
    SUBSCRIPTION_ID
  );
  await squdyCampaignManager.deployed();
  console.log("✅ Squdy Campaign Manager deployed to:", squdyCampaignManager.address);

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
  console.log("   Total Supply:", ethers.utils.formatEther(totalSupply), "SQUDY");

  // Check campaign manager details
  const campaignCount = await squdyCampaignManager.getCampaignCount();
  const hasAdminRole = await squdyCampaignManager.hasRole(await squdyCampaignManager.ADMIN_ROLE(), deployer.address);
  
  console.log("📊 Campaign Manager Details:");
  console.log("   Campaign Count:", campaignCount.toString());
  console.log("   Deployer is Admin:", hasAdminRole);

  // Mint tokens to deployer for testing
  console.log("\n💰 Minting tokens to deployer for testing...");
  const mintAmount = ethers.utils.parseEther("1000000"); // 1 million tokens
  await mockSqudyToken.mint(deployer.address, mintAmount);
  console.log("✅ Minted", ethers.utils.formatEther(mintAmount), "SQUDY to deployer");

  // Create a test campaign
  console.log("\n🎯 Creating test campaign...");
  const testCampaignName = "Test Campaign";
  const testCampaignDescription = "A test campaign for deployment verification";
  const testImageUrl = "https://example.com/test-image.jpg";
  const testSoftCap = ethers.utils.parseEther("1000"); // 1000 SQUDY
  const testHardCap = ethers.utils.parseEther("10000"); // 10000 SQUDY
  const testTicketAmount = ethers.utils.parseEther("100"); // 100 SQUDY per ticket
  const testStartDate = Math.floor(Date.now() / 1000) + 3600; // Start in 1 hour
  const testEndDate = Math.floor(Date.now() / 1000) + 86400; // End in 24 hours
  const testPrizes = [
    "1st Place: 1000 USD",
    "2nd Place: 500 USD",
    "3rd Place: 250 USD"
  ];

  const tx = await squdyCampaignManager.createCampaign(
    testCampaignName,
    testCampaignDescription,
    testImageUrl,
    testSoftCap,
    testHardCap,
    testTicketAmount,
    testStartDate,
    testEndDate,
    testPrizes
  );
  
  const receipt = await tx.wait();
  console.log("✅ Test campaign created! Campaign ID: 1");

  // Deployment summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("=" .repeat(50));
  console.log("📋 Deployment Summary:");
  console.log("   Network:", network.chainId === 97 ? "BSC Testnet" : network.chainId === 56 ? "BSC Mainnet" : "Local");
  console.log("   Deployer:", deployer.address);
  console.log("   Mock SQUDY Token:", mockSqudyToken.address);
  console.log("   Campaign Manager:", squdyCampaignManager.address);
  console.log("   VRF Coordinator:", VRF_COORDINATOR);
  console.log("   Test Campaign ID: 1");
  console.log("=" .repeat(50));

  // Save deployment addresses
  const deploymentInfo = {
    network: network.chainId,
    deployer: deployer.address,
    mockSqudyToken: mockSqudyToken.address,
    squdyCampaignManager: squdyCampaignManager.address,
    vrfCoordinator: VRF_COORDINATOR,
    keyHash: KEY_HASH,
    subscriptionId: SUBSCRIPTION_ID,
    testCampaignId: 1
  };

  console.log("\n💾 Deployment info saved to deployment-info.json");
  require('fs').writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Instructions for next steps
  console.log("\n📝 Next Steps:");
  console.log("1. Fund the VRF subscription with LINK tokens");
  console.log("2. Add operators to the campaign manager");
  console.log("3. Activate the test campaign when ready");
  console.log("4. Test the staking functionality");
  console.log("5. Deploy to mainnet when ready");

  return {
    mockSqudyToken: mockSqudyToken.address,
    squdyCampaignManager: squdyCampaignManager.address
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 