const { ethers } = require("ethers");

async function main() {
  console.log("🔑 Generating new wallet for testing...");
  
  // Generate a random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log("\n🎯 NEW WALLET GENERATED");
  console.log("=" + "=".repeat(40));
  console.log(`Address: ${wallet.address}`);
  console.log(`Private Key: ${wallet.privateKey}`);
  console.log(`Mnemonic: ${wallet.mnemonic.phrase}`);
  
  console.log("\n⚠️  SECURITY WARNING:");
  console.log("- This is for TESTING ONLY on Sepolia testnet");
  console.log("- NEVER use this wallet on mainnet");
  console.log("- NEVER store real funds in this wallet");
  
  console.log("\n📋 Next Steps:");
  console.log("1. Add this address to MetaMask (import account with private key)");
  console.log("2. Get Sepolia ETH from https://sepoliafaucet.com/");
  console.log("3. Add private key to .env file:");
  console.log(`   PRIVATE_KEY=${wallet.privateKey}`);
  
  console.log("\n🔗 Quick Links:");
  console.log(`- Add to MetaMask: ${wallet.address}`);
  console.log(`- Sepolia Faucet: https://sepoliafaucet.com/`);
  console.log(`- Sepolia Explorer: https://sepolia.etherscan.io/address/${wallet.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });