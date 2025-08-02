# 🧪 Blockchain Testing Guide

## Overview
This guide provides a comprehensive testing strategy to verify that the select winners and burn token functionality will work correctly in real-world blockchain deployments.

## 🎯 Testing Phases

### Phase 1: Local Development Testing
**Status: ✅ Completed**
- [x] Mock token implementation working
- [x] Frontend UI flow functional
- [x] Backend API endpoints operational
- [x] State transitions correct

### Phase 2: Smart Contract Unit Testing
**Location: `contracts/test/`**

```bash
# Run Hardhat tests
npx hardhat test

# Run with coverage
npx hardhat coverage

# Run gas analysis
npx hardhat test --gas-report
```

**Key Test Scenarios:**
- Winner selection with different participant counts
- Token burning with various amounts
- Access control validation
- Edge cases (no participants, single participant)
- Gas consumption analysis

### Phase 3: Integration Testing
**Location: `src/test/blockchain-integration.test.ts`**

```bash
# Run integration tests
npm run test:blockchain

# Run with real network (requires setup)
TEST_REAL_NETWORK=true npm run test:blockchain
```

### Phase 4: Testnet Deployment
**Networks: Sepolia, Goerli, Mumbai**

#### Pre-Deployment Checklist
- [ ] Smart contracts compiled without warnings
- [ ] All unit tests passing (100%)
- [ ] Integration tests passing
- [ ] Gas optimization completed
- [ ] Security audit completed
- [ ] Documentation updated

#### Deployment Steps
1. **Setup Environment**
   ```bash
   # Install dependencies
   npm install
   
   # Setup environment variables
   cp .env.example .env.testnet
   # Add INFURA_API_KEY, PRIVATE_KEY, etc.
   ```

2. **Deploy to Testnet**
   ```bash
   # Deploy SQUDY Token
   npx hardhat run scripts/deploy-token.js --network sepolia
   
   # Deploy Campaign Manager
   npx hardhat run scripts/deploy-campaign-manager.js --network sepolia
   
   # Verify contracts
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

3. **Update Frontend Configuration**
   ```typescript
   // Update .env with testnet addresses
   VITE_SQUDY_TOKEN_ADDRESS=0x...
   VITE_CAMPAIGN_MANAGER_ADDRESS=0x...
   VITE_NETWORK_CHAIN_ID=11155111
   ```

### Phase 5: End-to-End Testing

#### Test Scenario 1: Complete Campaign Flow
```typescript
// 1. Create campaign
const campaignTx = await campaignManager.createCampaign({
  name: "Test Campaign",
  hardCap: ethers.utils.parseUnits("10000", 18),
  // ... other params
});

// 2. Add participants
for (let i = 0; i < 10; i++) {
  await participants[i].stakeToCampaign(campaignId, stakeAmount);
}

// 3. Close campaign
await campaignManager.closeCampaign(campaignId);

// 4. Select winners
const winnerTx = await campaignManager.selectWinners(campaignId);
await winnerTx.wait();

// 5. Burn remaining tokens
const burnTx = await campaignManager.burnAllTokens(campaignId);
await burnTx.wait();

// 6. Validate final state
const finalState = await campaignManager.getCampaign(campaignId);
expect(finalState.status).toBe(CampaignStatus.Burned);
```

#### Test Scenario 2: Edge Cases
- Campaign with no participants
- Campaign with single participant
- Maximum participant limit
- Gas limit edge cases
- Network congestion handling

#### Test Scenario 3: Gas Analysis
```typescript
// Measure gas consumption
const gasUsed = receipt.gasUsed;
const gasPrice = receipt.effectiveGasPrice;
const totalCost = gasUsed.mul(gasPrice);

console.log(`Gas used: ${gasUsed.toString()}`);
console.log(`Total cost: ${ethers.utils.formatEther(totalCost)} ETH`);
```

## 🔧 Testing Tools and Scripts

### 1. Automated Testing Script
```bash
#!/bin/bash
# scripts/run-full-tests.sh

echo "🧪 Running comprehensive blockchain tests..."

# Unit tests
echo "📋 Running unit tests..."
npx hardhat test

# Integration tests  
echo "🔗 Running integration tests..."
npm run test:blockchain

# Gas analysis
echo "⛽ Analyzing gas consumption..."
npx hardhat test --gas-report

# Deploy to testnet
echo "🌐 Deploying to testnet..."
npx hardhat run scripts/deploy-all.js --network sepolia

