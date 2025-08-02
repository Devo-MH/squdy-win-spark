const { ethers } = require("hardhat");
require("dotenv").config({ path: "./backend/.env" });

async function main() {
  console.log("🧪 Testing deployment environment...");

  // Check environment variables
  console.log("Environment check:");
  console.log("- PRIVATE_KEY:", process.env.PRIVATE_KEY ? "Set" : "Not set");
  console.log("- BSCSCAN_API_KEY:", process.env.BSCSCAN_API_KEY ? "Set" : "Not set");
  console.log("- BSC_TESTNET_RPC_URL:", process.env.BSC_TESTNET_RPC_URL || "Using default");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "BNB");

  // Check network
  const network = await ethers.provider.getNetwork();
  console.log("Network chain ID:", network.chainId);

  console.log("\n✅ Environment test completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 