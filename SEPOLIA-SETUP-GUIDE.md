# 🚀 Sepolia Launch Setup Guide (TODAY)

## Step 1: Get Sepolia ETH (FREE)

### Option 1: Alchemy Faucet (Fastest)
1. Go to https://sepoliafaucet.com/
2. Connect your MetaMask wallet 
3. Request 0.5 Sepolia ETH (free)

### Option 2: Chainlink Faucet
1. Go to https://faucets.chain.link/sepolia
2. Connect wallet and request ETH

### Option 3: Quick Burner Wallet (If you don't have MetaMask)
```bash
# Generate a new wallet for testing
npx hardhat run scripts/generate-wallet.js
```

## Step 2: Set Environment Variables

Create `.env` file in project root:
```env
# Get this from wallet (Account Details > Export Private Key)
PRIVATE_KEY=your_private_key_here

# Free RPC (no signup needed)
SEPOLIA_RPC_URL=https://sepolia.drpc.org

# Or use Alchemy (free tier)
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
```

## Step 3: Deploy to Sepolia
```bash
npx hardhat run scripts/deploy-sepolia-launch.cjs --network sepolia
```

## Step 4: Update Frontend
After deployment, update `.env` with contract addresses:
```env
VITE_SQUDY_TOKEN_ADDRESS=0x...  # From deployment output
VITE_CAMPAIGN_MANAGER_ADDRESS=0x...  # From deployment output
VITE_NETWORK_ID=11155111
```

## Quick Checklist
- [ ] Have MetaMask installed
- [ ] Added Sepolia network to MetaMask
- [ ] Have 0.1+ Sepolia ETH in wallet
- [ ] Created .env file with PRIVATE_KEY
- [ ] Ready to deploy!

## Emergency: No Sepolia ETH Available?
If faucets are down, I can deploy using a demo wallet and share the addresses with you immediately!