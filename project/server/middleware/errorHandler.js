import { logger } from '../utils/logger.js';
import { captureError } from '../utils/sentry.js';

export const errorHandler = (error, req, res, next) => {
  // Log error details
  logger.error('🚨 Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  // Capture error in Sentry with request context
  captureError(error, {
    context: 'express_error_handler',
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body ? 'present' : 'none',
    query: Object.keys(req.query).length > 0 ? 'present' : 'none',
    params: Object.keys(req.params).length > 0 ? 'present' : 'none'
  });
  
  // OpenAI specific errors
  if (error.message?.includes('OpenAI') || error.message?.includes('AI')) {
    return res.status(503).json({
      success: false,
      error: 'AI service temporarily unavailable',
      message: 'Usługa AI jest tymczasowo niedostępna. Spróbuj ponownie za chwilę.',
      code: 'AI_SERVICE_ERROR'
    });
  }
  
  // Rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Zbyt wiele żądań. Poczekaj chwilę przed kolejną próbą.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Błąd walidacji danych. Sprawdź poprawność wprowadzonych informacji.',
      code: 'VALIDATION_ERROR',
      details: error.message
    });
  }
  
  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return res.status(408).json({
      success: false,
      error: 'Request timeout',
      message: 'Przekroczono limit czasu żądania. AI potrzebuje więcej czasu na przetworzenie.',
      code: 'REQUEST_TIMEOUT'
    });
  }
  
  // Network/connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Usługa zewnętrzna jest niedostępna. Spróbuj ponownie później.',
      code: 'SERVICE_UNAVAILABLE'
    });
  }
  
  // JSON parsing errors
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON',
      message: 'Nieprawidłowy format danych JSON.',
      code: 'INVALID_JSON'
    });
  }
  
  // Default error response
  const statusCode = error.status || error.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    success: false,
    error: 'Server error',
    message: isDevelopment ? error.message : 'Wystąpił błąd serwera. Spróbuj ponownie później.',
    code: 'INTERNAL_SERVER_ERROR',
    ...(isDevelopment && { 
      stack: error.stack,
      details: {
        name: error.name,
        message: error.message
      }
    })
  });
};