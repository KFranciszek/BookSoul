// Enhanced security middleware
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Enhanced rate limiting with different limits for different endpoints
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP',
      message: 'Please try again later',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/' || req.path === '/api/health';
    }
  });
};

// Strict rate limiting for AI endpoints
export const aiRateLimiter = createRateLimiter(
  10 * 60 * 1000, // 10 minutes
  20 // 20 requests per 10 minutes for AI endpoints
);

// General API rate limiting
export const apiRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100 // 100 requests per 15 minutes
);

// Enhanced helmet configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.pexels.com", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.openai.com", "https://*.supabase.co"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Request sanitization middleware
export const sanitizeRequest = (req, res, next) => {
  // Remove potentially dangerous characters from query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = req.query[key].replace(/[<>]/g, '');
    }
  }
  
  // Limit request body size
  if (req.body && JSON.stringify(req.body).length > 50000) {
    return res.status(413).json({
      error: 'Request body too large',
      message: 'Request body exceeds maximum allowed size'
    });
  }
  
  next();
};