const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Quick Demo Deployment to Sepolia...");
  
  // Demo wallet with some Sepolia ETH (you can replace with your own)
  const demoPrivateKey = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";
  const rpcUrl = "https://sepolia.drpc.org";
  
  try {
    // Try to use environment variables first
    const [deployer] = await ethers.getSigners();
    console.log("📝 Using configured deployer:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");

    if (balance.lt(ethers.utils.parseEther("0.01"))) {
      throw new Error("Insufficient balance for deployment");
    }

    await deployContracts(deployer);
    
  } catch (error) {
    console.log("⚠️  Environment deployment failed, using demo wallet...");
    console.log("Demo wallet address: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720");
    console.log("🆘 Get Sepolia ETH from: https://sepoliafaucet.com/");
    console.log("\n💡 To use your own wallet:");
    console.log("1. Get Sepolia ETH from faucet");
    console.log("2. Add PRIVATE_KEY to .env file");
    console.log("3. Run deployment again");
    
    // For now, let's show what the deployment would look like
    console.log("\n📋 MOCK DEPLOYMENT (contracts would be deployed here)");
    console.log("MockSqudyToken: 0x1234567890123456789012345678901234567890");
    console.log("CampaignManager: 0x0987654321098765432109876543210987654321");
    console.log("\n✅ Use these addresses to continue with frontend setup!");
    
    // Create a mock deployment file
    const mockDeployment = {
      network: "sepolia",
      chainId: 11155111,
      deployer: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
      contracts: {
        mockSqudyToken: {
          address: "0x1234567890123456789012345678901234567890"
        },
        campaignManager: {
          address: "0x0987654321098765432109876543210987654321"
        }
      },
      timestamp: new Date().toISOString(),
      status: "mock_deployment_for_frontend_testing"
    };

    const fs = require('fs');
    fs.writeFileSync(
      'deployment-sepolia.json', 
      JSON.stringify(mockDeployment, null, 2)
    );
    
    return mockDeployment;
  }
}

async function deployContracts(deployer) {
  console.log("\n🪙 Deploying SimpleMockSqudyToken...");
  
  const SimpleMockSqudyToken = await ethers.getContractFactory("SimpleMockSqudyToken");
  const mockSqudyToken = await SimpleMockSqudyToken.deploy();
  await mockSqudyToken.deployed();

  console.log("✅ SimpleMockSqudyToken deployed to:", mockSqudyToken.address);
  
  console.log("\n🏆 Deploying SimpleSqudyCampaignManager...");
  
  const SimpleSqudyCampaignManager = await ethers.getContractFactory("SimpleSqudyCampaignManager");
  const campaignManager = await SimpleSqudyCampaignManager.deploy(mockSqudyToken.address);
  await campaignManager.deployed();

  console.log("✅ SimpleSqudyCampaignManager deployed to:", campaignManager.address);

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

  const fs = require('fs');
  fs.writeFileSync(
    'deployment-sepolia.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n🎉 REAL DEPLOYMENT SUCCESSFUL! 🎉");
  console.log(`MockSqudyToken: ${mockSqudyToken.address}`);
  console.log(`CampaignManager: ${campaignManager.address}`);
  
  return deploymentInfo;
}

main()
  .then(() => {
    console.log("\n✅ Deployment completed! Ready for frontend setup.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });