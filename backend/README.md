# Squdy Backend API

Backend API for the Squdy Burn-to-Win Platform built with Node.js, Express, TypeScript, MongoDB, and Redis.

## Features

- 🚀 RESTful API with Express.js
- 🔐 Wallet signature authentication
- 📊 MongoDB with Mongoose ODM
- ⚡ Redis caching and real-time updates
- 🌐 Socket.IO for real-time communication
- 🔒 Security middleware (Helmet, CORS, Rate limiting)
- 📝 Request/response logging
- 🐳 Docker containerization
- 🌍 BSC blockchain integration

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Blockchain**: Ethers.js
- **Authentication**: Wallet signatures
- **Validation**: Express Validator
- **Logging**: Winston
- **Containerization**: Docker

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- BSC Testnet RPC access

### Installation

1. **Clone and setup**:
```bash
cd backend
npm install
```

2. **Environment Configuration**:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Start development server**:
```bash
npm run dev
```

## API Endpoints

### Public Endpoints

#### Campaigns
- `GET /api/campaigns` - Get all campaigns with pagination and filters
- `GET /api/campaigns/:id` - Get campaign by ID
- `GET /api/campaigns/:id/participants` - Get campaign participants
- `GET /api/campaigns/:id/winners` - Get campaign winners

#### Authentication
- `GET /api/auth/nonce/:walletAddress` - Get nonce for signature
- `POST /api/auth/verify-signature` - Verify wallet signature

### User Endpoints (Require wallet signature)

#### Campaign Participation
- `POST /api/campaigns/:id/participate` - Participate in campaign
- `POST /api/campaigns/:id/verify-social` - Verify social media task
- `GET /api/campaigns/:id/my-status` - Get participation status

#### User Data
- `GET /api/participants/my-participations` - Get user's participations
- `GET /api/participants/my-stats` - Get user statistics

### Admin Endpoints (Require admin wallet)

#### Dashboard
- `GET /api/admin/dashboard` - Get admin dashboard data
- `GET /api/admin/stats` - Get platform statistics

#### Campaign Management
- `POST /api/admin/campaigns` - Create new campaign
- `PUT /api/admin/campaigns/:id` - Update campaign
- `POST /api/admin/campaigns/:id/upload-image` - Upload campaign image
- `POST /api/admin/campaigns/:id/activate` - Activate campaign
- `POST /api/admin/campaigns/:id/pause` - Pause campaign
- `POST /api/admin/campaigns/:id/close` - Close campaign
- `POST /api/admin/campaigns/:id/select-winners` - Select winners
- `POST /api/admin/campaigns/:id/burn-tokens` - Burn tokens

## Authentication

The API uses wallet signature authentication:

1. Get nonce: `GET /api/auth/nonce/:walletAddress`
2. Sign message with MetaMask
3. Include signature in request body:
```json
{
  "message": "Sign this message...",
  "signature": "0x...",
  "walletAddress": "0x..."
}
```

## Real-time Updates

Socket.IO events:
- `campaign:created` - New campaign created
- `campaign:user-staked` - User staked tokens
- `campaign:winners-selected` - Winners selected
- `campaign:tokens-burned` - Tokens burned

## Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker build -t squdy-backend .
docker run -d -p 3001:3001 --env-file .env squdy-backend
```

## Environment Variables

Key environment variables:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/squdy-platform
REDIS_HOST=localhost
REDIS_PORT=6379

# Blockchain
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
NETWORK=testnet
SQUDY_TOKEN_ADDRESS=0x...
CAMPAIGN_MANAGER_ADDRESS=0x...

# Security
JWT_SECRET=your-secret-key
ADMIN_WALLETS=0x...,0x...

# CORS
CORS_ORIGIN=http://localhost:8080
```

## API Response Format

### Success Response
```json
{
  "campaigns": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "details": [...]
  }
}
```

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code

### Project Structure
```
backend/
├── src/
│   ├── config/         # Configuration
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utilities
│   └── index.ts        # App entry point
├── docker-compose.yml  # Docker services
├── Dockerfile         # Container definition
└── README.md
```

## Testing

Run the test suite:
```bash
npm test
```

Test specific features:
```bash
npm run test:watch
```

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Logs
Logs are stored in the `logs/` directory:
- `error.log` - Error logs
- `combined.log` - All logs
- Console output in development

## Security

- Helmet.js for security headers
- CORS protection
- Rate limiting
- Request validation
- Wallet signature verification
- Admin wallet whitelist

## Troubleshooting

### Common Issues

1. **MongoDB connection failed**
   - Check MongoDB is running
   - Verify connection string in `.env`

2. **Redis connection failed**
   - Check Redis is running
   - Verify Redis configuration

3. **Blockchain connection failed**
   - Check RPC URL is accessible
   - Verify contract addresses

4. **Authentication failed**
   - Ensure wallet signature is valid
   - Check admin wallet is whitelisted

## Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Use conventional commits

## License

MIT License - see LICENSE file for details.