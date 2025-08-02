import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/squdy-platform',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  ethRpcUrl: process.env.ETH_RPC_URL || 'https://sepolia.drpc.org',
  sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.drpc.org',
  network: process.env.NETWORK || 'testnet',
  squdyTokenAddress: process.env.SQUDY_TOKEN_ADDRESS || '',
  campaignManagerAddress: process.env.CAMPAIGN_MANAGER_ADDRESS || '',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  },
  social: {
    twitterApiKey: process.env.TWITTER_API_KEY,
    twitterApiSecret: process.env.TWITTER_API_SECRET,
    discordClientId: process.env.DISCORD_CLIENT_ID,
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  adminWallets: process.env.ADMIN_WALLETS ? process.env.ADMIN_WALLETS.split(',') : [],
};

export default config;