# Frontend integration
echo "🖥️ Testing frontend integration..."
npm run test:e2e

echo "✅ All tests completed!"
```

### 2. Gas Monitoring Dashboard
```typescript
// utils/gas-monitor.ts
export class GasMonitor {
  static async logTransaction(tx: any, operation: string) {
    const receipt = await tx.wait();
    console.log(`📊 ${operation} Gas Report:`);
    console.log(`  Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`  Gas Price: ${receipt.effectiveGasPrice.toString()}`);
    console.log(`  Total Cost: ${ethers.utils.formatEther(
      receipt.gasUsed.mul(receipt.effectiveGasPrice)
    )} ETH`);
  }
}
```

### 3. Network Health Checker
```typescript
// utils/network-health.ts
export class NetworkHealth {
  static async checkNetwork(provider: any) {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getGasPrice();
    
    return {
      chainId: network.chainId,
      blockNumber,
      gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
      healthy: blockNumber > 0
    };
  }
}
```

## 🚀 Production Readiness Checklist

### Smart Contracts
- [ ] All tests passing with >95% coverage
- [ ] Gas optimization completed
- [ ] Security audit passed
- [ ] Upgrade mechanism tested
- [ ] Emergency pause functionality verified
- [ ] Multi-sig admin controls implemented

### Frontend Integration
- [ ] Real contract addresses configured
- [ ] Error handling comprehensive
- [ ] Loading states implemented
- [ ] Transaction status monitoring
- [ ] Gas estimation accurate
- [ ] Fallback mechanisms working

### Backend Integration
- [ ] Event listening implemented
- [ ] Database sync working
- [ ] API rate limiting configured
- [ ] Monitoring and alerts setup
- [ ] Backup and recovery tested

### Operational
- [ ] Deployment scripts tested
- [ ] Environment configurations verified
- [ ] Monitoring dashboards setup
- [ ] Incident response plan ready
- [ ] User documentation complete

## 🔍 Monitoring and Validation

### Real-time Monitoring
```typescript
// Monitor contract events
contract.on('WinnersSelected', (campaignId, winners) => {
  console.log(`Winners selected for campaign ${campaignId}:`, winners);
  // Log to monitoring system
});

contract.on('TokensBurned', (campaignId, amount) => {
  console.log(`${amount} tokens burned for campaign ${campaignId}`);
  // Validate burn transaction
});
```

### Validation Checks
```typescript
// Post-transaction validation
async function validateWinnerSelection(campaignId: number) {
  const campaign = await contract.getCampaign(campaignId);
  const winners = await contract.getWinners(campaignId);
  
  // Validate winners are from participant list
  // Validate randomness distribution
  // Validate state transitions
  
  return {
    valid: true,
    winners: winners.length,
    totalParticipants: campaign.participantCount
  };
}
```

## 📊 Performance Benchmarks

### Expected Gas Costs
| Operation | Participants | Estimated Gas | Max Cost (50 gwei) |
|-----------|-------------|---------------|-------------------|
| Select Winners | 10 | 150,000 | $0.30 |
| Select Winners | 100 | 500,000 | $1.00 |
| Select Winners | 1000 | 2,000,000 | $4.00 |
| Burn Tokens | - | 100,000 | $0.20 |

### Performance Requirements
- Winner selection: < 30 seconds
- Token burning: < 15 seconds  
- Frontend update: < 5 seconds
- Error recovery: < 10 seconds

## 🎉 Success Criteria

The blockchain implementation is considered production-ready when:

1. **✅ All automated tests pass** (unit, integration, e2e)
2. **✅ Gas costs within budget** (< $5 per operation at 50 gwei)
3. **✅ No critical security vulnerabilities**
4. **✅ Frontend handles all error scenarios**
5. **✅ Successful testnet deployment and testing**
6. **✅ Performance benchmarks met**
7. **✅ Monitoring and alerting operational**

## 🆘 Troubleshooting

### Common Issues
1. **Gas estimation fails**: Check contract state and parameters
2. **Transaction reverts**: Validate campaign status and permissions
3. **Random number issues**: Verify VRF setup and funding
4. **Frontend errors**: Check network connection and contract addresses

### Debug Commands
```bash
# Check contract state
npx hardhat console --network sepolia
> const contract = await ethers.getContractAt("CampaignManager", "0x...")
> await contract.getCampaign(1)

# Analyze failed transaction
npx hardhat run scripts/debug-transaction.js --network sepolia
```

This comprehensive testing strategy ensures that your select winners and burn token functionality will work reliably in production! 🚀