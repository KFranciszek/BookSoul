import { OpenAIService } from '../services/OpenAIService.js';
import { logger } from '../utils/logger.js';
import { detectPolishPreference } from '../utils/languageUtils.js';
import { 
  validateAIGeneratedBook, 
  enhanceAIGeneratedBook,
  generateBookId,
  generateCoverUrl,
  generatePurchaseLinks,
  generateBookDetails
} from '../utils/bookUtils.js';

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
        maxTokens: 8000 // Conservative limit
      });
      
      return this.parseAIGeneratedBooks(response, userProfile, surveyData);
      
    } catch (error) {
      logger.warn(`📚 ${this.name}: AI book generation failed, using minimal fallback`);
      throw error;
    }
  }

  buildComprehensiveBookGenerationPrompt(userProfile, surveyData) {
    const mode = surveyData.surveyMode;
    const isPolish = detectPolishPreference(surveyData);
    const language = isPolish ? 'Polish' : 'English';
    
    // Shortened prompt for better performance
    let prompt = `As a literary expert, create ${mode === 'quick' ? '4-5' : mode === 'cinema' ? '3-4' : mode === 'bookInspiration' ? '4-5' : '6-7'} REAL book recommendations.

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
    } else if (mode === 'bookInspiration') {
      prompt += `
- Favorite Books: ${surveyData.favoriteBooks?.map(book => `"${book.title}" (loved because: ${book.whyLoved})`).join(', ')}

Focus on books similar to their favorites, analyzing what they loved about each book and finding books with similar qualities.
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
    "genres": ["genre1", "genre2"],
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
      
      // Validate and enhance each book using centralized utilities
      const validatedBooks = books
        .filter(book => validateAIGeneratedBook(book))
        .map(book => enhanceAIGeneratedBook(book, surveyData))
        .slice(0, 10); // Limit to 10 books max
      
      logger.info(`📚 Successfully parsed ${validatedBooks.length} AI-generated books`);
      return validatedBooks;
      
    } catch (error) {
      logger.error(`📚 ${this.name}: Failed to parse AI-generated books:`, error.message);
      logger.debug(`📚 Raw AI response: ${response.substring(0, 500)}...`);
      throw new Error('Failed to parse AI-generated book recommendations');
    }
  }

  getMinimalFallbackCandidates(surveyData) {
    logger.warn(`📚 ${this.name}: Using minimal fallback - AI generation completely failed`);
    
    const isPolish = detectPolishPreference(surveyData);
    
    // Minimal fallback with just a few generic recommendations
    const fallbackBooks = [
      {
        id: generateBookId('The Midnight Library', 'Matt Haig'),
        title: 'The Midnight Library',
        author: 'Matt Haig',
        genres: ['fiction', 'philosophy'],
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
        coverUrl: generateCoverUrl('The Midnight Library'),
        purchaseLinks: generatePurchaseLinks('The Midnight Library', 'Matt Haig'),
        bookDetails: generateBookDetails({ pageCount: 288, complexity: 'medium' }, surveyData)
      }
    ];
    
    return fallbackBooks;
  }
}