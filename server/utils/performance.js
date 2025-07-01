// Performance monitoring utilities
import { logger } from './logger.js';

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  startTimer(label) {
    this.startTimes.set(label, process.hrtime.bigint());
  }

  endTimer(label) {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      logger.warn(`No start time found for timer: ${label}`);
      return 0;
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    this.startTimes.delete(label);
    
    // Store metric
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const measurements = this.metrics.get(label);
    measurements.push(duration);
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }

    logger.debug(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  getMetrics(label) {
    const measurements = this.metrics.get(label) || [];
    if (measurements.length === 0) {
      return null;
    }

    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return {
      count: measurements.length,
      average: avg,
      min,
      max,
      total: sum
    };
  }

  getAllMetrics() {
    const result = {};
    for (const [label, measurements] of this.metrics.entries()) {
      result[label] = this.getMetrics(label);
    }
    return result;
  }

  clearMetrics() {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware to track request performance
export const trackRequestPerformance = (req, res, next) => {
  const label = `${req.method} ${req.path}`;
  performanceMonitor.startTimer(label);
  
  // Track when response finishes
  res.on('finish', () => {
    const duration = performanceMonitor.endTimer(label);
    
    // Log slow requests
    if (duration > 5000) { // 5 seconds
      logger.warn(`🐌 Slow request: ${label} took ${duration.toFixed(2)}ms`);
    }
  });
  
  next();
};