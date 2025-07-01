// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Initialize Sentry BEFORE any other imports
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './utils/sentry.js';
initSentry();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Import route creators (functions, not routers)
import createRecommendationRoutes from './routes/recommendations.js';
import createOptimizedRecommendationRoutes from './routes/optimized-recommendations.js';
import createSessionRoutes from './routes/sessions.js';

// Import services (but don't instantiate them yet)
import { RecommendationOrchestrator } from './services/RecommendationOrchestrator.js';
import { OptimizedRecommendationOrchestrator } from './services/OptimizedRecommendationOrchestrator.js';
import { SurveySessionService } from './services/SurveySessionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Sentry request handler MUST be the first middleware
app.use(sentryRequestHandler());
// Sentry tracing handler MUST be after the request handler
app.use(sentryTracingHandler());

// CORS configuration with more permissive settings
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com', process.env.FRONTEND_URL] 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Rate limiting - more generous limits
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health' || req.path === '/' || req.path === '/health';
  }
});
app.use(limiter);

// Body parsing middleware with larger limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request timeout middleware
app.use((req, res, next) => {
  // Set longer timeout for recommendation endpoints
  if (req.path.includes('/recommendations')) {
    req.setTimeout(300000); // 5 minutes for AI processing
    res.setTimeout(300000);
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ROOT ENDPOINT - for Render health check
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'BookSoul AI Recommendation API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'BookSoul Backend API is running successfully!',
    endpoints: {
      health: '/api/health',
      recommendations: '/api/recommendations/generate',
      optimizedRecommendations: '/api/recommendations-optimized/generate',
      sessions: '/api/sessions/create'
    },
    documentation: 'This is the backend API for BookSoul - AI-powered book recommendations'
  });
});

