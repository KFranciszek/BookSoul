import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

// Initialize Sentry for backend
export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const release = process.env.SENTRY_RELEASE || '1.0.0';

  if (!dsn) {
    logger.warn('⚠️ Sentry DSN not configured - error tracking disabled for backend');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app: undefined }),
      // REMOVED: ProfilingIntegration - not compatible with WebContainer
    ],
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // REMOVED: profilesSampleRate - profiling disabled
    
    // CRITICAL: Enable debug mode to see what's being sent
    debug: true, // ZAWSZE TRUE dla debugowania
    
    // Error filtering
    beforeSend(event, hint) {
      // TEMPORARILY DISABLE FILTERING to see all events
      if (environment === 'development') {
        // Log what we're sending to Sentry
        console.log('🔍 Sentry Event:', {
          type: event.type,
          level: event.level,
          message: event.message,
          tags: event.tags,
          extra: event.extra ? Object.keys(event.extra) : 'none'
        });
      }
      
      // Filter out expected errors in production ONLY
      if (environment === 'production') {
        // Don't send OpenAI rate limit errors (they're expected)
        if (event.exception?.values?.[0]?.value?.includes('rate_limit_exceeded')) {
          return null;
        }
        
        // Don't send network timeout errors (they're often user-related)
        if (event.exception?.values?.[0]?.value?.includes('timeout')) {
          return null;
        }
      }
      
      // Add server context
      event.server_name = process.env.SERVER_NAME || 'booksoul-backend';
      event.extra = {
        ...event.extra,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      };
      
      return event;
    },
    
    // Increase breadcrumb limit for more context
    maxBreadcrumbs: 100,
    attachStacktrace: true,
    
    // Server-specific settings
    serverName: process.env.SERVER_NAME || 'booksoul-backend',
    
    // CRITICAL: Ensure all message levels are captured
    beforeBreadcrumb(breadcrumb) {
      // Log breadcrumbs in development
      if (environment === 'development') {
        console.log('🍞 Sentry Breadcrumb:', breadcrumb.message, breadcrumb.category);
      }
      return breadcrumb;
    }
  });

  logger.info(`✅ Sentry initialized for backend (DEBUG MODE) - Environment: ${environment}, Release: ${release}`);
  
  // Test Sentry immediately
  Sentry.captureMessage('Sentry Backend Initialized Successfully', 'info');
};

// Helper functions for manual error reporting
export const captureError = (error, context = {}) => {
  console.log('📤 Capturing error to Sentry:', error.message, context);
  
  Sentry.withScope((scope) => {
    // Add context as tags and extra data
    Object.keys(context).forEach(key => {
      if (typeof context[key] === 'string' || typeof context[key] === 'number') {
        scope.setTag(key, context[key]);
      } else {
        scope.setExtra(key, context[key]);
      }
    });
    
    // Add server context
    scope.setTag('component', 'backend');
    scope.setTag('service', 'booksoul-api');
    
    Sentry.captureException(error);
  });
  
  // Also log to our regular logger
  logger.error('Error captured by Sentry:', error, context);
};

export const captureMessage = (message, level = 'info', context = {}) => {
  console.log(`📤 Capturing message to Sentry [${level}]:`, message, context);
  
  Sentry.withScope((scope) => {
    Object.keys(context).forEach(key => {
      if (typeof context[key] === 'string' || typeof context[key] === 'number') {
        scope.setTag(key, context[key]);
      } else {
        scope.setExtra(key, context[key]);
      }
    });
    
    scope.setTag('component', 'backend');
    scope.setTag('service', 'booksoul-api');
    
    // CRITICAL: Ensure the message is captured
    const eventId = Sentry.captureMessage(message, level);
    console.log(`✅ Sentry message captured with ID: ${eventId}`);
    
    return eventId;
  });
};

export const addBreadcrumb = (message, category, data = {}) => {
  console.log(`🍞 Adding breadcrumb: ${message} [${category}]`, data);
  
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
};

export const setUserContext = (user) => {
  Sentry.setUser({
    id: user.id || user.sessionId || 'anonymous',
    email: user.email,
    ip_address: user.ip,
  });
};

// Express middleware for Sentry
export const sentryRequestHandler = () => Sentry.Handlers.requestHandler();
export const sentryTracingHandler = () => Sentry.Handlers.tracingHandler();
export const sentryErrorHandler = () => Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture all errors
    return true;
  },
});

// Performance monitoring helpers
export const startTransaction = (name, op) => {
  return Sentry.startTransaction({ name, op });
};

export const finishTransaction = (transaction) => {
  if (transaction) {
    transaction.finish();
  }
};

// AI-specific error tracking
export const captureAIError = (error, context = {}) => {
  captureError(error, {
    ...context,
    category: 'ai_service',
    component: 'openai'
  });
};

export const captureRecommendationError = (error, context = {}) => {
  captureError(error, {
    ...context,
    category: 'recommendation_pipeline',
    component: 'orchestrator'
  });
};

export const captureAgentError = (agentName, error, context = {}) => {
  captureError(error, {
    ...context,
    category: 'ai_agent',
    agent: agentName,
    component: 'agent_pipeline'
  });
};