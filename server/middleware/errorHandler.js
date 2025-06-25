import { logger } from '../utils/logger.js';

export const errorHandler = (error, req, res, next) => {
  logger.error('🚨 Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  // OpenAI specific errors
  if (error.message?.includes('OpenAI')) {
    return res.status(503).json({
      success: false,
      error: 'AI service temporarily unavailable',
      message: 'Please try again in a few moments'
    });
  }
  
  // Rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Please wait before making another request'
    });
  }
  
  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: error.message
    });
  }
  
  // Default error response
  const statusCode = error.status || error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;
  
  res.status(statusCode).json({
    success: false,
    error: 'Server error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};