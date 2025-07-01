import { logger } from '../utils/logger.js';

export class BookDatabase {
  constructor() {
    // Remove static book database - everything will be AI generated
    this.books = [];
    logger.info('📚 BookDatabase: Initialized for AI-only mode (no static books)');
  }

  // Keep minimal methods for compatibility but return empty results
  async findMatchingBooks(userProfile, surveyData) {
    logger.debug('📊 BookDatabase: Skipping database search - using AI-only mode');
    return []; // Return empty - all books will come from AI
  }

  async getBooksByGenre(genre, limit = 5) {
    logger.debug(`📊 BookDatabase: Skipping genre search for ${genre} - using AI-only mode`);
    return []; // Return empty - all books will come from AI
  }

  getFallbackRecommendations(surveyMode) {
    logger.debug(`📊 BookDatabase: Skipping fallback for ${surveyMode} - using AI-only mode`);
    return []; // Return empty - all books will come from AI
  }

  // Keep utility methods for potential future use
  addBook(book) {
    logger.info(`📚 BookDatabase: Book addition skipped in AI-only mode: "${book.title}"`);
  }

  getStats() {
    return {
      totalBooks: 0,
      genres: 0,
      averagePageCount: 0,
      complexityDistribution: {
        low: 0,
        medium: 0,
        high: 0
      },
      mode: 'AI_ONLY'
    };
  }
}