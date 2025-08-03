# 🚀 Squdy Platform Production Deployment Guide

## 📋 Overview

This guide covers the complete deployment of the Squdy campaign platform to production, including infrastructure setup, security configuration, and monitoring.

## 🏗️ Infrastructure Requirements

### **Minimum Server Specifications**
- **CPU**: 4 cores (8 recommended)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 100GB SSD (500GB recommended)
- **Network**: 1Gbps connection
- **OS**: Ubuntu 22.04 LTS or similar

### **Recommended Cloud Providers**
1. **AWS EC2** (t3.large or larger)
2. **DigitalOcean Droplets** (4GB or larger)
3. **Google Cloud Compute** (e2-standard-4 or larger)
4. **Linode** (Dedicated 8GB or larger)

## 🔧 Pre-Deployment Setup

### **1. Domain & SSL Configuration**
```bash
# Point your domain to server IP
# A record: yourdomain.com → YOUR_SERVER_IP
# CNAME: www.yourdomain.com → yourdomain.com

# Install Certbot for SSL
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### **2. Server Initial Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
sudo apt install docker.io docker-compose-v2 -y
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER

# Install monitoring tools
sudo apt install htop iotop nethogs -y
```

### **3. Security Hardening**
```bash
# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw allow 22/tcp

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

## 🐳 Docker Deployment

### **1. Clone Repository**
```bash
git clone https://github.com/Devo-MH/squdy-win-spark.git
cd squdy-win-spark
```

### **2. Environment Configuration**
```bash
# Copy environment template
cp backend/env.example .env

# Edit production environment variables
nano .env
```

### **Required Environment Variables**
```env
# Database
DATABASE_URL=postgresql://squdy_user:STRONG_PASSWORD@postgres:5432/squdy_db
DB_PASSWORD=STRONG_DATABASE_PASSWORD

# Security
JWT_SECRET=VERY_LONG_RANDOM_STRING_64_CHARS_MIN
NODE_ENV=production

# API Keys
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
DISCORD_BOT_TOKEN=your_discord_bot_token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Blockchain
VITE_SQUDY_TOKEN_ADDRESS=0x...
VITE_CAMPAIGN_MANAGER_ADDRESS=0x...
WEB3_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_KEY

# URLs
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
VITE_API_URL=https://yourdomain.com/api
```

### **3. Deploy with Docker Compose**
```bash
# Build and start services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🗄️ Database Setup

### **1. Initialize Database**
```bash
# Run migrations
docker-compose exec backend npm run migrate

# Seed initial data (optional)
docker-compose exec backend npm run seed
```

### **2. Database Backup Configuration**
```bash
# Create backup script
cat > /home/deploy/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U squdy_user squdy_db > $BACKUP_DIR/squdy_backup_$DATE.sql
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
EOF

chmod +x /home/deploy/backup-db.sh

# Add to crontab
echo "0 2 * * * /home/deploy/backup-db.sh" | crontab -
```

## 🔐 Smart Contract Deployment

### **1. Prepare Contract Deployment**
```bash
# Install Hardhat dependencies
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers

# Create deployment script
cat > scripts/deploy-production.js << 'EOF'
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy SQUDY Token (if needed)
  const SqudyToken = await ethers.getContractFactory("SqudyToken");
  const squdyToken = await SqudyToken.deploy();
  await squdyToken.deployed();
  console.log("SQUDY Token deployed to:", squdyToken.address);

  // Deploy Campaign Manager
  const CampaignManager = await ethers.getContractFactory("SqudyCampaignManagerV2");
  const campaignManager = await CampaignManager.deploy(
    squdyToken.address,
    "0xYOUR_FEE_RECIPIENT_ADDRESS"
  );
  await campaignManager.deployed();
  console.log("Campaign Manager deployed to:", campaignManager.address);

  // Verify contracts on Etherscan
  console.log("Verifying contracts...");
  await hre.run("verify:verify", {
    address: squdyToken.address,
    constructorArguments: [],
  });

  await hre.run("verify:verify", {
    address: campaignManager.address,
    constructorArguments: [squdyToken.address, "0xYOUR_FEE_RECIPIENT_ADDRESS"],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
EOF
```

### **2. Deploy to Mainnet**
```bash
# Configure Hardhat for mainnet
cat > hardhat.config.js << 'EOF'
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

module.exports = {
  solidity: "0.8.19",
  networks: {
    mainnet: {
      url: process.env.MAINNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
EOF

# Deploy contracts
npx hardhat run scripts/deploy-production.js --network mainnet
```

## 🔍 Monitoring & Logging

### **1. Setup Monitoring Stack**
```yaml
# Add to docker-compose.yml
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"
```

### **2. Application Monitoring**
```bash
# Install PM2 for process monitoring
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'squdy-backend',
    script: './backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
```

