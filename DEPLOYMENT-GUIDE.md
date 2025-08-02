# Squdy Platform Deployment Guide

## 📋 Prerequisites

### System Requirements
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Node.js**: Version 18+
- **Kubernetes**: Version 1.24+ (for production)
- **Helm**: Version 3.0+ (optional)

### External Services
- **BSC RPC Provider**: Infura, QuickNode, or self-hosted
- **MongoDB Atlas** or self-hosted MongoDB
- **Redis Cloud** or self-hosted Redis
- **AWS S3** for file storage
- **Email Provider**: SendGrid, AWS SES, or SMTP
- **Domain & SSL**: Cloudflare or similar

## 🚀 Quick Start (Development)

### 1. Clone Repository
```bash
git clone https://github.com/squdy/squdy-platform.git
cd squdy-platform
```

### 2. Environment Setup
```bash
# Copy environment templates
cp .env.example .env
cp backend/env.example backend/.env

# Configure environment variables (see Configuration section)
nano .env
nano backend/.env
```

### 3. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Install testing dependencies
npm install --save-dev
```

### 4. Run Development Environment
```bash
# Start backend services
cd backend && docker-compose up -d

# Start frontend
npm run dev

# In separate terminal - start backend API
cd backend && npm run dev
```

## 🏗️ Production Deployment

### Method 1: Docker Compose (Recommended for VPS)

```bash
# 1. Prepare environment
cp .env.production .env
nano .env  # Configure production variables

# 2. Build and deploy
docker-compose -f docker-compose.production.yml up -d

# 3. Run database migrations (if needed)
docker-compose -f docker-compose.production.yml exec backend npm run migrate

# 4. Verify deployment
curl https://yourdomain.com/health
```

### Method 2: Kubernetes (Recommended for Scale)

```bash
# 1. Create namespace and secrets
kubectl apply -f k8s/production/namespace.yaml
kubectl create secret generic squdy-secrets --from-env-file=.env -n squdy-production

# 2. Deploy services
kubectl apply -f k8s/production/

# 3. Verify deployment
kubectl get pods -n squdy-production
kubectl get ingress -n squdy-production
```

### Method 3: Manual Deployment

```bash
# 1. Build frontend
npm run build

# 2. Deploy frontend to CDN/Static hosting
aws s3 sync dist/ s3://your-bucket --delete

# 3. Deploy backend to server
scp -r backend/ user@server:/path/to/app
ssh user@server "cd /path/to/app && npm install --production && npm run build && pm2 restart all"
```

## ⚙️ Configuration

### Environment Variables

#### Frontend (.env)
```bash
VITE_API_URL=https://api.yourdomain.com
VITE_CAMPAIGN_MANAGER_ADDRESS=0x...
VITE_SQUDY_TOKEN_ADDRESS=0x...
```

#### Backend (backend/.env)
```bash
# Server
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com

# Database
MONGO_URI=mongodb://username:password@cluster.mongodb.net/squdy-platform
REDIS_URL=redis://username:password@redis-host:6379

# Blockchain
BSC_RPC_URL=https://bsc-dataseed.binance.org/
NETWORK=mainnet
SQUDY_TOKEN_ADDRESS=0x...
CAMPAIGN_MANAGER_ADDRESS=0x...

# Security
JWT_SECRET=your-super-secret-jwt-key
ADMIN_WALLETS=0xadmin1,0xadmin2

# External Services
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=squdy-platform-assets

EMAIL_HOST=smtp.sendgrid.net
EMAIL_USER=your-email
EMAIL_PASS=your-password

# Social Media APIs
TWITTER_API_KEY=your-twitter-key
DISCORD_CLIENT_ID=your-discord-id
TELEGRAM_BOT_TOKEN=your-telegram-token
```

### Smart Contract Deployment

```bash
# 1. Configure Hardhat
nano hardhat.config.cjs  # Add your network config

# 2. Deploy to testnet first
npm run deploy:testnet

# 3. Verify contracts
npm run verify:testnet