// HEALTH CHECK endpoint - more detailed
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      features: {
        optimized_pipeline: true,
        performance_monitoring: true,
        intelligent_caching: true,
        ai_only_mode: true,
        sentry_monitoring: !!process.env.SENTRY_DSN
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node_version: process.version,
        port: PORT
      }
    };

    // Quick OpenAI connectivity check
    try {
      const { OpenAIService } = await import('./services/OpenAIService.js');
      const openai = new OpenAIService();
      health.services = {
        openai: openai.isServiceAvailable() ? 'available' : 'unavailable',
        sentry: !!process.env.SENTRY_DSN ? 'configured' : 'not_configured'
      };
    } catch (error) {
      health.services = {
        openai: 'error',
        sentry: !!process.env.SENTRY_DSN ? 'configured' : 'not_configured'
      };
    }

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Health check endpoint (legacy)
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      features: {
        optimized_pipeline: true,
        performance_monitoring: true,
        intelligent_caching: true,
        ai_only_mode: true,
        sentry_monitoring: !!process.env.SENTRY_DSN
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node_version: process.version
      }
    };

    // Quick OpenAI connectivity check
    try {
      const { OpenAIService } = await import('./services/OpenAIService.js');
      const openai = new OpenAIService();
      health.services = {
        openai: openai.isServiceAvailable() ? 'available' : 'unavailable',
        sentry: !!process.env.SENTRY_DSN ? 'configured' : 'not_configured'
      };
    } catch (error) {
      health.services = {
        openai: 'error',
        sentry: !!process.env.SENTRY_DSN ? 'configured' : 'not_configured'
      };
    }

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced startup with better error handling and validation
const startServer = async () => {
  try {
    // Check environment configuration
    const requiredEnvVars = ['OPENAI_API_KEY'];
    const optionalEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SENTRY_DSN'];
    
    const missingRequired = requiredEnvVars.filter(varName => {
      const value = process.env[varName];
      return !value || value.includes('placeholder') || value.includes('your_');
    });

    const missingOptional = optionalEnvVars.filter(varName => {
      const value = process.env[varName];
      return !value || value.includes('placeholder') || value.includes('your_');
    });

    if (missingRequired.length > 0) {
      logger.error(`❌ Missing REQUIRED environment variables: ${missingRequired.join(', ')}`);
      logger.error('🛑 Server cannot start without OpenAI API key');
      process.exit(1);
    }

    if (missingOptional.length > 0) {
      logger.warn(`⚠️ Missing optional environment variables: ${missingOptional.join(', ')}`);
      logger.warn('🔄 Server will run with limited functionality');
    } else {
      logger.info('✅ All environment variables are configured');
    }

    // Log Sentry status
    if (process.env.SENTRY_DSN) {
      logger.info('✅ Sentry error monitoring: ACTIVE');
    } else {
      logger.warn('⚠️ Sentry error monitoring: DISABLED (no DSN configured)');
    }

    // Create service instances after environment variables are confirmed
    logger.info('🔧 Initializing services...');
    const orchestrator = new RecommendationOrchestrator();
    const optimizedOrchestrator = new OptimizedRecommendationOrchestrator();
    const sessionService = new SurveySessionService();
    
    // Create routers with service dependencies
    const recommendationRoutes = createRecommendationRoutes(orchestrator);
    const optimizedRecommendationRoutes = createOptimizedRecommendationRoutes(optimizedOrchestrator);
    const sessionRoutes = createSessionRoutes(sessionService);
    
    // Register API routes
    app.use('/api/recommendations', recommendationRoutes);
    app.use('/api/recommendations-optimized', optimizedRecommendationRoutes);
    app.use('/api/sessions', sessionRoutes);
    
    logger.info('✅ Services initialized and routes registered');
    logger.info('🚀 OPTIMIZED pipeline available at /api/recommendations-optimized');
    logger.info('🤖 AI-ONLY mode: All recommendations generated by AI');

    // Sentry error handler MUST be before any other error middleware
    app.use(sentryErrorHandler());

    // Our custom error handling middleware
    app.use(errorHandler);

    // 404 handler - UPDATED to not conflict with root endpoint
    app.use('/api/*', (req, res) => {
      res.status(404).json({ 
        error: 'API route not found',
        path: req.originalUrl,
        availableRoutes: [
          '/api/health',
          '/api/recommendations/generate',
          '/api/recommendations-optimized/generate',
          '/api/sessions/create'
        ]
      });
    });

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 BookSoul Backend Server running on port ${PORT}`);
      logger.info(`🌐 Server accessible at: http://localhost:${PORT}`);
      logger.info(`📚 AI Agents initialized and ready`);
      logger.info(`⚡ OPTIMIZED pipeline ready for faster recommendations`);
      logger.info(`🤖 AI-ONLY mode: Pure AI-generated recommendations`);
      logger.info(`🔍 Sentry monitoring: ${process.env.SENTRY_DSN ? 'ACTIVE' : 'DISABLED'}`);
      
      if (missingRequired.length === 0) {
        logger.info(`🔗 OpenAI integration: ACTIVE`);
      } else {
        logger.info(`🎭 OpenAI integration: DISABLED (missing API key)`);
      }
      
      if (missingOptional.includes('SUPABASE_URL') || missingOptional.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        logger.info(`💾 Database: IN-MEMORY MODE (configure Supabase for persistence)`);
      } else {
        logger.info(`💾 Supabase database: CONNECTED`);
      }
      
      logger.info(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      logger.info(`📊 Rate limiting: ${limiter.max} requests per ${limiter.windowMs / 60000} minutes`);
      
      logger.info(`✅ Server is ready to accept connections`);
      logger.info(`🔥 Performance optimizations: ACTIVE`);
      logger.info(`⏱️ Request timeout: 5 minutes for AI processing`);
      
      // Log available endpoints
      logger.info(`📍 Available endpoints:`);
      logger.info(`   GET  /           - Root endpoint (health check)`);
      logger.info(`   GET  /health     - Health check`);
      logger.info(`   GET  /api/health - API health check`);
      logger.info(`   POST /api/recommendations/generate - Generate recommendations`);
      logger.info(`   POST /api/recommendations-optimized/generate - Optimized recommendations`);
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

    // Set server timeouts
    server.timeout = 300000; // 5 minutes
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`🛑 ${signal} received, shutting down gracefully`);
      server.close(() => {
        logger.info('✅ Server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions with Sentry
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  // Sentry will automatically capture this
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Sentry will automatically capture this
  process.exit(1);
});

startServer();

export default app;