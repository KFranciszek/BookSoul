import { OpenAIService } from '../services/OpenAIService.js';
import { logger } from '../utils/logger.js';

export class PresenterAgent {
  constructor() {
    this.openai = new OpenAIService();
    this.name = 'Presenter';
    this.role = 'Tworzy przyjazny, empatyczny komunikat z rekomendacjami';
  }

  async presentRecommendations(evaluatedBooks, userProfile, surveyData) {
    logger.info(`🧭 ${this.name}: Preparing final presentation...`);
    
    // Select top recommendations based on mode
    const topBooks = this.selectTopRecommendations(evaluatedBooks, surveyData);
    
    // Enhance each recommendation with personalized descriptions
    const enhancedBooks = await this.enhanceRecommendations(topBooks, userProfile, surveyData);
    
    logger.info(`🧭 ${this.name}: Prepared ${enhancedBooks.length} final recommendations`);
    
    return enhancedBooks;
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

  async enhanceRecommendations(books, userProfile, surveyData) {
    const enhancedBooks = [];
    
    for (const book of books) {
      try {
        const enhancement = await this.enhanceBook(book, userProfile, surveyData);
        enhancedBooks.push({
          ...book,
          ...enhancement,
          id: book.id || this.generateId(),
          bookDetails: this.generateBookDetails(book),
          purchaseLinks: book.purchaseLinks || this.generatePurchaseLinks(book.title, book.author)
        });
      } catch (error) {
        logger.warn(`🧭 Failed to enhance "${book.title}":`, error.message);
        // Use fallback enhancement
        enhancedBooks.push({
          ...book,
          personalizedDescription: this.generateFallbackDescription(book, userProfile, surveyData),
          id: book.id || this.generateId(),
          bookDetails: this.generateBookDetails(book),
          purchaseLinks: book.purchaseLinks || this.generatePurchaseLinks(book.title, book.author)
        });
      }
    }
    
    return enhancedBooks;
  }

  async enhanceBook(book, userProfile, surveyData) {
    const prompt = this.buildEnhancementPrompt(book, userProfile, surveyData);
    
    const response = await this.openai.generateCompletion(prompt, {
      temperature: 0.6,
      maxTokens: 300
    });
    
    return {
      personalizedDescription: response.trim()
    };
  }

  buildEnhancementPrompt(book, userProfile, surveyData) {
    const mode = surveyData.surveyMode;
    
    let prompt = `Write a personalized book description that speaks directly to this reader:

BOOK: "${book.title}" by ${book.author}
Original Description: ${book.description}
Match Score: ${book.matchScore}%

READER PROFILE:
- Emotional State: ${userProfile.emotionalState}
- Reading Motivation: ${userProfile.readingMotivation}
- Personality: ${userProfile.personalityTraits?.join(', ')}
- Survey Mode: ${mode}
`;

    if (mode === 'cinema') {
      prompt += `
- Favorite Films: ${surveyData.favoriteFilms?.join(', ')}
- Film Connection: ${surveyData.filmConnection || 'Not specified'}

Write 2-3 sentences explaining why this book will appeal to someone who loves these films. Focus on cinematic qualities, narrative style, and emotional resonance. Be warm and enthusiastic.`;
    } else {
      prompt += `
- Current Mood: ${surveyData.currentMood}
- Reading Goal: ${surveyData.readingGoal}
- Favorite Genres: ${surveyData.favoriteGenres?.join(', ')}

Write 2-3 sentences explaining why this book is perfect for them right now. Reference their mood, goals, and preferences. Be empathetic and encouraging.`;
    }

    prompt += `

Make it personal, warm, and compelling. Start with "Based on your..." or "Perfect for your..." or similar personal connection.`;

    return prompt;
  }

  generateFallbackDescription(book, userProfile, surveyData) {
    const mode = surveyData.surveyMode;
    
    if (mode === 'cinema') {
      return `Based on your love for ${surveyData.favoriteFilms?.slice(0, 2).join(' and ')}, this book captures the same ${surveyData.filmConnection || 'compelling storytelling'} that draws you to great cinema. ${book.description}`;
    }
    
    return `Perfect for your ${surveyData.currentMood || 'current'} mood and ${surveyData.readingGoal || 'reading goals'}, this ${book.genre?.join('/')} ${book.genre?.includes('fiction') ? 'novel' : 'book'} offers exactly what you're seeking. ${book.description}`;
  }

  generateId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateBookDetails(book) {
    const pageCount = book.pageCount || 300;
    let length = 'Medium';
    
    if (pageCount < 200) length = 'Short';
    else if (pageCount > 400) length = 'Long';
    
    let readingTime = '4-6 hours';
    if (pageCount < 200) readingTime = '2-4 hours';
    else if (pageCount > 400) readingTime = '8-12 hours';
    
    return {
      length: `${length} (${pageCount} pages)`,
      difficulty: book.complexity || 'Moderate',
      format: ['Physical', 'E-book', 'Audiobook'],
      readingTime
    };
  }

  generatePurchaseLinks(title, author) {
    const encodedTitle = encodeURIComponent(`${title} ${author}`);
    
    return {
      amazon: `https://amazon.com/s?k=${encodedTitle}`,
      empik: `https://empik.com/szukaj/produkt?q=${encodedTitle}`,
      taniaKsiazka: `https://taniaksiazka.pl/szukaj?q=${encodedTitle}`
    };
  }
}