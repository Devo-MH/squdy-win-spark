#!/bin/bash

# 🚀 Squdy Platform Environment Setup Script
# This script helps you set up the environment variables for the Squdy platform

echo "🚀 Welcome to Squdy Platform Environment Setup!"
echo "================================================"

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cp backend/env.example backend/.env
fi

echo ""
echo "🔧 Please update the following essential variables in backend/.env:"
echo ""
echo "1. PRIVATE_KEY=your_private_key_here"
echo "2. BSCSCAN_API_KEY=your_bscscan_api_key_here"
echo "3. ADMIN_WALLETS=0xYourWallet1,0xYourWallet2"
echo ""
echo "📋 Optional configurations:"
echo "- Social media API keys for verification"
echo "- Email settings for notifications"
echo "- AWS S3 for file uploads"
echo ""
echo "🚀 To deploy contracts and automatically update addresses:"
echo "npm run deploy:testnet:env"
echo ""
echo "📖 For detailed instructions, see: ENVIRONMENT-SETUP.md"
echo ""
echo "✅ Environment setup complete!" 