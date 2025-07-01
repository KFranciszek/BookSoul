import { BaseRecommendationOrchestrator } from './BaseRecommendationOrchestrator.js';
import { PerformanceOptimizer } from './PerformanceOptimizer.js';

export class OptimizedRecommendationOrchestrator extends BaseRecommendationOrchestrator {
  constructor() {
    super({
      useOptimizations: true,
      cacheTimeout: 30 * 60 * 1000, // 30 minutes
      maxCacheSize: 1000
    });
    
    this.optimizer = new PerformanceOptimizer();
  }

  // Enhanced performance analytics for optimized version
  async getPerformanceAnalytics() {
    try {
      const baseAnalytics = await this.getRecommendationAnalytics();
      const performanceMetrics = this.optimizer.getMetrics();
      
      return {
        ...baseAnalytics,
        performance: performanceMetrics,
        pipeline: {
          ...baseAnalytics.pipeline,
          type: 'AI_ONLY_OPTIMIZED',
          description: 'Optimized pipeline with AI-generated complete recommendations and intelligent caching'
        }
      };
      
    } catch (error) {
      logger.error('❌ Failed to get performance analytics:', error);
      return null;
    }
  }

  // Clear all caches including optimizer cache
  clearAllCaches() {
    super.clearAllCaches();
    this.optimizer.clearCache();
  }
}