#!/bin/bash

# 🌐 Sepolia Testnet Setup Script
# This script helps you configure environment for Sepolia deployment

echo "🌐 SQUDY Sepolia Testnet Setup"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from template..."
    cp env.example .env
fi

echo "📋 Current Configuration Check:"
echo ""

# Check current environment
if grep -q "VITE_NETWORK=sepolia" .env; then
    echo "✅ Network: Already set to Sepolia"
else
    echo "⚠️  Network: Not set to Sepolia"
fi

if grep -q "VITE_SQUDY_TOKEN_ADDRESS=$" .env; then
    echo "✅ Token Address: Empty (ready for mock token)"
else
    echo "⚠️  Token Address: Set (will use existing token)"
fi

echo ""
echo "🔧 Required for Deployment:"
echo ""

# Check for required deployment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY environment variable not set"
    echo "   Export your private key: export PRIVATE_KEY='your_private_key_here'"
else
    echo "✅ PRIVATE_KEY is set"
fi

if [ -z "$INFURA_API_KEY" ]; then
    echo "❌ INFURA_API_KEY environment variable not set"
    echo "   Get API key from: https://infura.io/"
    echo "   Export it: export INFURA_API_KEY='your_infura_key_here'"
else
    echo "✅ INFURA_API_KEY is set"
fi

if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo "⚠️  ETHERSCAN_API_KEY not set (optional for verification)"
    echo "   Get API key from: https://etherscan.io/apis"
    echo "   Export it: export ETHERSCAN_API_KEY='your_etherscan_key_here'"
else
    echo "✅ ETHERSCAN_API_KEY is set"
fi

echo ""
echo "💰 Prerequisites:"
echo ""

echo "1. 📱 MetaMask Setup:"
echo "   - Add Sepolia network to MetaMask"
echo "   - Network Name: Sepolia Testnet"
echo "   - RPC URL: https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
echo "   - Chain ID: 11155111"
echo "   - Symbol: ETH"
echo "   - Block Explorer: https://sepolia.etherscan.io"
echo ""

echo "2. 💸 Get Sepolia ETH:"
echo "   - Visit: https://sepoliafaucet.com/"
echo "   - Request 0.5+ ETH for testing"
echo "   - Address: $(grep -o 'PRIVATE_KEY.*' .env 2>/dev/null | head -c 20)..."
echo ""

echo "🚀 Ready to Deploy?"
echo ""

# Check if all requirements are met
if [ -n "$PRIVATE_KEY" ] && [ -n "$INFURA_API_KEY" ]; then
    echo "✅ All requirements met! Run deployment with:"
    echo ""
    echo "   npx hardhat run scripts/deploy-sepolia-test.js --network sepolia"
    echo ""
    echo "📝 After deployment:"
    echo "   1. Copy generated .env.sepolia to .env"
    echo "   2. Update frontend with new contract addresses"
    echo "   3. Test with MetaMask on Sepolia"
    echo ""
else
    echo "❌ Missing requirements. Please set:"
    [ -z "$PRIVATE_KEY" ] && echo "   - PRIVATE_KEY"
    [ -z "$INFURA_API_KEY" ] && echo "   - INFURA_API_KEY"
    echo ""
    echo "💡 Quick setup:"
    echo "   export PRIVATE_KEY='your_private_key_here'"
    echo "   export INFURA_API_KEY='your_infura_key_here'"
    echo "   ./setup-sepolia.sh"
fi

echo ""
echo "📚 For detailed instructions, see: SEPOLIA-TESTING-GUIDE.md"