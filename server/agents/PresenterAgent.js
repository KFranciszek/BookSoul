import { OpenAIService } from '../services/OpenAIService.js';
import { logger } from '../utils/logger.js';
import { detectPolishPreference, translateDifficulty } from '../utils/languageUtils.js';
import { generateBookDetails, generatePurchaseLinks } from '../utils/bookUtils.js';

export class PresenterAgent {
  constructor() {
    this.openai = new OpenAIService();
    this.name = 'Presenter';
    this.role = 'Finalizuje prezentację rekomendacji wygenerowanych przez AI';
  }

  async presentRecommendations(evaluatedBooks, userProfile, surveyData) {
    logger.info(`🧭 ${this.name}: Finalizing AI-generated recommendations...`);
    
    // Select top recommendations based on mode
    const topBooks = this.selectTopRecommendations(evaluatedBooks, surveyData);
    
    // Since books are already AI-generated with personalized descriptions,
    // we mainly need to ensure they have all required fields
    const finalBooks = await this.finalizeRecommendations(topBooks, userProfile, surveyData);
    
    logger.info(`🧭 ${this.name}: Finalized ${finalBooks.length} AI-generated recommendations`);
    
    return finalBooks;
  }

  selectTopRecommendations(evaluatedBooks, surveyData) {
    const mode = surveyData.surveyMode;
    let count;
    
    switch (mode) {
      case 'quick':
        count = 3;
        break;
      case 'cinema':
        count = 2;
        break;
      case 'deep':
        count = 4;
        break;
      default:
        count = 3;
    }
    
    return evaluatedBooks.slice(0, count);
  }

  async finalizeRecommendations(books, userProfile, surveyData) {
    const finalizedBooks = [];
    
    for (const book of books) {
      try {
        // Books are already AI-generated with most fields
        // We just need to ensure they have all required fields
        const finalizedBook = await this.ensureCompleteBook(book, userProfile, surveyData);
        finalizedBooks.push(finalizedBook);
      } catch (error) {
        logger.warn(`🧭 Failed to finalize "${book.title}":`, error.message);
        // Use the book as-is with fallback fields
        finalizedBooks.push({
          ...book,
          id: book.id || this.generateId(),
          bookDetails: book.bookDetails || generateBookDetails(book, surveyData),
          purchaseLinks: book.purchaseLinks || generatePurchaseLinks(book.title, book.author),
          psychologicalMatch: book.psychologicalMatch || this.generateLocalizedPsychMatch(book, userProfile, surveyData)
        });
      }
    }
    
    return finalizedBooks;
  }

  async ensureCompleteBook(book, userProfile, surveyData) {
    // The book should already have personalizedDescription from AI generation
    // We just need to ensure all required fields are present
    
    return {
      ...book,
      id: book.id || this.generateId(),
      bookDetails: book.bookDetails || generateBookDetails(book, surveyData),
      purchaseLinks: book.purchaseLinks || generatePurchaseLinks(book.title, book.author),
      psychologicalMatch: book.psychologicalMatch || this.generateLocalizedPsychMatch(book, userProfile, surveyData),
      // Ensure personalizedDescription exists (should be from AI)
      personalizedDescription: book.personalizedDescription || this.generateFallbackDescription(book, userProfile, surveyData)
    };
  }

  generateLocalizedPsychMatch(book, userProfile, surveyData) {
    const isPolish = detectPolishPreference(surveyData);
    
    if (isPolish) {
      return {
        moodAlignment: `Dopasowuje się do Twojego ${userProfile.emotionalState || 'obecnego stanu emocjonalnego'}`,
        cognitiveMatch: `Pasuje do Twoich ${userProfile.cognitiveStyle || 'poznawczych'} preferencji`,
        therapeuticValue: `Wspiera Twoje ${userProfile.readingMotivation || 'cele czytelnicze'}`,
        personalityFit: `Przemawia do cech ${userProfile.personalityTraits?.join(' i ') || 'Twojej osobowości'}`
      };
    } else {
      return {
        moodAlignment: `Complements your ${userProfile.emotionalState || 'current emotional state'}`,
        cognitiveMatch: `Matches your ${userProfile.cognitiveStyle || 'cognitive'} preferences`,
        therapeuticValue: `Supports your ${userProfile.readingMotivation || 'reading goals'}`,
        personalityFit: `Appeals to ${userProfile.personalityTraits?.join(' and ') || 'your personality'} traits`
      };
    }
  }

  generateFallbackDescription(book, userProfile, surveyData) {
    const mode = surveyData.surveyMode;
    const isPolish = detectPolishPreference(surveyData);
    
    if (isPolish) {
      if (mode === 'cinema') {
        return `Na podstawie Twojej miłości do ${surveyData.favoriteFilms?.slice(0, 2).join(' i ')}, ta książka oddaje to samo ${surveyData.filmConnection || 'fascynujące opowiadanie'}, które przyciąga Cię do wspaniałego kina. ${book.description}`;
      }
      
      return `Idealna dla Twojego ${surveyData.currentMood || 'obecnego'} nastroju i ${surveyData.readingGoal || 'celów czytelniczych'}, ta ${book.genres?.join('/')} ${book.genres?.includes('fiction') ? 'powieść' : 'książka'} oferuje dokładnie to, czego szukasz. ${book.description}`;
    }
    
    if (mode === 'cinema') {
      return `Based on your love for ${surveyData.favoriteFilms?.slice(0, 2).join(' and ')}, this book captures the same ${surveyData.filmConnection || 'compelling storytelling'} that draws you to great cinema. ${book.description}`;
    }
    
    return `Perfect for your ${surveyData.currentMood || 'current'} mood and ${surveyData.readingGoal || 'reading goals'}, this ${book.genres?.join('/')} ${book.genres?.includes('fiction') ? 'novel' : 'book'} offers exactly what you're seeking. ${book.description}`;
  }

  generateId() {
    return `ai_rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}