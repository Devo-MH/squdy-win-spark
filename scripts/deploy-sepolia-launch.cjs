const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Sepolia Launch Deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH");

  if (balance.lt(ethers.utils.parseEther("0.1"))) {
    console.log("⚠️  Low balance! Get Sepolia ETH from faucet: https://sepoliafaucet.com/");
    console.log("💡 You need at least 0.1 Sepolia ETH for deployment");
  }

  console.log("\n🪙 Deploying MockSqudyToken...");
  
  // Deploy Mock SQUDY Token first
  const SimpleMockSqudyToken = await ethers.getContractFactory("SimpleMockSqudyToken");
  const mockSqudyToken = await SimpleMockSqudyToken.deploy();
  await mockSqudyToken.deployed();

  console.log("✅ SimpleMockSqudyToken deployed to:", mockSqudyToken.address);
  console.log("🔗 View on Sepolia Etherscan:", `https://sepolia.etherscan.io/address/${mockSqudyToken.address}`);

  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await mockSqudyToken.deployTransaction.wait(3);

  console.log("\n🏆 Deploying SimpleSqudyCampaignManager...");
  
  // Deploy Campaign Manager
  const SimpleSqudyCampaignManager = await ethers.getContractFactory("SimpleSqudyCampaignManager");
  const campaignManager = await SimpleSqudyCampaignManager.deploy(
    mockSqudyToken.address
  );
  await campaignManager.deployed();

  console.log("✅ SimpleSqudyCampaignManager deployed to:", campaignManager.address);
  console.log("🔗 View on Sepolia Etherscan:", `https://sepolia.etherscan.io/address/${campaignManager.address}`);

  // Wait for confirmations
  await campaignManager.deployTransaction.wait(3);

  console.log("\n🎉 Deployment Complete!");
  console.log("=" + "=".repeat(50));
  console.log("📄 DEPLOYMENT SUMMARY");
  console.log("=" + "=".repeat(50));
  console.log(`MockSqudyToken: ${mockSqudyToken.address}`);
  console.log(`CampaignManager: ${campaignManager.address}`);
  console.log(`Network: Sepolia Testnet`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Gas Used: Check transactions on Etherscan`);
  
  console.log("\n🔧 Next Steps:");
  console.log("1. Verify contracts on Etherscan");
  console.log("2. Update frontend environment variables");
  console.log("3. Test the complete user flow");
  
  console.log("\n📋 Environment Variables for Frontend:");
  console.log(`VITE_SQUDY_TOKEN_ADDRESS=${mockSqudyToken.address}`);
  console.log(`VITE_CAMPAIGN_MANAGER_ADDRESS=${campaignManager.address}`);
  console.log(`VITE_NETWORK_ID=11155111`);
  console.log(`VITE_NETWORK_NAME=sepolia`);

  // Create deployment info file
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    contracts: {
      mockSqudyToken: {
        address: mockSqudyToken.address,
        txHash: mockSqudyToken.deployTransaction.hash
      },
      campaignManager: {
        address: campaignManager.address,
        txHash: campaignManager.deployTransaction.hash
      }
    },
    timestamp: new Date().toISOString(),
    etherscanUrls: {
      mockSqudyToken: `https://sepolia.etherscan.io/address/${mockSqudyToken.address}`,
      campaignManager: `https://sepolia.etherscan.io/address/${campaignManager.address}`
    }
  };

  // Save deployment info
  const fs = require('fs');
  fs.writeFileSync(
    'deployment-sepolia.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployment-sepolia.json");
  return deploymentInfo;
}

main()
  .then((deploymentInfo) => {
    console.log("\n🎊 SEPOLIA DEPLOYMENT SUCCESSFUL! 🎊");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });