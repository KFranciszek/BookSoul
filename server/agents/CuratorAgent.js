import { OpenAIService } from '../services/OpenAIService.js';
import { BookDatabase } from '../data/BookDatabase.js';
import { logger } from '../utils/logger.js';

export class CuratorAgent {
  constructor() {
    this.openai = new OpenAIService();
    this.bookDb = new BookDatabase();
    this.name = 'Curator';
    this.role = 'Generuje listę książek pasujących do profilu';
  }

  async generateBookCandidates(userProfile, surveyData) {
    logger.info(`📚 ${this.name}: Curating book candidates...`);
    
    try {
      const candidates = await this.getCandidatesFromMultipleSources(userProfile, surveyData);
      
      logger.info(`📚 ${this.name}: Generated ${candidates.length} candidates`);
      return candidates;
      
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error);
      return this.getFallbackCandidates(surveyData);
    }
  }

  async getCandidatesFromMultipleSources(userProfile, surveyData) {
    const candidates = [];
    
    // Source 1: AI-generated recommendations
    const aiCandidates = await this.getAIRecommendations(userProfile, surveyData);
    candidates.push(...aiCandidates);
    
    // Source 2: Database matching
    const dbCandidates = await this.bookDb.findMatchingBooks(userProfile, surveyData);
    candidates.push(...dbCandidates);
    
    // Source 3: Genre-based recommendations
    const genreCandidates = await this.getGenreBasedRecommendations(surveyData);
    candidates.push(...genreCandidates);
    
    // Remove duplicates and limit results
    const uniqueCandidates = this.removeDuplicates(candidates);
    return uniqueCandidates.slice(0, 20); // Limit to top 20 candidates
  }

  async getAIRecommendations(userProfile, surveyData) {
    const prompt = this.buildCurationPrompt(userProfile, surveyData);
    
    try {
      const response = await this.openai.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: 6000
      });
      
      return this.parseAIRecommendations(response);
      
    } catch (error) {
      logger.warn(`📚 ${this.name}: AI recommendations failed, using fallback`);
      return [];
    }
  }

  buildCurationPrompt(userProfile, surveyData) {
    const mode = surveyData.surveyMode;
    
    let prompt = `As a literary expert and book curator, recommend books based on this psychological profile:

User Profile:
- Emotional State: ${userProfile.emotionalState}
- Cognitive Style: ${userProfile.cognitiveStyle}
- Personality Traits: ${userProfile.personalityTraits?.join(', ')}
- Reading Motivation: ${userProfile.readingMotivation}
- Preferred Narrative Style: ${userProfile.preferredNarrativeStyle}
- Complexity Level: ${userProfile.complexityLevel}
- Emotional Tolerance: ${userProfile.emotionalTolerance}

Survey Mode: ${mode}
`;

    if (mode === 'cinema') {
      prompt += `
Favorite Films/Series: ${surveyData.favoriteFilms?.join(', ')}
Film Connection: ${surveyData.filmConnection || 'Not specified'}

Focus on books that:
1. Share narrative DNA with their favorite films
2. Have been adapted to screen or have cinematic qualities
3. Match the emotional tone and pacing of their preferred media
4. Offer similar character development and themes
`;
    } else {
      prompt += `
Favorite Genres: ${surveyData.favoriteGenres?.join(', ')}
Current Mood: ${surveyData.currentMood}
Reading Goal: ${surveyData.readingGoal}
`;
    }

    prompt += `
CRITICAL: You must return ONLY a valid JSON array. No additional text, explanations, or formatting.

Recommend 8-12 books that would perfectly match this profile. Return exactly this JSON structure:

[
  {
    "title": "Book Title",
    "author": "Author Name",
    "genre": ["genre1", "genre2"],
    "description": "Brief description",
    "matchReason": "Why this matches the user's profile",
    "emotionalTone": "light",
    "complexity": "medium",
    "pageCount": 300,
    "publicationYear": 2020,
    "themes": ["theme1", "theme2"]
  }
]

IMPORTANT RULES:
- emotionalTone must be exactly: "light", "medium", or "heavy"
- complexity must be exactly: "low", "medium", or "high"
- pageCount must be a number between 100-800
- publicationYear must be a 4-digit year between 1900-2024
- genre array should contain 1-3 genres
- themes array should contain 2-4 themes
- Focus on well-known, critically acclaimed, and widely available books
- Return ONLY the JSON array, no other text`;

    return prompt;
  }

  parseAIRecommendations(response) {
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanedResponse = response.trim();
      
      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
      
      // Find JSON array boundaries
      const startIndex = cleanedResponse.indexOf('[');
      const endIndex = cleanedResponse.lastIndexOf(']');
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('No JSON array found in response');
      }
      
      const jsonString = cleanedResponse.substring(startIndex, endIndex + 1);
      
      logger.debug(`📚 Attempting to parse JSON: ${jsonString.substring(0, 200)}...`);
      
      const books = JSON.parse(jsonString);
      
      if (!Array.isArray(books)) {
        throw new Error('Response is not an array');
      }
      
      // Validate and clean each book
      const validatedBooks = books
        .filter(book => this.validateBookStructure(book))
        .map(book => this.sanitizeBook(book))
        .slice(0, 12); // Limit to 12 books max
      
      logger.info(`📚 Successfully parsed ${validatedBooks.length} books from AI response`);
      
      return validatedBooks.map(book => ({
        ...book,
        id: this.generateBookId(book.title, book.author),
        source: 'ai_curator',
        confidence: 0.8,
        coverUrl: this.generateCoverUrl(book.title),
        purchaseLinks: this.generatePurchaseLinks(book.title, book.author)
      }));
      
    } catch (error) {
      logger.error(`📚 ${this.name}: Failed to parse AI response:`, error.message);
      logger.debug(`📚 Raw response: ${response.substring(0, 500)}...`);
      
      // Try alternative parsing methods
      return this.tryAlternativeParsing(response);
    }
  }

  validateBookStructure(book) {
    const requiredFields = ['title', 'author', 'description'];
    
    for (const field of requiredFields) {
      if (!book[field] || typeof book[field] !== 'string' || book[field].trim() === '') {
        logger.warn(`📚 Book missing required field: ${field}`);
        return false;
      }
    }
    
    return true;
  }

  sanitizeBook(book) {
    return {
      title: String(book.title).trim(),
      author: String(book.author).trim(),
      genre: Array.isArray(book.genre) ? book.genre.slice(0, 3) : ['fiction'],
      description: String(book.description).trim(),
      matchReason: String(book.matchReason || 'Matches your reading preferences').trim(),
      emotionalTone: this.validateEmotionalTone(book.emotionalTone),
      complexity: this.validateComplexity(book.complexity),
      pageCount: this.validatePageCount(book.pageCount),
      publicationYear: this.validatePublicationYear(book.publicationYear),
      themes: Array.isArray(book.themes) ? book.themes.slice(0, 4) : ['general']
    };
  }

  validateEmotionalTone(tone) {
    const validTones = ['light', 'medium', 'heavy'];
    return validTones.includes(tone) ? tone : 'medium';
  }

  validateComplexity(complexity) {
    const validComplexities = ['low', 'medium', 'high'];
    return validComplexities.includes(complexity) ? complexity : 'medium';
  }

  validatePageCount(pageCount) {
    const num = parseInt(pageCount);
    if (isNaN(num) || num < 100 || num > 800) {
      return 300; // Default page count
    }
    return num;
  }

  validatePublicationYear(year) {
    const num = parseInt(year);
    const currentYear = new Date().getFullYear();
    if (isNaN(num) || num < 1900 || num > currentYear) {
      return 2020; // Default year
    }
    return num;
  }

  tryAlternativeParsing(response) {
    logger.info(`📚 Attempting alternative parsing methods...`);
    
    try {
      // Method 1: Try to extract individual book objects
      const bookMatches = response.match(/\{[^{}]*"title"[^{}]*\}/g);
      if (bookMatches && bookMatches.length > 0) {
        const books = [];
        for (const match of bookMatches.slice(0, 8)) {
          try {
            const book = JSON.parse(match);
            if (this.validateBookStructure(book)) {
              books.push(this.sanitizeBook(book));
            }
          } catch (e) {
            continue;
          }
        }
        
        if (books.length > 0) {
          logger.info(`📚 Alternative parsing successful: ${books.length} books`);
          return books.map(book => ({
            ...book,
            id: this.generateBookId(book.title, book.author),
            source: 'ai_curator_alt',
            confidence: 0.7,
            coverUrl: this.generateCoverUrl(book.title),
            purchaseLinks: this.generatePurchaseLinks(book.title, book.author)
          }));
        }
      }
      
      // Method 2: Try to extract title-author pairs and create basic structure
      const titleMatches = response.match(/"title":\s*"([^"]+)"/g);
      const authorMatches = response.match(/"author":\s*"([^"]+)"/g);
      
      if (titleMatches && authorMatches && titleMatches.length === authorMatches.length) {
        const books = [];
        for (let i = 0; i < Math.min(titleMatches.length, 6); i++) {
          const title = titleMatches[i].match(/"title":\s*"([^"]+)"/)[1];
          const author = authorMatches[i].match(/"author":\s*"([^"]+)"/)[1];
          
          books.push({
            title,
            author,
            genre: ['fiction'],
            description: `A recommended book that matches your reading preferences.`,
            matchReason: 'Selected based on your profile',
            emotionalTone: 'medium',
            complexity: 'medium',
            pageCount: 300,
            publicationYear: 2020,
            themes: ['general'],
            id: this.generateBookId(title, author),
            source: 'ai_curator_minimal',
            confidence: 0.6,
            coverUrl: this.generateCoverUrl(title),
            purchaseLinks: this.generatePurchaseLinks(title, author)
          });
        }
        
        if (books.length > 0) {
          logger.info(`📚 Minimal parsing successful: ${books.length} books`);
          return books;
        }
      }
      
    } catch (error) {
      logger.error(`📚 Alternative parsing also failed:`, error.message);
    }
    
    // If all parsing fails, return empty array
    logger.warn(`📚 All parsing methods failed, returning empty array`);
    return [];
  }

  async getGenreBasedRecommendations(surveyData) {
    if (!surveyData.favoriteGenres?.length) return [];
    
    const genreBooks = [];
    
    for (const genre of surveyData.favoriteGenres.slice(0, 3)) {
      const books = await this.bookDb.getBooksByGenre(genre, 3);
      genreBooks.push(...books);
    }
    
    return genreBooks;
  }

  removeDuplicates(candidates) {
    const seen = new Set();
    return candidates.filter(book => {
      const key = `${book.title}-${book.author}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  generateBookId(title, author) {
    return `book_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  generateCoverUrl(title) {
    // Use Pexels for book cover placeholders
    const bookImages = [
      'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/1002638/pexels-photo-1002638.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/46274/pexels-photo-46274.jpeg?auto=compress&cs=tinysrgb&w=400'
    ];
    
    const hash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return bookImages[Math.abs(hash) % bookImages.length];
  }

  generatePurchaseLinks(title, author) {
    const encodedTitle = encodeURIComponent(`${title} ${author}`);
    
    return {
      amazon: `https://amazon.com/s?k=${encodedTitle}`,
      empik: `https://empik.com/szukaj/produkt?q=${encodedTitle}`,
      taniaKsiazka: `https://taniaksiazka.pl/szukaj?q=${encodedTitle}`
    };
  }

  getFallbackCandidates(surveyData) {
    // Fallback recommendations based on survey mode
    const fallbackBooks = this.bookDb.getFallbackRecommendations(surveyData.surveyMode);
    
    return fallbackBooks.map(book => ({
      ...book,
      source: 'fallback',
      confidence: 0.6
    }));
  }
}