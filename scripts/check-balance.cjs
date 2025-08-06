const { ethers } = require("hardhat");

async function main() {
  try {
    const [deployer] = await ethers.getSigners();
    const provider = ethers.provider;
    const balance = await provider.getBalance(deployer.address);
    
    console.log("📋 Account Information:");
    console.log("Address:", deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
    
    const minimumRequired = ethers.parseEther("0.01"); // 0.01 ETH minimum
    
    if (balance >= minimumRequired) {
      console.log("✅ Sufficient balance for deployment");
    } else {
      console.log("❌ Insufficient balance. Need at least 0.01 ETH");
      console.log("🚰 Get Sepolia ETH from:");
      console.log("   https://sepolia-faucet.pk910.de/");
      console.log("   https://sepoliafaucet.com/");
    }
  } catch (error) {
    console.error("❌ Error checking balance:", error.message);
  }
}

main().catch(console.error);