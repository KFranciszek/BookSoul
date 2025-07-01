import { ProfilerAgent } from '../agents/ProfilerAgent.js';
import { CuratorAgent } from '../agents/CuratorAgent.js';
import { FilterAgent } from '../agents/FilterAgent.js';
import { EvaluatorAgent } from '../agents/EvaluatorAgent.js';
import { PresenterAgent } from '../agents/PresenterAgent.js';
import { SurveySessionService } from './SurveySessionService.js';
import { PerformanceOptimizer } from './PerformanceOptimizer.js';
import { logger } from '../utils/logger.js';
import { captureRecommendationError, addBreadcrumb } from '../utils/sentry.js';

export class OptimizedRecommendationOrchestrator {
  constructor() {
    this.profiler = new ProfilerAgent();
    this.curator = new CuratorAgent();
    this.filter = new FilterAgent();
    this.evaluator = new EvaluatorAgent();
    this.presenter = new PresenterAgent();
    this.sessionService = new SurveySessionService();
    this.optimizer = new PerformanceOptimizer();
    this.lastUsedAgents = [];
    this.cache = new Map();
  }

  async generateRecommendations(surveyData) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(surveyData);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      logger.info('📦 Returning cached recommendations');
      addBreadcrumb('Cache hit for recommendations', 'performance', { cacheKey });
      return this.cache.get(cacheKey);
    }

    this.lastUsedAgents = [];
    
    try {
      // Check if AI services are available before starting
      const aiAvailable = this.profiler.openai.isServiceAvailable();
      
      if (!aiAvailable) {
        const error = new Error('AI recommendation models are currently unavailable. Please ensure OpenAI API is properly configured and accessible.');
        captureRecommendationError(error, {
          context: 'ai_service_check',
          surveyMode: surveyData.surveyMode
        });
        throw error;
      }

      logger.info('🚀 Starting OPTIMIZED AI-ONLY recommendation pipeline...');
      addBreadcrumb('Starting optimized recommendation pipeline', 'recommendation', {
        mode: surveyData.surveyMode,
        hasGenres: !!surveyData.favoriteGenres?.length,
        hasFilms: !!surveyData.favoriteFilms?.length
      });

      // Step 1: 🧠 Profile Analysis (Single AI call)
      logger.info('🧠 Starting profile analysis...');
      this.lastUsedAgents.push('Profiler');
      const userProfile = await this.profiler.analyzeProfile(surveyData);
      
      // Step 2: 📚 AI Book Generation (Single AI call - generates COMPLETE books)
      logger.info('📚 Generating complete AI books...');
      this.lastUsedAgents.push('Curator');
      const aiGeneratedBooks = await this.curator.generateBookCandidates(userProfile, surveyData);
      
      if (!aiGeneratedBooks || aiGeneratedBooks.length === 0) {
        throw new Error('AI failed to generate any book recommendations');
      }
      
      // Step 3: 🚨 Content Filtering (Local processing - fast)
      logger.info('🚨 Applying content filters...');
      this.lastUsedAgents.push('Filter');
      let filteredBooks = await this.filter.filterBooks(aiGeneratedBooks, surveyData); // FIXED: Changed from const to let
      
      if (!filteredBooks || filteredBooks.length === 0) {
        logger.warn('⚠️ All books were filtered out, using unfiltered results');
        filteredBooks = aiGeneratedBooks; // FIXED: Now we can reassign
      }
      
      // Step 4: 🧪 Validation & Refinement (Local processing - no AI calls)
      logger.info('🧪 Validating AI-generated evaluations...');
      this.lastUsedAgents.push('Evaluator');
      const evaluatedBooks = await this.evaluator.evaluateMatches(filteredBooks, userProfile, surveyData);
      
      // Step 5: 🧭 Final Presentation (Local processing - no AI calls)
      logger.info('🧭 Finalizing presentation...');
      this.lastUsedAgents.push('Presenter');
      const finalRecommendations = await this.presenter.presentRecommendations(evaluatedBooks, userProfile, surveyData);
      
      const totalTime = Date.now() - startTime;
      logger.info(`✅ OPTIMIZED AI-ONLY pipeline complete in ${totalTime}ms`);
      logger.info(`📊 Generated ${finalRecommendations.length} recommendations using ${this.lastUsedAgents.length} agents`);
      
      addBreadcrumb('Recommendation pipeline completed', 'recommendation', {
        totalTime,
        recommendationCount: finalRecommendations.length,
        agentsUsed: this.lastUsedAgents.join(', ')
      });
      
      // Cache the results
      this.cache.set(cacheKey, finalRecommendations);
      
      // Clean cache if it gets too large
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      return finalRecommendations;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`❌ Optimized orchestration failed after ${totalTime}ms:`, error);
      
      captureRecommendationError(error, {
        context: 'optimized_orchestration_failed',
        surveyMode: surveyData.surveyMode,
        processingTime: totalTime,
        agentsUsed: this.lastUsedAgents.join(', '),
        hasGenres: !!surveyData.favoriteGenres?.length,
        hasFilms: !!surveyData.favoriteFilms?.length
      });
      
      // Check if it's an AI service unavailability error
      if (error.message.includes('unavailable') || error.message.includes('not configured')) {
        throw error; // Re-throw to preserve the specific error message
      }
      
      throw new Error(`AI recommendation system encountered an error: ${error.message}`);
    }
  }

  generateCacheKey(surveyData) {
    const keyData = {
      mode: surveyData.surveyMode,
      genres: surveyData.favoriteGenres?.sort(),
      mood: surveyData.currentMood,
      goal: surveyData.readingGoal,
      films: surveyData.favoriteFilms?.sort(),
      triggers: surveyData.triggers?.sort(),
      filmConnection: surveyData.filmConnection
    };
    
    return JSON.stringify(keyData);
  }

  getLastUsedAgents() {
    return this.lastUsedAgents;
  }

  // Performance analytics
  async getPerformanceAnalytics() {
    try {
      const analytics = await this.sessionService.getAnalytics();
      const bookRatings = await this.sessionService.getRatingsByBook();
      const performanceMetrics = this.optimizer.getMetrics();
      
      return {
        ...analytics,
        bookPerformance: bookRatings,
        performance: performanceMetrics,
        insights: this.generateInsights(analytics, bookRatings),
        pipeline: {
          type: 'AI_ONLY_OPTIMIZED',
          agents: ['Profiler', 'Curator', 'Filter', 'Evaluator', 'Presenter'],
          aiCalls: 2, // Only Profiler and Curator make AI calls
          description: 'Optimized pipeline with AI-generated complete recommendations'
        }
      };
      
    } catch (error) {
      logger.error('❌ Failed to get performance analytics:', error);
      captureRecommendationError(error, { context: 'performance_analytics' });
      return null;
    }
  }

  generateInsights(analytics, bookRatings) {
    const insights = [];
    
    // Mode performance
    const modePerformance = Object.entries(analytics.sessionsByMode)
      .map(([mode, count]) => ({ mode, count, percentage: (count / analytics.totalSessions) * 100 }))
      .sort((a, b) => b.count - a.count);
    
    insights.push({
      type: 'mode_popularity',
      data: modePerformance,
      message: `${modePerformance[0]?.mode || 'quick'} mode is most popular (${modePerformance[0]?.percentage.toFixed(1) || 0}%)`
    });
    
    // Rating distribution
    const totalRatings = Object.values(analytics.ratingsDistribution).reduce((sum, count) => sum + count, 0);
    if (totalRatings > 0) {
      const positiveRatings = analytics.ratingsDistribution[2] || 0;
      const positivePercentage = (positiveRatings / totalRatings) * 100;
      
      insights.push({
        type: 'satisfaction',
        data: analytics.ratingsDistribution,
        message: `${positivePercentage.toFixed(1)}% of ratings are positive (rating 2)`
      });
    }
    
    // Top performing books
    const topBooks = Object.values(bookRatings)
      .filter(book => book.totalRatings >= 3) // Minimum ratings for reliability
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 5);
    
    if (topBooks.length > 0) {
      insights.push({
        type: 'top_books',
        data: topBooks,
        message: `"${topBooks[0].title}" has the highest average rating (${topBooks[0].averageRating.toFixed(2)})`
      });
    }
    
    // AI-only pipeline insights
    insights.push({
      type: 'pipeline_performance',
      data: {
        type: 'AI_ONLY_OPTIMIZED',
        aiCalls: 2,
        avgProcessingTime: '5-15 seconds'
      },
      message: 'Using optimized AI-only pipeline with 2 AI calls per recommendation'
    });
    
    return insights;
  }

  // Check if the recommendation system is available
  async isSystemAvailable() {
    try {
      const aiAvailable = this.profiler.openai.isServiceAvailable();
      const dbAvailable = !this.sessionService.useInMemoryStorage;
      
      return {
        ai: aiAvailable,
        database: dbAvailable,
        overall: aiAvailable // AI is critical, database can fallback to memory
      };
    } catch (error) {
      logger.error('❌ Failed to check system availability:', error);
      captureRecommendationError(error, { context: 'system_availability_check' });
      return {
        ai: false,
        database: false,
        overall: false
      };
    }
  }

  // Clear all caches
  clearAllCaches() {
    this.cache.clear();
    this.optimizer.clearCache();
    logger.info('🧹 All caches cleared');
    addBreadcrumb('All caches cleared', 'performance', {});
  }
}