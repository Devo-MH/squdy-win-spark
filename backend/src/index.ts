// import 'module-alias/register';
import express, { Application, Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import redis from 'redis';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import config from './config';
import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import Web3Service from './services/Web3Service';
import CampaignRoutes from './routes/campaigns';
import AdminRoutes from './routes/admin';
import AuthRoutes from './routes/auth';
import ParticipantRoutes from './routes/participants';

const app: Application = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
  },
});

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Performance Middleware
app.use(compression());

// Rate Limiting and Slow Down
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: 500,
});
app.use(speedLimiter);

// Request Logger
app.use(requestLogger);

// Database Connection
mongoose.connect(config.mongoUri)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    // Don't crash the app, continue without MongoDB for now
  });

// Redis Connection (Optional for development)
let redisClient: redis.RedisClientType | null = null;
try {
  redisClient = redis.createClient({
    url: config.redisUrl,
  });
  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('error', err => {
    logger.error('Redis connection error:', err);
    redisClient = null; // Disable Redis if connection fails
  });
  
  // Connect to Redis (async)
  redisClient.connect().catch(err => {
    logger.warn('Redis connection failed, continuing without Redis:', err.message);
    redisClient = null;
  });
} catch (err) {
  logger.warn('Redis not available, continuing without Redis:', (err as Error).message);
}

// Web3 Service Initialization
try {
  Web3Service.init();
} catch (error) {
  logger.error('Web3Service initialization failed:', error);
  // Continue without Web3Service for now
}

// API Routes
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

app.use('/api/campaigns', CampaignRoutes);
app.use('/api/admin', AdminRoutes);
app.use('/api/auth', AuthRoutes);
app.use('/api/participants', ParticipantRoutes);

// Error Handler Middleware
app.use(errorHandler);

// Socket.IO Connection
try {
  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    socket.on('joinCampaignRoom', (campaignId: number) => {
      socket.join(`campaign-${campaignId}`);
      logger.info(`Client ${socket.id} joined room campaign-${campaignId}`);
    });

    socket.on('leaveCampaignRoom', (campaignId: number) => {
      socket.leave(`campaign-${campaignId}`);
      logger.info(`Client ${socket.id} left room campaign-${campaignId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
} catch (error) {
  logger.error('Socket.IO setup failed:', error);
}

// Start Server
const PORT = config.port;
try {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
} catch (error) {
  logger.error('Server startup failed:', error);
  process.exit(1);
}

// Graceful Shutdown
const shutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    mongoose.connection.close().then(() => {
      logger.info('MongoDB connection closed');
      if (redisClient) {
        redisClient.quit();
        logger.info('Redis connection closed');
      }
      process.exit(0);
    });
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, io };