# 4. Deploy to mainnet
npm run deploy:mainnet

# 5. Verify on mainnet
npm run verify:mainnet
```

## 🔒 Security Checklist

### Pre-deployment Security Audit
```bash
# Run comprehensive security audit
npm run audit:full

# Check for vulnerabilities
npm run audit:deps

# Smart contract security
npm run test:enhanced
```

### Production Security Measures
- [ ] SSL/TLS certificates configured
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Input validation active
- [ ] Admin wallets secured
- [ ] Backup procedures tested

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Application health
curl https://yourdomain.com/health
curl https://api.yourdomain.com/health

# Database connectivity
curl https://api.yourdomain.com/api/health/db

# Blockchain connectivity
curl https://api.yourdomain.com/api/health/blockchain
```

### Monitoring Setup
1. **Prometheus**: Metrics collection
2. **Grafana**: Dashboards and visualization
3. **AlertManager**: Alert notifications
4. **ELK Stack**: Log aggregation (optional)

### Backup Procedures
```bash
# Database backup
mongodump --uri="mongodb://..." --out=backup-$(date +%Y%m%d)

# Redis backup
redis-cli BGSAVE

# Contract data backup
npm run backup:contracts
```

## 🚨 Troubleshooting

### Common Issues

#### Frontend Not Loading
```bash
# Check build output
npm run build:dev

# Verify environment variables
echo $VITE_API_URL

# Check nginx logs
docker logs frontend-container
```

#### Backend API Errors
```bash
# Check logs
docker logs backend-container

# Test database connection
cd backend && npm run test:db

# Verify environment
cd backend && npm run verify:env
```

#### Smart Contract Issues
```bash
# Verify contract addresses
npm run verify:contracts

# Check network connectivity
npm run test:network

# Validate contract state
npm run contracts:status
```

#### Database Connection Issues
```bash
# Test MongoDB connection
mongosh "mongodb://your-connection-string"

# Check Redis connectivity
redis-cli -h your-host -p 6379 ping

# Verify credentials
echo $MONGO_URI | base64 -d
```

### Performance Issues

#### Frontend Optimization
```bash
# Analyze bundle size
npm run build:analyze

# Check loading times
npm run test:performance

# Optimize images
npm run optimize:assets
```

#### Backend Optimization
```bash
# Check memory usage
docker stats backend-container

# Database performance
npm run db:analyze

# Cache optimization
npm run cache:optimize
```

## 📈 Scaling Considerations

### Horizontal Scaling
- **Frontend**: CDN + multiple edge locations
- **Backend**: Load balancer + multiple API instances
- **Database**: MongoDB sharding/replica sets
- **Cache**: Redis cluster

### Vertical Scaling
- **CPU**: Monitor and increase as needed
- **Memory**: Watch for memory leaks
- **Storage**: SSD recommended, monitor IOPS
- **Network**: Ensure sufficient bandwidth

### Cost Optimization
- Use reserved instances for predictable workloads
- Implement auto-scaling policies
- Monitor and optimize database queries
- Use CDN for static assets
- Implement efficient caching strategies

## 🎯 Success Metrics

### Technical KPIs
- **Uptime**: >99.9%
- **Response Time**: <200ms (API), <2s (Frontend)
- **Error Rate**: <0.1%
- **Throughput**: Handle peak loads

### Business KPIs
- **User Engagement**: Daily/Monthly active users
- **Campaign Success**: Participation rates
- **Token Metrics**: Staking volume, burn rates
- **Platform Growth**: Campaign creation rates

## 📞 Support

### Documentation
- [API Documentation](./docs/api.md)
- [Smart Contract Documentation](./docs/contracts.md)
- [Frontend Documentation](./docs/frontend.md)

### Contact
- **Technical Issues**: Create GitHub issue
- **Security Concerns**: security@squdy.io
- **Business Inquiries**: hello@squdy.io

---

*This deployment guide is continuously updated. Please check for the latest version before deploying.*