const { ethers } = require("ethers");
require("dotenv").config({ path: "./backend/.env" });

async function main() {
  console.log("🧪 Testing private key...");

  // Check if private key is loaded
  console.log("Private key loaded:", process.env.PRIVATE_KEY ? "Yes" : "No");
  
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ Private key not found in environment variables");
    return;
  }

  try {
    // Create a wallet from the private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    console.log("✅ Wallet created successfully");
    console.log("Wallet address:", wallet.address);

    // Create a provider for Sepolia testnet
    const provider = new ethers.JsonRpcProvider("https://sepolia.drpc.org");
    console.log("✅ Provider created successfully");

    // Connect wallet to provider
    const connectedWallet = wallet.connect(provider);
    console.log("✅ Wallet connected to provider");

    // Get balance
    const balance = await connectedWallet.provider.getBalance(wallet.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      console.log("⚠️  Warning: Wallet has 0 ETH balance. You need ETH for deployment.");
    } else {
      console.log("✅ Wallet has sufficient balance for deployment");
    }

    console.log("\n✅ Private key test completed successfully!");

  } catch (error) {
    console.error("❌ Private key test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 