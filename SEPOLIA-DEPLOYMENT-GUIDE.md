# 🚀 Sepolia Deployment Guide

## ✅ Prerequisites Checklist

### 1. 🔑 Private Key Setup
- [ ] Export your wallet private key (MetaMask → Account Details → Export Private Key)
- [ ] Copy the key WITHOUT the `0x` prefix
- [ ] Add it to `backend/.env` file:
```bash
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

### 2. 💰 Get Sepolia ETH
You need at least **0.01 ETH** on Sepolia for deployment.

**Free Sepolia Faucets:**
- 🚰 **Primary**: https://sepolia-faucet.pk910.de/
- 🚰 **Backup**: https://sepoliafaucet.com/
- 🚰 **Alternative**: https://www.infura.io/faucet/sepolia

**Steps:**
1. Connect your wallet to the faucet
2. Request Sepolia ETH
3. Wait for confirmation (usually 1-2 minutes)
4. Check balance in MetaMask (switch to Sepolia network)

### 3. 🌐 Network Configuration
Our `hardhat.config.cjs` is already configured for Sepolia:
```javascript
"sepolia": {
  url: "https://sepolia.drpc.org",
  accounts: [process.env.PRIVATE_KEY],
  chainId: 11155111,
  gasPrice: 20000000000, // 20 gwei
}
```

## 🚀 Deployment Steps

### Step 1: Verify Environment
```bash
# Check if backend/.env exists and has PRIVATE_KEY
cat backend/.env | grep PRIVATE_KEY
```

### Step 2: Check Account Balance
```bash
# Create a quick balance check
npx hardhat console --network sepolia
# Then run:
# const [signer] = await ethers.getSigners();
# console.log("Address:", await signer.getAddress());
# console.log("Balance:", await ethers.provider.getBalance(await signer.getAddress()));
```

### Step 3: Deploy Contracts
```bash
# Deploy the automated system to Sepolia
npx hardhat run scripts/deploy-automated-mainnet.cjs --network sepolia
```

### Step 4: Verify Deployment
After successful deployment, you'll see:
```
🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉
===============================================
📅 Deployment Time: 2025-XX-XX...
🌐 Network: sepolia (Chain ID: 11155111)
👤 Deployer: 0x...

📋 CONTRACT ADDRESSES:
🪙 SQUDY Token: 0x...
🎯 Campaign Manager: 0x...

🔗 EXPLORER LINKS:
   Token: https://sepolia.etherscan.io/address/0x...
   Campaign Manager: https://sepolia.etherscan.io/address/0x...
```

## 📁 Generated Files

After deployment, these files will be created:
- `deployment-automated.json` - Full deployment details
- `backend/.env.automated` - Environment variables for backend

## 🔄 Update Frontend

Copy the contract addresses from deployment output and update:

1. **Vercel Environment Variables:**
```bash
# In Vercel dashboard, add:
VITE_SQUDY_TOKEN_ADDRESS=0x... (from deployment)
VITE_CAMPAIGN_MANAGER_ADDRESS=0x... (from deployment)
```

2. **Local Development:**
```bash
# Add to your local .env:
VITE_SQUDY_TOKEN_ADDRESS=0x...
VITE_CAMPAIGN_MANAGER_ADDRESS=0x...
```

## 🧪 Test Deployment

### Test Script
```bash
# Run comprehensive tests
npx hardhat run scripts/test-automated-system.cjs --network sepolia
```

### Manual Testing
1. **Visit Sepolia Etherscan** and verify contracts
2. **Connect frontend** to Sepolia network
3. **Test token functions** (get test tokens, stake, etc.)
4. **Create test campaign** using admin account

## 🚨 Troubleshooting

### Error: "Cannot read properties of undefined (reading 'address')"
**Solution:** Private key is not set correctly in `backend/.env`

### Error: "Insufficient funds"
**Solution:** Get more Sepolia ETH from faucets

### Error: "Network not configured"
**Solution:** Check `hardhat.config.cjs` Sepolia configuration

### Error: "Compilation failed"
**Solution:** Contracts are fixed, this shouldn't happen

## 📞 Support

If deployment fails:
1. Check the error message
2. Verify private key format (no 0x prefix)
3. Confirm Sepolia ETH balance
4. Try different Sepolia RPC URL

## 🎯 After Successful Deployment

1. ✅ Update Vercel environment variables
2. ✅ Test on Sepolia network
3. ✅ Create first test campaign
4. ✅ Verify automated winner selection works
5. ✅ Plan mainnet deployment strategy

---

**Ready to deploy?** Run: `npx hardhat run scripts/deploy-automated-mainnet.cjs --network sepolia`