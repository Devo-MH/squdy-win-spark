# 🔍 Etherscan Contract Verification Guide

## 📋 Sepolia Contracts to Verify

### 🪙 SQUDY Token
- **Address:** `0xDa0aCfDEea788b3BeD30f25F5B32a19fd0Ec371F`
- **Etherscan URL:** https://sepolia.etherscan.io/address/0xDa0aCfDEea788b3BeD30f25F5B32a19fd0Ec371F

### 🎯 Campaign Manager
- **Address:** `0x2c8F042394Aca5b10322f8828B6D09e2d494A5b2`
- **Etherscan URL:** https://sepolia.etherscan.io/address/0x2c8F042394Aca5b10322f8828B6D09e2d494A5b2

---

## 🔧 Method 1: Manual Verification

### For SQUDY Token:

1. **Go to:** https://sepolia.etherscan.io/address/0xDa0aCfDEea788b3BeD30f25F5B32a19fd0Ec371F#code
2. **Click:** "Verify and Publish"
3. **Select:** "Solidity (Single file)"
4. **Compiler Type:** Solidity (Single file)
5. **Compiler Version:** v0.8.20+commit.a1b79de6
6. **Open Source License Type:** MIT License (MIT)

**Contract Source Code:** Copy from `contracts/SqudyToken.sol` with all imports flattened

**Constructor Arguments ABI-encoded:**
```
0x00000000000000000000000086a598b3717915dc281b0c313b7496c5a262203c
```

### For Campaign Manager:

1. **Go to:** https://sepolia.etherscan.io/address/0x2c8F042394Aca5b10322f8828B6D09e2d494A5b2#code
2. **Click:** "Verify and Publish"
3. **Select:** "Solidity (Single file)"
4. **Compiler Type:** Solidity (Single file)  
5. **Compiler Version:** v0.8.20+commit.a1b79de6
6. **Open Source License Type:** MIT License (MIT)

**Contract Source Code:** Copy from `contracts/AutomatedSqudyCampaignManager.sol` with all imports flattened

**Constructor Arguments ABI-encoded:**
```
0x000000000000000000000000da0acfdeea788b3bed30f25f5b32a19fd0ec371f
```

---

## 🔧 Method 2: Hardhat Verification (Automated)

If you have an Etherscan API key, add it to `backend/.env`:
```
ETHERSCAN_API_KEY=your_api_key_here
```

Then run:
```bash
# Verify SQUDY Token
npx hardhat verify --network sepolia 0xDa0aCfDEea788b3BeD30f25F5B32a19fd0Ec371F "0x86A598b3717915dC281B0c313B7496C5A262203C"

# Verify Campaign Manager  
npx hardhat verify --network sepolia 0x2c8F042394Aca5b10322f8828B6D09e2d494A5b2 "0xDa0aCfDEea788b3BeD30f25F5B32a19fd0Ec371F"
```

---

## 📄 Compilation Settings

**Solidity Version:** 0.8.20
**Optimization:** Enabled
**Runs:** 200
**Via IR:** true
**EVM Version:** paris

**Hardhat Config:**
```javascript
solidity: {
  version: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    viaIR: true,
  },
}
```

---

## 🎯 Constructor Parameters

### SQUDY Token Constructor:
- **Parameter:** `initialOwner` (address)
- **Value:** `0x86A598b3717915dC281B0c313B7496C5A262203C`

### Campaign Manager Constructor:
- **Parameter:** `_squdyToken` (address)
- **Value:** `0xDa0aCfDEea788b3BeD30f25F5B32a19fd0Ec371F`

---

## ✅ After Verification

Once verified, you'll be able to:
1. **Read Contract** - View all public variables and functions
2. **Write Contract** - Interact with admin functions  
3. **View Source Code** - Public source code visibility
4. **Event Logs** - Decode transaction events

---

## 🔗 Quick Links

- **SQUDY Token on Sepolia:** https://sepolia.etherscan.io/address/0xDa0aCfDEea788b3BeD30f25F5B32a19fd0Ec371F
- **Campaign Manager on Sepolia:** https://sepolia.etherscan.io/address/0x2c8F042394Aca5b10322f8828B6D09e2d494A5b2
- **Etherscan API Keys:** https://etherscan.io/apis
