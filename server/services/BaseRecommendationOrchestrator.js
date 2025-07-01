// Base orchestrator with shared logic
import { ProfilerAgent } from '../agents/ProfilerAgent.js';
import { CuratorAgent } from '../agents/CuratorAgent.js';
import { FilterAgent } from '../agents/FilterAgent.js';
import { EvaluatorAgent } from '../agents/EvaluatorAgent.js';
import { PresenterAgent } from '../agents/PresenterAgent.js';
import { SurveySessionService } from './SurveySessionService.js';
import { logger } from '../utils/logger.js';
import { captureRecommendationError, addBreadcrumb } from '../utils/sentry.js';

export class BaseRecommendationOrchestrator {
  constructor(options = {}) {
    this.profiler = new ProfilerAgent();
    this.curator = new CuratorAgent();
    this.filter = new FilterAgent();
    this.evaluator = new EvaluatorAgent();
    this.presenter = new PresenterAgent();
    this.sessionService = new SurveySessionService();
    this.lastUsedAgents = [];
    this.cache = new Map();
    
    // Configuration options
    this.useOptimizations = options.useOptimizations || false;
    this.cacheTimeout = options.cacheTimeout || 30 * 60 * 1000; // 30 minutes
    this.maxCacheSize = options.maxCacheSize || 1000;
  }

  async generateRecommendations(surveyData) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(surveyData);
    
    // Check cache first if optimizations enabled
    if (this.useOptimizations && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        logger.info('📦 Returning cached recommendations');
        addBreadcrumb('Cache hit for recommendations', 'performance', { cacheKey });
        return cached.data;
      } else {
        // Remove expired cache entry
        this.cache.delete(cacheKey);
      }
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

      const pipelineType = this.useOptimizations ? 'OPTIMIZED' : 'STANDARD';
      logger.info(`🚀 Starting ${pipelineType} AI-ONLY recommendation pipeline...`);
      
      addBreadcrumb(`Starting ${pipelineType.toLowerCase()} recommendation pipeline`, 'recommendation', {
        mode: surveyData.surveyMode,
        hasGenres: !!surveyData.favoriteGenres?.length,
        hasFilms: !!surveyData.favoriteFilms?.length,
        useOptimizations: this.useOptimizations
      });

      // Execute the recommendation pipeline
      const recommendations = await this.executeRecommendationPipeline(surveyData);
      
      const totalTime = Date.now() - startTime;
      logger.info(`✅ ${pipelineType} AI-ONLY pipeline complete in ${totalTime}ms`);
      logger.info(`📊 Generated ${recommendations.length} recommendations using ${this.lastUsedAgents.length} agents`);
      
      addBreadcrumb('Recommendation pipeline completed', 'recommendation', {
        totalTime,
        recommendationCount: recommendations.length,
        agentsUsed: this.lastUsedAgents.join(', '),
        pipelineType
      });
      
      // Cache the results if optimizations enabled
      if (this.useOptimizations) {
        this.cacheResults(cacheKey, recommendations);
      }
      
      return recommendations;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      const pipelineType = this.useOptimizations ? 'Optimized' : 'Standard';
      logger.error(`❌ ${pipelineType} orchestration failed after ${totalTime}ms:`, error);
      
      captureRecommendationError(error, {
        context: `${pipelineType.toLowerCase()}_orchestration_failed`,
        surveyMode: surveyData.surveyMode,
        processingTime: totalTime,
        agentsUsed: this.lastUsedAgents.join(', '),
        hasGenres: !!surveyData.favoriteGenres?.length,
        hasFilms: !!surveyData.favoriteFilms?.length,
        useOptimizations: this.useOptimizations
      });
      
      // Check if it's an AI service unavailability error
      if (error.message.includes('unavailable') || error.message.includes('not configured')) {
        throw error; // Re-throw to preserve the specific error message
      }
      
      throw new Error(`AI recommendation system encountered an error: ${error.message}`);
    }
  }

  async executeRecommendationPipeline(surveyData) {
    // Step 1: 🧠 Profile Analysis
    logger.info('🧠 Starting profile analysis...');
    this.lastUsedAgents.push('Profiler');
    const userProfile = await this.profiler.analyzeProfile(surveyData);
    
    // Step 2: 📚 AI Book Generation
    logger.info('📚 Generating complete AI books...');
    this.lastUsedAgents.push('Curator');
    const aiGeneratedBooks = await this.curator.generateBookCandidates(userProfile, surveyData);
    
    if (!aiGeneratedBooks || aiGeneratedBooks.length === 0) {
      throw new Error('AI failed to generate any book recommendations');
    }
    
    // Step 3: 🚨 Content Filtering
    logger.info('🚨 Applying content filters...');
    this.lastUsedAgents.push('Filter');
    let filteredBooks = await this.filter.filterBooks(aiGeneratedBooks, surveyData);
    
    if (!filteredBooks || filteredBooks.length === 0) {
      logger.warn('⚠️ All books were filtered out, using unfiltered results');
      filteredBooks = aiGeneratedBooks;
    }
    
    // Step 4: 🧪 Match Evaluation
    logger.info('🧪 Validating match scores...');
    this.lastUsedAgents.push('Evaluator');
    const evaluatedBooks = await this.evaluator.evaluateMatches(filteredBooks, userProfile, surveyData);
    
    // Step 5: 🧭 Final Presentation
    logger.info('🧭 Preparing final presentation...');
    this.lastUsedAgents.push('Presenter');
    const finalRecommendations = await this.presenter.presentRecommendations(evaluatedBooks, userProfile, surveyData);
    
    return finalRecommendations;
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

  cacheResults(cacheKey, recommendations) {
    // Clean cache if it gets too large
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(cacheKey, {
      data: recommendations,
      timestamp: Date.now()
    });
    
    logger.debug(`💾 Cached recommendations for key: ${cacheKey.substring(0, 50)}...`);
  }

  getLastUsedAgents() {
    return this.lastUsedAgents;
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
    logger.info('🧹 All caches cleared');
    addBreadcrumb('All caches cleared', 'performance', {});
  }

  // Get basic analytics
  async getRecommendationAnalytics() {
    try {
      const analytics = await this.sessionService.getAnalytics();
      const bookRatings = await this.sessionService.getRatingsByBook();
      
      return {
        ...analytics,
        bookPerformance: bookRatings,
        insights: this.generateInsights(analytics, bookRatings),
        pipeline: {
          type: this.useOptimizations ? 'AI_ONLY_OPTIMIZED' : 'AI_ONLY_STANDARD',
          agents: ['Profiler', 'Curator', 'Filter', 'Evaluator', 'Presenter'],
          aiCalls: 2, // Only Profiler and Curator make AI calls
          description: `${this.useOptimizations ? 'Optimized' : 'Standard'} pipeline with AI-generated complete recommendations`
        }
      };
      
    } catch (error) {
      logger.error('❌ Failed to get recommendation analytics:', error);
      captureRecommendationError(error, { context: 'recommendation_analytics' });
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
    
    // Pipeline insights
    insights.push({
      type: 'pipeline_performance',
      data: {
        type: this.useOptimizations ? 'AI_ONLY_OPTIMIZED' : 'AI_ONLY_STANDARD',
        aiCalls: 2,
        avgProcessingTime: this.useOptimizations ? '5-15 seconds' : '10-30 seconds'
      },
      message: `Using ${this.useOptimizations ? 'optimized' : 'standard'} AI-only pipeline with 2 AI calls per recommendation`
    });
    
    return insights;
  }
}