import { ProfilerAgent } from '../agents/ProfilerAgent.js';
import { CuratorAgent } from '../agents/CuratorAgent.js';
import { FilterAgent } from '../agents/FilterAgent.js';
import { EvaluatorAgent } from '../agents/EvaluatorAgent.js';
import { PresenterAgent } from '../agents/PresenterAgent.js';
import { SurveySessionService } from './SurveySessionService.js';
import { logger } from '../utils/logger.js';

export class RecommendationOrchestrator {
  constructor() {
    this.profiler = new ProfilerAgent();
    this.curator = new CuratorAgent();
    this.filter = new FilterAgent();
    this.evaluator = new EvaluatorAgent();
    this.presenter = new PresenterAgent();
    this.sessionService = new SurveySessionService();
    this.lastUsedAgents = [];
    this.cache = new Map();
  }

  async generateRecommendations(surveyData) {
    const cacheKey = this.generateCacheKey(surveyData);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      logger.info('📦 Returning cached recommendations');
      return this.cache.get(cacheKey);
    }

    this.lastUsedAgents = [];
    
    try {
      // Check if AI services are available before starting
      const aiAvailable = this.profiler.openai.isServiceAvailable();
      
      if (!aiAvailable) {
        throw new Error('AI recommendation models are currently unavailable. Please ensure OpenAI API is properly configured and accessible.');
      }

      // Step 1: 🧠 Profile Analysis
      logger.info('🧠 Starting profile analysis...');
      this.lastUsedAgents.push('Profiler');
      const userProfile = await this.profiler.analyzeProfile(surveyData);
      
      // Step 2: 📚 Book Curation
      logger.info('📚 Curating book candidates...');
      this.lastUsedAgents.push('Curator');
      const bookCandidates = await this.curator.generateBookCandidates(userProfile, surveyData);
      
      // Step 3: 🚨 Content Filtering
      logger.info('🚨 Applying content filters...');
      this.lastUsedAgents.push('Filter');
      const filteredBooks = await this.filter.filterBooks(bookCandidates, surveyData);
      
      // Step 4: 🧪 Match Evaluation
      logger.info('🧪 Evaluating match scores...');
      this.lastUsedAgents.push('Evaluator');
      const evaluatedBooks = await this.evaluator.evaluateMatches(filteredBooks, userProfile, surveyData);
      
      // Step 5: 🧭 Presentation
      logger.info('🧭 Preparing final presentation...');
      this.lastUsedAgents.push('Presenter');
      const finalRecommendations = await this.presenter.presentRecommendations(evaluatedBooks, userProfile, surveyData);
      
      // Cache the results
      this.cache.set(cacheKey, finalRecommendations);
      
      // Clean cache if it gets too large
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      return finalRecommendations;
      
    } catch (error) {
      logger.error('❌ Orchestration failed:', error);
      
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
      triggers: surveyData.triggers?.sort()
    };
    
    return JSON.stringify(keyData);
  }

  getLastUsedAgents() {
    return this.lastUsedAgents;
  }

  // New method to get analytics for improving the model
  async getRecommendationAnalytics() {
    try {
      const analytics = await this.sessionService.getAnalytics();
      const bookRatings = await this.sessionService.getRatingsByBook();
      
      return {
        ...analytics,
        bookPerformance: bookRatings,
        insights: this.generateInsights(analytics, bookRatings)
      };
      
    } catch (error) {
      logger.error('❌ Failed to get recommendation analytics:', error);
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
      message: `${modePerformance[0].mode} mode is most popular (${modePerformance[0].percentage.toFixed(1)}%)`
    });
    
    // Rating distribution
    const totalRatings = Object.values(analytics.ratingsDistribution).reduce((sum, count) => sum + count, 0);
    if (totalRatings > 0) {
      const positiveRatings = analytics.ratingsDistribution[2];
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
      return {
        ai: false,
        database: false,
        overall: false
      };
    }
  }
}