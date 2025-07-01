import { OpenAIService } from '../services/OpenAIService.js';
import { logger } from '../utils/logger.js';

export class EvaluatorAgent {
  constructor() {
    this.openai = new OpenAIService();
    this.name = 'Evaluator';
    this.role = 'Weryfikuje i dostosowuje oceny dopasowania wygenerowane przez AI';
  }

  async evaluateMatches(filteredBooks, userProfile, surveyData) {
    logger.info(`🧪 ${this.name}: Processing ${filteredBooks.length} AI-generated books...`);
    
    // Since books are now fully AI-generated with match scores, 
    // we mainly validate and potentially adjust them
    let evaluatedBooks = []; // FIXED: Changed from const to let
    
    for (const book of filteredBooks) {
      try {
        // Books from AI already have match scores and psychological matches
        // We can optionally refine them or just validate
        const evaluation = await this.validateAndRefineEvaluation(book, userProfile, surveyData);
        evaluatedBooks.push({
          ...book,
          ...evaluation
        });
      } catch (error) {
        logger.warn(`🧪 Failed to refine evaluation for "${book.title}":`, error.message);
        // Use the AI-generated evaluation as-is
        evaluatedBooks.push({
          ...book,
          matchScore: book.matchScore || this.calculateFallbackScore(book, userProfile, surveyData),
          matchingSteps: book.matchingSteps || this.generateFallbackSteps(book, surveyData),
          psychologicalMatch: book.psychologicalMatch || this.generateFallbackPsychMatch(book, userProfile, surveyData)
        });
      }
    }
    
    // Sort by match score (AI-generated scores)
    evaluatedBooks.sort((a, b) => b.matchScore - a.matchScore);
    
    logger.info(`🧪 ${this.name}: Evaluation complete, top score: ${evaluatedBooks[0]?.matchScore || 0}`);
    
    return evaluatedBooks;
  }

  async validateAndRefineEvaluation(book, userProfile, surveyData) {
    // Since the book already has AI-generated evaluation, we can either:
    // 1. Use it as-is (faster)
    // 2. Optionally refine it with another AI call (more accurate but slower)
    
    // For now, let's use the AI-generated evaluation as-is but validate it
    const matchScore = this.validateMatchScore(book.matchScore);
    const matchingSteps = this.validateMatchingSteps(book.matchingSteps, book, surveyData);
    const psychologicalMatch = this.validatePsychologicalMatch(book.psychologicalMatch, userProfile);
    
    return {
      matchScore,
      matchingSteps,
      psychologicalMatch
    };
  }

  validateMatchScore(score) {
    if (typeof score === 'number' && score >= 70 && score <= 98) {
      return score;
    }
    return 85; // Default good score
  }

  validateMatchingSteps(steps, book, surveyData) {
    if (Array.isArray(steps) && steps.length >= 3) {
      return steps;
    }
    return this.generateFallbackSteps(book, surveyData);
  }

  validatePsychologicalMatch(psychMatch, userProfile) {
    if (psychMatch && 
        psychMatch.moodAlignment && 
        psychMatch.cognitiveMatch && 
        psychMatch.therapeuticValue && 
        psychMatch.personalityFit) {
      return psychMatch;
    }
    return this.generateFallbackPsychMatch({}, userProfile);
  }

  // Keep existing fallback methods for edge cases
  calculateFallbackScore(book, userProfile, surveyData) {
    let score = 80; // Higher base score since these are AI-curated
    
    // Genre matching
    if (surveyData.favoriteGenres?.length) {
      const genreMatch = book.genre?.some(g => 
        surveyData.favoriteGenres.some(fg => 
          g.toLowerCase().includes(fg.toLowerCase()) || 
          fg.toLowerCase().includes(g.toLowerCase())
        )
      );
      if (genreMatch) score += 10;
    }
    
    // Complexity matching
    if (book.complexity === userProfile.complexityLevel) {
      score += 5;
    }
    
    // Random variation to avoid ties
    score += Math.random() * 5;
    
    return Math.max(70, Math.min(98, Math.round(score)));
  }

  generateFallbackSteps(book, surveyData) {
    const steps = [];
    
    if (surveyData.surveyMode === 'cinema') {
      steps.push(`Film preferences: ${surveyData.favoriteFilms?.slice(0, 2).join(', ')} → Similar narrative style`);
      if (surveyData.filmConnection) {
        steps.push(`Connection: "${surveyData.filmConnection}" → Matching thematic elements`);
      }
      steps.push(`CineMatch™ algorithm → Screen-to-page adaptation potential`);
    } else {
      if (surveyData.currentMood) {
        steps.push(`Current mood: ${surveyData.currentMood} → Emotionally resonant content`);
      }
      if (surveyData.readingGoal) {
        steps.push(`Reading goal: ${surveyData.readingGoal} → Aligned purpose and themes`);
      }
      if (surveyData.favoriteGenres?.length) {
        steps.push(`Genre preference: ${surveyData.favoriteGenres.slice(0, 2).join(', ')} → Perfect genre match`);
      }
    }
    
    return steps.length ? steps : ['AI-curated match based on your psychological profile'];
  }

  generateFallbackPsychMatch(book, userProfile, surveyData) {
    const isPolish = this.detectPolishPreference(surveyData);
    
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
}