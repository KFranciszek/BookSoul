// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Import route creators (functions, not routers)
import createRecommendationRoutes from './routes/recommendations.js';
import createSessionRoutes from './routes/sessions.js';

// Import services (but don't instantiate them yet)
import { RecommendationOrchestrator } from './services/RecommendationOrchestrator.js';
import { SurveySessionService } from './services/SurveySessionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Enhanced startup with better error handling and validation
const startServer = async () => {
  try {
    // Check environment configuration
    const requiredEnvVars = ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missingVars = requiredEnvVars.filter(varName => {
      const value = process.env[varName];
      return !value || value.includes('placeholder') || value.includes('your_');
    });

    if (missingVars.length > 0) {
      logger.warn(`⚠️ Missing or placeholder environment variables: ${missingVars.join(', ')}`);
      logger.warn('🔄 Server will run with limited functionality (mock responses and in-memory storage)');
    } else {
      logger.info('✅ All required environment variables are configured');
    }

    // Create service instances after environment variables are confirmed
    logger.info('🔧 Initializing services...');
    const orchestrator = new RecommendationOrchestrator();
    const sessionService = new SurveySessionService();
    
    // Create routers with service dependencies
    const recommendationRoutes = createRecommendationRoutes(orchestrator);
    const sessionRoutes = createSessionRoutes(sessionService);
    
    // Register API routes
    app.use('/api/recommendations', recommendationRoutes);
    app.use('/api/sessions', sessionRoutes);
    
    logger.info('✅ Services initialized and routes registered');

    // Error handling middleware
    app.use(errorHandler);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl 
      });
    });

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 BookSoul Backend Server running on port ${PORT}`);
      logger.info(`🌐 Server accessible at: http://localhost:${PORT}`);
      logger.info(`📚 AI Agents initialized and ready`);
      
      if (missingVars.includes('OPENAI_API_KEY')) {
        logger.info(`🎭 OpenAI integration: MOCK MODE (add real API key for full functionality)`);
      } else {
        logger.info(`🔗 OpenAI integration: ACTIVE`);
      }
      
      if (missingVars.includes('SUPABASE_URL') || missingVars.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        logger.info(`💾 Database: IN-MEMORY MODE (configure Supabase for persistence)`);
      } else {
        logger.info(`💾 Supabase database: CONNECTED`);
      }
      
      logger.info(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      logger.info(`📊 Rate limiting: ${limiter.max} requests per ${limiter.windowMs / 60000} minutes`);
      
      logger.info(`✅ Server is ready to accept connections`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use. Please stop other applications using this port or change the PORT in .env file.`);
      } else {
        logger.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('🛑 SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;