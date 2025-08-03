#!/bin/bash

echo "🚀 Railway Deployment Setup for Squdy Backend"
echo "=============================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

echo "🔗 Railway deployment options:"
echo "1. Connect to Railway: railway login"
echo "2. Initialize project: railway init"
echo "3. Deploy: railway up"
echo ""
echo "🌐 Alternative - Manual GitHub Integration:"
echo "1. Go to https://railway.app"
echo "2. Connect your GitHub account"
echo "3. Import repository: Devo-MH/squdy-win-spark"
echo "4. Set build command: cd backend && npm install"
echo "5. Set start command: cd backend && npm start"
echo ""
echo "📋 Environment Variables to set on Railway:"
echo "PORT=3001"
echo "NODE_ENV=production"

# Make the script executable
chmod +x deploy-railway.sh