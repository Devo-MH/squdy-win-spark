# 🚀 Squdy Platform Environment Setup Guide

This guide will help you set up the environment variables and deploy the smart contracts for the Squdy Burn-to-Win platform.

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **MetaMask** or another Web3 wallet
4. **BSC Testnet BNB** (for testing)
5. **BSC Mainnet BNB** (for production)

## 🔧 Step 1: Environment Configuration

### 1.1 Create Environment Files

The platform uses two main environment files:

- `backend/.env` - Backend server configuration
- `.env` (root) - Frontend and deployment configuration

### 1.2 Backend Environment Setup

Copy the example environment file:

```bash
cp backend/env.example backend/.env
```

### 1.3 Required Environment Variables

#### 🔑 Essential Variables (Must Set)

```bash
# Your private key for contract deployment (keep secure!)
PRIVATE_KEY=your_private_key_here

# BSCScan API key for contract verification
BSCSCAN_API_KEY=your_bscscan_api_key_here

# Admin wallet addresses (comma-separated)
ADMIN_WALLETS=0xYourWalletAddress1,0xYourWalletAddress2
```

#### 🌐 Blockchain Configuration

```bash
# Network selection
NETWORK=testnet  # or mainnet

# BSC RPC URLs
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_MAINNET_RPC_URL=https://bsc-dataseed1.binance.org/

# Contract addresses (will be set after deployment)
SQUDY_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
CAMPAIGN_MANAGER_ADDRESS=0x0000000000000000000000000000000000000000
```

#### 🔗 Chainlink VRF Configuration

```bash
# BSC Testnet VRF
VRF_COORDINATOR_TESTNET=0x6A2AAd07396B36Fe02a22b33cf443582f682c82f
VRF_KEY_HASH_TESTNET=0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314

# BSC Mainnet VRF
VRF_COORDINATOR_MAINNET=0xc587d9053cd1118f25F645F9E08BB98c9712A4EE
VRF_KEY_HASH_MAINNET=0xba6e730de88d94a5510ae6613898bfb0c3de5d16e609c5b7da808abb1254c720

# VRF Subscription ID (create on Chainlink VRF dashboard)
VRF_SUBSCRIPTION_ID=1
```

## 🚀 Step 2: Deploy Smart Contracts

### 2.1 Automatic Deployment (Recommended)

Use the automated deployment script that will:
- Deploy contracts
- Update environment files automatically
- Create deployment summary

```bash
# Deploy to BSC Testnet
npm run deploy:testnet:env

# Deploy to BSC Mainnet
npm run deploy:mainnet:env
```

### 2.2 Manual Deployment

If you prefer manual deployment:

```bash
# Deploy contracts
npm run deploy:testnet

# Then manually update the .env file with the deployed addresses
```

### 2.3 Contract Verification

After deployment, verify your contracts on BSCScan:

```bash
# Verify on BSC Testnet
npm run verify:testnet

# Verify on BSC Mainnet
npm run verify:mainnet
```

## 🔐 Step 3: Security Configuration

### 3.1 JWT Secret

Generate a secure JWT secret:

```bash
# Generate a random 32-byte hex string
openssl rand -hex 32
```

Update in `backend/.env`:
```bash
JWT_SECRET=your_generated_secret_here
```

### 3.2 Admin Wallets

Set your admin wallet addresses in `backend/.env`:
```bash
ADMIN_WALLETS=0xYourWallet1,0xYourWallet2,0xYourWallet3
```

## 📧 Step 4: Email Configuration (Optional)

For email notifications, configure SMTP settings:

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@squdy.com
```

## 🐦 Step 5: Social Media API Keys (Optional)

For social media verification features:

### Twitter API
```bash
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
```

### Discord API
```bash
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_BOT_TOKEN=your_discord_bot_token
```

### Telegram API
```bash
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

## ☁️ Step 6: AWS Configuration (Optional)

For file uploads to S3:

```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=squdy-platform
```

## 🧪 Step 7: Testing Configuration

### 7.1 Test the Deployment

After deployment, test your contracts:

```bash
# Run contract tests
npm run test

# Run enhanced tests
npm run test:enhanced
```

### 7.2 Verify Environment

Check that all environment variables are set correctly:

```bash
# Check backend environment
cd backend && npm run build

# Check frontend environment
npm run build
```

## 🚀 Step 8: Start the Platform

### 8.1 Development Mode

```bash
# Start backend
cd backend && npm run dev

# Start frontend (in another terminal)
npm run dev
```

### 8.2 Production Mode

```bash
# Start with Docker
docker compose up -d
```

## 📊 Step 9: Monitor and Verify

### 9.1 Check Contract Deployment

After deployment, you'll get:
- Contract addresses
- BSCScan links
- Deployment summary in `deployment-summary.json`

### 9.2 Verify on BSCScan

Visit the provided BSCScan links to verify your contracts are deployed correctly.

### 9.3 Test Platform Features

1. Connect wallet to frontend
2. Create a test campaign
3. Stake tokens
4. Complete social media tasks
5. Test winner selection

## 🔧 Troubleshooting

### Common Issues

1. **Insufficient BNB**: Make sure you have enough BNB for deployment
2. **Invalid Private Key**: Ensure your private key is correct and has funds
3. **Network Issues**: Check your RPC URL and network configuration
4. **VRF Subscription**: Create a subscription on Chainlink VRF dashboard

### Getting Help

- Check the deployment logs for error messages
- Verify your environment variables are set correctly
- Ensure you have the latest version of dependencies

## 📝 Environment Variables Reference

### Backend Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PRIVATE_KEY` | Private key for deployment | Yes | - |
| `BSCSCAN_API_KEY` | BSCScan API key | Yes | - |
| `NETWORK` | Network to use | Yes | testnet |
| `SQUDY_TOKEN_ADDRESS` | Token contract address | Yes | - |
| `CAMPAIGN_MANAGER_ADDRESS` | Campaign manager address | Yes | - |
| `ADMIN_WALLETS` | Admin wallet addresses | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `MONGO_URI` | MongoDB connection string | Yes | - |
| `REDIS_URL` | Redis connection string | Yes | - |

### Frontend Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API URL | Yes | http://localhost:3001 |
| `VITE_BLOCKCHAIN_NETWORK` | Blockchain network | Yes | testnet |
| `VITE_SQUDY_TOKEN_ADDRESS` | Token contract address | Yes | - |
| `VITE_CAMPAIGN_MANAGER_ADDRESS` | Campaign manager address | Yes | - |

## 🎉 Success!

Once you've completed all steps, your Squdy Burn-to-Win platform should be fully operational!

- Frontend: http://localhost:8080
- Backend API: http://localhost:3001
- MongoDB: localhost:27017
- Redis: localhost:6379 