### **3. Log Management**
```bash
# Setup log rotation
sudo cat > /etc/logrotate.d/squdy << 'EOF'
/home/deploy/squdy-win-spark/logs/*.log {
  daily
  missingok
  rotate 14
  compress
  notifempty
  create 644 deploy deploy
  postrotate
    docker-compose restart backend
  endscript
}
EOF
```

## 🚨 Security Configuration

### **1. Nginx Security Headers**
```nginx
# Add to nginx.conf
server {
    # ... existing config ...

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # CSP Header
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';" always;
}
```

### **2. Rate Limiting**
```bash
# Add to nginx.conf
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
    
    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
        }
        
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
        }
    }
}
```

## 📊 Performance Optimization

### **1. Database Optimization**
```sql
-- Add database indexes
CREATE INDEX CONCURRENTLY idx_campaigns_status ON campaigns(status);
CREATE INDEX CONCURRENTLY idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX CONCURRENTLY idx_stakes_campaign_user ON stakes(campaign_id, user_id);
CREATE INDEX CONCURRENTLY idx_task_submissions_campaign ON task_submissions(campaign_id, status);

-- Configure PostgreSQL
-- Add to postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
```

### **2. Redis Configuration**
```bash
# Configure Redis for caching
cat > redis.conf << 'EOF'
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
EOF
```

## 🔄 CI/CD Pipeline

### **1. GitHub Actions Secrets**
```bash
# Set in GitHub repository settings
DEPLOY_SSH_KEY=your_private_ssh_key
DEPLOY_USER=deploy
DEPLOY_HOST=your_server_ip
DEPLOY_PATH=/home/deploy/squdy-win-spark
DEPLOY_URL=https://yourdomain.com
SLACK_WEBHOOK=your_slack_webhook_url
```

### **2. Deployment Script**
```bash
# Create deploy script
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Backup database
./backup-db.sh

# Pull latest code
git pull origin main

# Update containers
docker-compose pull
docker-compose up -d --remove-orphans

# Run migrations
docker-compose exec -T backend npm run migrate

# Health check
sleep 30
curl -f http://localhost:3001/health || exit 1

echo "✅ Deployment completed successfully!"
EOF

chmod +x deploy.sh
```

## 🧪 Testing in Production

### **1. Health Checks**
```bash
# API health check
curl -f https://yourdomain.com/api/health

# Database connectivity
curl -f https://yourdomain.com/api/campaigns

# Frontend availability
curl -f https://yourdomain.com/
```

### **2. Load Testing**
```bash
# Install k6
sudo apt install k6

# Create load test
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let response = http.get('https://yourdomain.com/api/campaigns');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF

# Run load test
k6 run load-test.js
```

## 📱 Post-Deployment Checklist

### **✅ Functional Testing**
- [ ] Website loads correctly
- [ ] API endpoints respond
- [ ] Database connections work
- [ ] Authentication flow works
- [ ] Campaign creation works
- [ ] Staking functionality works
- [ ] Task verification works
- [ ] Admin panel accessible

### **✅ Security Verification**
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] Database access restricted
- [ ] File permissions correct
- [ ] Backup system working

### **✅ Performance Validation**
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] Caching working
- [ ] CDN configured (if applicable)

### **✅ Monitoring Setup**
- [ ] Uptime monitoring active
- [ ] Error tracking configured
- [ ] Log aggregation working
- [ ] Alert notifications set up
- [ ] Dashboard accessible

## 🆘 Troubleshooting Guide

### **Common Issues**

#### **Database Connection Errors**
```bash
# Check database status
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Check connection
docker-compose exec postgres psql -U squdy_user -d squdy_db -c "\dt"
```

#### **High Memory Usage**
```bash
# Check memory usage
free -h
docker stats

# Optimize containers
docker system prune -a
docker-compose restart
```

#### **SSL Certificate Issues**
```bash
# Renew certificates
sudo certbot renew

# Check certificate status
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout
```

## 📞 Support & Maintenance

### **Regular Maintenance Tasks**
- **Daily**: Check logs and monitoring alerts
- **Weekly**: Review performance metrics and security logs
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Full security audit and backup testing

### **Emergency Contacts**
- System Admin: [your-email@domain.com]
- Security Team: [security@domain.com]
- DevOps Lead: [devops@domain.com]

### **Emergency Procedures**
1. **Site Down**: Check health endpoints, restart services
2. **Database Issues**: Restore from backup, check connections
3. **Security Breach**: Block traffic, investigate logs, patch vulnerabilities
4. **High Load**: Scale up resources, enable caching, optimize queries

---

## 🎉 Production Launch Complete!

Your Squdy platform is now live and ready for users. Monitor the dashboards closely during the first 24-48 hours and be prepared to scale resources as needed.

**Launch URL**: https://yourdomain.com
**Admin Panel**: https://yourdomain.com/admin
**API Docs**: https://yourdomain.com/api/health

*Good luck with your launch! 🚀*