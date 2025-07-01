import { OpenAIService } from '../services/OpenAIService.js';
import { logger } from '../utils/logger.js';

export class CuratorAgent {
  constructor() {
    this.openai = new OpenAIService();
    this.name = 'Curator';
    this.role = 'Generuje kompletne rekomendacje książek na podstawie profilu użytkownika';
  }

  async generateBookCandidates(userProfile, surveyData) {
    logger.info(`📚 ${this.name}: Generating complete book recommendations from AI...`);
    
    try {
      const candidates = await this.getAIGeneratedBooks(userProfile, surveyData);
      
      logger.info(`📚 ${this.name}: Generated ${candidates.length} AI-created book candidates`);
      return candidates;
      
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error);
      return this.getMinimalFallbackCandidates(surveyData);
    }
  }

  async getAIGeneratedBooks(userProfile, surveyData) {
    const prompt = this.buildComprehensiveBookGenerationPrompt(userProfile, surveyData);
    
    try {
      const response = await this.openai.generateCompletion(prompt, {
        temperature: 0.8, // Higher creativity for book generation
        maxTokens: 8000 // Bardziej konserwatywny limit
      });
      
      return this.parseAIGeneratedBooks(response, userProfile, surveyData);
      
    } catch (error) {
      logger.warn(`📚 ${this.name}: AI book generation failed, using minimal fallback`);
      throw error;
    }
  }

  buildComprehensiveBookGenerationPrompt(userProfile, surveyData) {
    const mode = surveyData.surveyMode;
    const isPolish = this.detectPolishPreference(surveyData);
    const language = isPolish ? 'Polish' : 'English';
    
    // Skrócony prompt dla lepszej wydajności
    let prompt = `As a literary expert, create ${mode === 'quick' ? '4-5' : mode === 'cinema' ? '3-4' : '6-7'} REAL book recommendations.

USER PROFILE:
- Emotional State: ${userProfile.emotionalState}
- Reading Motivation: ${userProfile.readingMotivation}
- Complexity Level: ${userProfile.complexityLevel}
- Survey Mode: ${mode}
`;

    if (mode === 'cinema') {
      prompt += `
- Favorite Films: ${surveyData.favoriteFilms?.join(', ')}
- Film Connection: ${surveyData.filmConnection || 'Not specified'}

Focus on books with cinematic qualities that match their film preferences.
`;
    } else {
      prompt += `
- Favorite Genres: ${surveyData.favoriteGenres?.join(', ')}
- Current Mood: ${surveyData.currentMood}
- Reading Goal: ${surveyData.readingGoal}
- Triggers to Avoid: ${surveyData.triggers?.join(', ') || 'None'}
`;
    }

    prompt += `
CRITICAL: Return ONLY valid JSON. Use REAL, existing books (1950-2024). All text in ${language}.

[
  {
    "title": "Real Book Title",
    "author": "Author Name",
    "genre": ["genre1", "genre2"],
    "description": "${language === 'Polish' ? 'Opis po polsku' : 'Description in English'}",
    "personalizedDescription": "${language === 'Polish' ? 'Dlaczego ta książka jest idealna dla Ciebie - po polsku' : 'Why this book is perfect for you - in English'}",
    "matchReason": "${language === 'Polish' ? 'Powód dopasowania po polsku' : 'Match reason in English'}",
    "emotionalTone": "light|medium|heavy",
    "complexity": "low|medium|high",
    "pageCount": 300,
    "publicationYear": 2020,
    "themes": ["theme1", "theme2"],
    "matchScore": 85,
    "matchingSteps": [
      "${language === 'Polish' ? 'Krok 1 po polsku' : 'Step 1 in English'}",
      "${language === 'Polish' ? 'Krok 2 po polsku' : 'Step 2 in English'}",
      "${language === 'Polish' ? 'Krok 3 po polsku' : 'Step 3 in English'}"
    ],
    "psychologicalMatch": {
      "moodAlignment": "${language === 'Polish' ? 'Dopasowanie nastroju po polsku' : 'Mood alignment in English'}",
      "cognitiveMatch": "${language === 'Polish' ? 'Dopasowanie poznawcze po polsku' : 'Cognitive match in English'}",
      "therapeuticValue": "${language === 'Polish' ? 'Wartość terapeutyczna po polsku' : 'Therapeutic value in English'}",
      "personalityFit": "${language === 'Polish' ? 'Dopasowanie osobowości po polsku' : 'Personality fit in English'}"
    }
  }
]

Return ONLY the JSON array.`;

    return prompt;
  }

  parseAIGeneratedBooks(response, userProfile, surveyData) {
    try {
      // Clean the response
      let cleanedResponse = response.trim();
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
      
      const startIndex = cleanedResponse.indexOf('[');
      const endIndex = cleanedResponse.lastIndexOf(']');
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('No JSON array found in AI response');
      }
      
      const jsonString = cleanedResponse.substring(startIndex, endIndex + 1);
      logger.debug(`📚 Parsing AI-generated books JSON: ${jsonString.substring(0, 200)}...`);
      
      const books = JSON.parse(jsonString);
      
      if (!Array.isArray(books)) {
        throw new Error('AI response is not an array');
      }
      
      // Validate and enhance each book
      const validatedBooks = books
        .filter(book => this.validateAIGeneratedBook(book))
        .map(book => this.enhanceAIGeneratedBook(book, surveyData))
        .slice(0, 10); // Limit to 10 books max
      
      logger.info(`📚 Successfully parsed ${validatedBooks.length} AI-generated books`);
      return validatedBooks;
      
    } catch (error) {
      logger.error(`📚 ${this.name}: Failed to parse AI-generated books:`, error.message);
      logger.debug(`📚 Raw AI response: ${response.substring(0, 500)}...`);
      throw new Error('Failed to parse AI-generated book recommendations');
    }
  }

  validateAIGeneratedBook(book) {
    const requiredFields = ['title', 'author', 'description'];
    
    for (const field of requiredFields) {
      if (!book[field] || typeof book[field] !== 'string' || book[field].trim() === '') {
        logger.warn(`📚 AI-generated book missing required field: ${field}`);
        return false;
      }
    }
    
    return true;
  }

  enhanceAIGeneratedBook(book, surveyData) {
    return {
      ...book,
      id: this.generateBookId(book.title, book.author),
      source: 'ai_generated',
      confidence: 0.9,
      coverUrl: this.generateCoverUrl(book.title),
      purchaseLinks: this.generatePurchaseLinks(book.title, book.author),
      bookDetails: this.generateBookDetails(book, surveyData),
      // Ensure all required fields have fallbacks
      genre: book.genre || ['fiction'],
      themes: book.themes || ['general'],
      matchScore: this.validateMatchScore(book.matchScore),
      emotionalTone: this.validateEmotionalTone(book.emotionalTone),
      complexity: this.validateComplexity(book.complexity),
      pageCount: this.validatePageCount(book.pageCount),
      publicationYear: this.validatePublicationYear(book.publicationYear),
      matchingSteps: book.matchingSteps || ['Matches your reading preferences'],
      psychologicalMatch: book.psychologicalMatch || {
        moodAlignment: 'Complements your current emotional state',
        cognitiveMatch: 'Matches your cognitive preferences',
        therapeuticValue: 'Supports your reading goals',
        personalityFit: 'Appeals to your personality traits'
      },
      personalizedDescription: book.personalizedDescription || book.description || 'A great book recommendation for you.'
    };
  }

  validateMatchScore(score) {
    const num = parseInt(score);
    if (isNaN(num) || num < 70 || num > 98) {
      return 85; // Default high score
    }
    return num;
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
    if (isNaN(num) || num < 150 || num > 800) {
      return 300;
    }
    return num;
  }

  validatePublicationYear(year) {
    const num = parseInt(year);
    const currentYear = new Date().getFullYear();
    if (isNaN(num) || num < 1950 || num > currentYear) {
      return 2020;
    }
    return num;
  }

  detectPolishPreference(surveyData) {
    const textFields = [
      surveyData.filmConnection,
      surveyData.favoriteBooks,
      surveyData.favoriteAuthors,
      ...(surveyData.favoriteFilms || [])
    ].filter(Boolean);
    
    const polishIndicators = /[ąćęłńóśźż]|się|jest|dla|czy|jak|gdzie|kiedy|dlaczego|bardzo|tylko|może|będzie|można|przez|oraz|także|między|podczas|według|właśnie|jednak|również|ponieważ|dlatego|żeby|aby|gdyby|jeśli|chociaż|mimo|oprócz|zamiast|wokół|około|podczas|przed|po|nad|pod|przy|bez|do|od|za|na|w|z|o|u|dla|przez|między|wśród|wobec|przeciwko|dzięki|zgodnie|według|wzdłuż|obok|koło|blisko|daleko|tutaj|tam|gdzie|kiedy|jak|dlaczego|czy|który|jaki|ile|kto|co|czyj|czym|kim|kogo|komu|czego|czemu|jakim|jaką|jakie|które|których|którym|którymi|tego|tej|tych|tym|tymi|ten|ta|to|te|ci|one|oni|ona|ono|jego|jej|ich|im|nimi|nią|nim|niego|niej/i;
    
    return textFields.some(text => polishIndicators.test(text));
  }

  generateBookId(title, author) {
    return `ai_book_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${author.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
  }

  generateCoverUrl(title) {
    const bookImages = [
      'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/1002638/pexels-photo-1002638.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/46274/pexels-photo-46274.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/694740/pexels-photo-694740.jpeg?auto=compress&cs=tinysrgb&w=400'
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

  generateBookDetails(book, surveyData) {
    const isPolish = this.detectPolishPreference(surveyData);
    const pageCount = book.pageCount || 300;
    
    let length, readingTime;
    
    if (isPolish) {
      if (pageCount < 200) {
        length = 'Krótka';
        readingTime = '2-4 godziny';
      } else if (pageCount > 400) {
        length = 'Długa';
        readingTime = '8-12 godzin';
      } else {
        length = 'Średnia';
        readingTime = '4-6 godzin';
      }
      
      return {
        length: `${length} (${pageCount} stron)`,
        difficulty: this.translateDifficulty(book.complexity || 'medium', isPolish),
        format: ['Fizyczna', 'E-book', 'Audiobook'],
        readingTime
      };
    } else {
      if (pageCount < 200) {
        length = 'Short';
        readingTime = '2-4 hours';
      } else if (pageCount > 400) {
        length = 'Long';
        readingTime = '8-12 hours';
      } else {
        length = 'Medium';
        readingTime = '4-6 hours';
      }
      
      return {
        length: `${length} (${pageCount} pages)`,
        difficulty: book.complexity || 'Medium',
        format: ['Physical', 'E-book', 'Audiobook'],
        readingTime
      };
    }
  }

  translateDifficulty(complexity, isPolish) {
    if (!isPolish) return complexity;
    
    const difficultyMap = {
      'low': 'Łatwa',
      'medium': 'Umiarkowana',
      'high': 'Trudna'
    };
    
    return difficultyMap[complexity] || 'Umiarkowana';
  }

  getMinimalFallbackCandidates(surveyData) {
    logger.warn(`📚 ${this.name}: Using minimal fallback - AI generation completely failed`);
    
    const isPolish = this.detectPolishPreference(surveyData);
    
    // Minimal fallback with just a few generic recommendations
    const fallbackBooks = [
      {
        id: 'fallback_1',
        title: 'The Midnight Library',
        author: 'Matt Haig',
        genre: ['fiction', 'philosophy'],
        description: isPolish ? 'Powieść o wszystkich wyborach, które składają się na dobrze przeżyte życie.' : 'A novel about all the choices that go into a life well lived.',
        personalizedDescription: isPolish ? 'Przemyślana eksploracja życiowych możliwości, która odpowiada Twoim obecnym potrzebom czytelniczym.' : 'A thoughtful exploration of life\'s possibilities that matches your current reading needs.',
        matchReason: isPolish ? 'Pasuje do Twojej preferencji dla znaczących, refleksyjnych treści' : 'Matches your preference for meaningful, reflective content',
        emotionalTone: 'medium',
        complexity: 'medium',
        pageCount: 288,
        publicationYear: 2020,
        themes: ['choices', 'regret', 'possibility'],
        matchScore: 75,
        matchingSteps: isPolish ? [
          'Dopasowuje się do Twojego obecnego stanu emocjonalnego',
          'Oferuje odpowiedni poziom złożoności',
          'Zapewnia znaczące treści do refleksji'
        ] : [
          'Aligns with your current emotional state',
          'Offers the right level of complexity',
          'Provides meaningful content for reflection'
        ],
        psychologicalMatch: isPolish ? {
          moodAlignment: 'Dopasowuje się do Twojego obecnego stanu emocjonalnego',
          cognitiveMatch: 'Pasuje do Twoich preferencji poznawczych',
          therapeuticValue: 'Wspiera Twoje cele czytelnicze',
          personalityFit: 'Przemawia do cech Twojej osobowości'
        } : {
          moodAlignment: 'Complements your current emotional state',
          cognitiveMatch: 'Matches your cognitive preferences',
          therapeuticValue: 'Supports your reading goals',
          personalityFit: 'Appeals to your personality traits'
        },
        source: 'fallback',
        confidence: 0.5,
        coverUrl: 'https://images.pexels.com/photos/1002638/pexels-photo-1002638.jpeg?auto=compress&cs=tinysrgb&w=400',
        purchaseLinks: this.generatePurchaseLinks('The Midnight Library', 'Matt Haig'),
        bookDetails: this.generateBookDetails({ pageCount: 288, complexity: 'medium' }, surveyData)
      }
    ];
    
    return fallbackBooks;
  }
}