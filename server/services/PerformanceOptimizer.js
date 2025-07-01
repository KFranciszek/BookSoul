import { logger } from '../utils/logger.js';
import { addBreadcrumb } from '../utils/sentry.js';

export class PerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
    this.maxCacheSize = 1000;
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
  }

  // Cache management
  getCacheKey(prompt, options = {}) {
    return `${prompt.substring(0, 100)}_${JSON.stringify(options)}`;
  }

  getCachedResponse(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.debug(`📦 Cache hit for key: ${cacheKey.substring(0, 50)}...`);
      this.metrics.cacheHits++;
      addBreadcrumb('Cache hit', 'performance', { cacheKey: cacheKey.substring(0, 50) });
      return cached.response;
    }
    this.metrics.cacheMisses++;
    return null;
  }

  setCachedResponse(cacheKey, response) {
    // Clean cache if too large
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    logger.debug(`💾 Cached response for key: ${cacheKey.substring(0, 50)}...`);
  }

  // Since we're now using AI-only mode with complete recommendations,
  // we don't need the complex batch processing for individual book evaluations
  // The CuratorAgent generates everything in one call

  // Track performance metrics
  recordResponseTime(time) {
    this.metrics.totalRequests++;
    this.metrics.responseTimes.push(time);
    
    // Keep only last 100 response times for average calculation
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
    
    this.metrics.averageResponseTime = 
      this.metrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
      this.metrics.responseTimes.length;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get performance metrics
  getMetrics() {
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 
      : 0;

    return {
      cacheSize: this.cache.size,
      cacheHitRate: cacheHitRate.toFixed(2),
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      totalRequests: this.metrics.totalRequests,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      mode: 'AI_ONLY_OPTIMIZED'
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    logger.info('🧹 Performance cache cleared');
    addBreadcrumb('Performance cache cleared', 'performance', {});
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
    logger.info('📊 Performance metrics reset');
  }
}