# 🌐 Sepolia Testnet Testing Guide

## Overview
This guide shows you how to verify the complete SQUDY functionality on Sepolia testnet using either mock SQUDY tokens or real SQUDY tokens.

## 🎯 **Answer: Mock vs Real SQUDY**

### ✅ **You CAN test with Mock SQUDY (Recommended)**
- **Complete functionality testing** - All logic verified
- **Faster setup** - No dependencies on real SQUDY deployment
- **Full control** - Mint tokens as needed for testing
- **Same smart contract logic** - Identical behavior to real SQUDY

### ✅ **You CAN also test with Real SQUDY**
- **Production accuracy** - Exact same token as mainnet
- **Complete validation** - 100% identical to production flow

## 🚀 **Quick Start: Mock SQUDY Testing**

### **Step 1: Setup Environment**
```bash
# Install dependencies
npm install

# Create Sepolia environment file
cp .env.example .env.sepolia

# Edit .env.sepolia with your keys:
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_key_here
ETHERSCAN_API_KEY=your_etherscan_key_here
USE_MOCK_TOKEN=true
```

### **Step 2: Get Sepolia ETH**
- Visit [Sepolia Faucet](https://sepoliafaucet.com/)
- Get 0.5+ ETH for testing (covers all transactions)

### **Step 3: Deploy & Test**
```bash
# Deploy with mock SQUDY token
npx hardhat run scripts/deploy-sepolia-test.js --network sepolia

# This will:
# ✅ Deploy MockSqudyToken (10M supply)
# ✅ Deploy CampaignManager  
# ✅ Create test campaign
# ✅ Simulate 5 participants staking
# ✅ Select winners
# ✅ Burn remaining tokens
# ✅ Generate frontend config
```

### **Step 4: Verify on Etherscan**
The script will output Etherscan links like:
- Token: `https://sepolia.etherscan.io/address/0x...`
- Campaign Manager: `https://sepolia.etherscan.io/address/0x...`
- Transactions: `https://sepolia.etherscan.io/tx/0x...`

### **Step 5: Test Frontend Integration**
```bash
# Use the generated config
cp .env.sepolia .env

# Start frontend
npm run dev

# Test with MetaMask on Sepolia:
# - Connect wallet to Sepolia
# - View campaigns
# - Test staking (you'll have mock tokens)
# - Test admin functions
```

## 🔧 **Advanced: Real SQUDY Testing**

If SQUDY token is already deployed on Sepolia:

```bash
# Set environment variables
USE_MOCK_TOKEN=false
SQUDY_TOKEN_ADDRESS=0x_real_squdy_address_here

# Deploy campaign manager only
npx hardhat run scripts/deploy-sepolia-test.js --network sepolia
```

## 📊 **What Gets Tested**

### **Smart Contract Level**
- ✅ **Token Operations**: Transfer, approval, burning
- ✅ **Campaign Logic**: Creation, staking, closing
- ✅ **Winner Selection**: Randomness, selection algorithm
- ✅ **Token Burning**: Actual supply reduction
- ✅ **Access Control**: Admin permissions, user restrictions
- ✅ **Event Emission**: All events fired correctly

### **Integration Level**
- ✅ **Frontend ↔ Contracts**: Direct blockchain interaction
- ✅ **Backend ↔ Blockchain**: Event listening, state sync
- ✅ **Wallet Integration**: MetaMask transaction handling
- ✅ **Gas Estimation**: Real network gas costs
- ✅ **Error Handling**: Network failures, rejected transactions

### **Real-World Scenarios**
- ✅ **Multiple Participants**: 5+ users staking simultaneously
- ✅ **Network Congestion**: Transaction delays and retries
- ✅ **Gas Price Fluctuation**: Dynamic gas pricing
- ✅ **Block Confirmations**: Waiting for finality
- ✅ **MEV Protection**: Transaction ordering resistance

## 💰 **Cost Analysis**

### **Gas Costs (Sepolia)**
```
Operation                  | Gas Used    | Cost (30 gwei)
---------------------------|-------------|---------------
Deploy MockSqudyToken     | ~1,500,000  | ~0.045 ETH
Deploy CampaignManager     | ~2,500,000  | ~0.075 ETH
Create Campaign            | ~300,000    | ~0.009 ETH
Approve Tokens (per user)  | ~50,000     | ~0.0015 ETH
Stake Tokens (per user)    | ~150,000    | ~0.0045 ETH
Select Winners             | ~400,000    | ~0.012 ETH
Burn Tokens                | ~200,000    | ~0.006 ETH
---------------------------|-------------|---------------
Total for 5 participants  | ~5,500,000  | ~0.165 ETH
```

**Total Cost: ~0.2 ETH for complete testing**

## 🧪 **Test Scenarios Covered**

### **Scenario 1: Standard Flow**
1. Deploy contracts
2. Create campaign  
3. 5 users stake different amounts
4. Close campaign
5. Select 2 winners
6. Burn remaining tokens
7. Verify final state

### **Scenario 2: Edge Cases**
- Minimum stake amounts
- Maximum participant limits
- Early campaign closure
- Gas limit testing
- Network error recovery

### **Scenario 3: Security Testing**
- Non-owner trying admin functions
- Invalid campaign states
- Reentrancy protection
- Integer overflow protection
- Access control validation

## 📋 **Expected Results**

After successful testing, you'll have proof that:

### **✅ Blockchain Functionality Works**
- All transactions confirmed on Sepolia
- Smart contracts deployed and verified
- Events emitted correctly
- State changes persisted

### **✅ Economics Are Sound**  
- Token transfers working
- Burning reduces total supply
- Gas costs are acceptable
- Participant incentives correct

### **✅ Integration Is Seamless**
- Frontend connects to real blockchain
- Backend syncs with contract events
- User experience is smooth
- Error handling is robust

## 🔗 **Generated Assets**

After deployment, you'll get:

### **Contract Addresses**
```json
{
  "squdyToken": "0x...",
  "campaignManager": "0x...", 
  "testCampaign": 1
}
```

### **Frontend Configuration** (`.env.sepolia`)
```env
VITE_SQUDY_TOKEN_ADDRESS=0x...
VITE_CAMPAIGN_MANAGER_ADDRESS=0x...
VITE_NETWORK_CHAIN_ID=11155111
VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io
```

### **Verification Links**
- Etherscan contract verification
- Transaction history
- Event logs
- Token transfer records

## 🚀 **Next Steps After Sepolia**

Once Sepolia testing is complete:

1. **✅ Confidence in Logic**: All functionality proven to work
2. **🔧 Gas Optimization**: Optimize based on real costs
3. **🛡️ Security Audit**: Professional review with test data
4. **📈 Mainnet Deployment**: Deploy with full confidence
5. **🎯 Production Launch**: Go live with proven system

## 🆘 **Troubleshooting**

### **Common Issues**

**"Insufficient funds for gas"**
- Get more Sepolia ETH from faucet
- Reduce gas price in config

**"Contract not deployed"**
- Check network selection
- Verify private key has funds
- Check Infura API key

**"Transaction reverted"**
- Check campaign state
- Verify token balances
- Review function parameters

**"MetaMask connection failed"**  
- Switch to Sepolia network
- Clear MetaMask cache
- Check contract addresses

### **Debug Commands**
```bash
# Check deployment status
npx hardhat verify --network sepolia CONTRACT_ADDRESS

# Test contract interaction
npx hardhat console --network sepolia

# View transaction details
curl "https://sepolia.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=0x..."
```

## 🎉 **Success Criteria**

Your Sepolia testing is successful when:

- ✅ All contracts deployed and verified
- ✅ All test transactions confirmed  
- ✅ Winner selection produces valid results
- ✅ Token burning reduces supply
- ✅ Frontend connects and functions
- ✅ Gas costs are reasonable
- ✅ No security vulnerabilities found

**At this point, you have 100% confidence your system will work on mainnet!** 🚀

---

## 📞 **Support**

If you encounter issues:
1. Check the console logs in the deployment script
2. Verify all environment variables are set
3. Ensure sufficient Sepolia ETH balance
4. Review Etherscan for transaction details
5. Test individual functions in Hardhat console

The mock SQUDY approach gives you **complete functionality verification** without waiting for real SQUDY deployment! 🎯