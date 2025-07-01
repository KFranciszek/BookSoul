import { BaseRecommendationOrchestrator } from './BaseRecommendationOrchestrator.js';

export class RecommendationOrchestrator extends BaseRecommendationOrchestrator {
  constructor() {
    super({
      useOptimizations: false,
      cacheTimeout: 0, // No caching for standard pipeline
      maxCacheSize: 0
    });
  }
}