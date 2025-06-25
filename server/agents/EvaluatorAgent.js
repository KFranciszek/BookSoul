import { OpenAIService } from '../services/OpenAIService.js';
import { logger } from '../utils/logger.js';

export class EvaluatorAgent {
  constructor() {
    this.openai = new OpenAIService();
    this.name = 'Evaluator';
    this.role = 'Nadaje każdej książce ocenę dopasowania (Match Score 0–100)';
  }

  async evaluateMatches(filteredBooks, userProfile, surveyData) {
    logger.info(`🧪 ${this.name}: Evaluating ${filteredBooks.length} books...`);
    
    const evaluatedBooks = [];
    
    for (const book of filteredBooks) {
      try {
        const evaluation = await this.evaluateBook(book, userProfile, surveyData);
        evaluatedBooks.push({
          ...book,
          ...evaluation
        });
      } catch (error) {
        logger.warn(`🧪 Failed to evaluate "${book.title}":`, error.message);
        // Add fallback evaluation
        evaluatedBooks.push({
          ...book,
          matchScore: this.calculateFallbackScore(book, userProfile, surveyData),
          matchingSteps: this.generateFallbackSteps(book, surveyData),
          psychologicalMatch: this.generateFallbackPsychMatch(book, userProfile)
        });
      }
    }
    
    // Sort by match score
    evaluatedBooks.sort((a, b) => b.matchScore - a.matchScore);
    
    logger.info(`🧪 ${this.name}: Evaluation complete, top score: ${evaluatedBooks[0]?.matchScore || 0}`);
    
    return evaluatedBooks;
  }

  async evaluateBook(book, userProfile, surveyData) {
    const prompt = this.buildEvaluationPrompt(book, userProfile, surveyData);
    
    const response = await this.openai.generateCompletion(prompt, {
      temperature: 0.2,
      maxTokens: 600
    });
    
    return this.parseEvaluation(response, book, userProfile, surveyData);
  }

  buildEvaluationPrompt(book, userProfile, surveyData) {
    return `As a book recommendation expert, evaluate how well this book matches the user's profile:

BOOK:
Title: ${book.title}
Author: ${book.author}
Genre: ${book.genre?.join(', ')}
Description: ${book.description}
Themes: ${book.themes?.join(', ')}
Complexity: ${book.complexity}
Emotional Tone: ${book.emotionalTone}

USER PROFILE:
Emotional State: ${userProfile.emotionalState}
Cognitive Style: ${userProfile.cognitiveStyle}
Personality Traits: ${userProfile.personalityTraits?.join(', ')}
Reading Motivation: ${userProfile.readingMotivation}
Complexity Level: ${userProfile.complexityLevel}
Emotional Tolerance: ${userProfile.emotionalTolerance}
Survey Mode: ${userProfile.surveyMode}

${userProfile.surveyMode === 'cinema' ? `
CINEMA PREFERENCES:
Favorite Films: ${surveyData.favoriteFilms?.join(', ')}
Film Connection: ${surveyData.filmConnection}
` : `
READING PREFERENCES:
Current Mood: ${surveyData.currentMood}
Reading Goal: ${surveyData.readingGoal}
Favorite Genres: ${surveyData.favoriteGenres?.join(', ')}
`}

Evaluate this match and return JSON:
{
  "matchScore": number_0_to_100,
  "matchingSteps": [
    "Step 1: Specific reason why this book matches",
    "Step 2: Another matching factor",
    "Step 3: Additional alignment point"
  ],
  "psychologicalMatch": {
    "moodAlignment": "How this book aligns with user's emotional state",
    "cognitiveMatch": "How complexity/style matches cognitive preferences", 
    "therapeuticValue": "Potential therapeutic or growth value",
    "personalityFit": "How this appeals to user's personality traits"
  }
}

Be specific and reference actual book content and user preferences.`;
  }

  parseEvaluation(response, book, userProfile, surveyData) {
    try {
      const evaluation = JSON.parse(response);
      
      // Validate and adjust match score
      evaluation.matchScore = Math.max(0, Math.min(100, evaluation.matchScore || 0));
      
      // Ensure we have all required fields
      if (!evaluation.matchingSteps?.length) {
        evaluation.matchingSteps = this.generateFallbackSteps(book, surveyData);
      }
      
      if (!evaluation.psychologicalMatch) {
        evaluation.psychologicalMatch = this.generateFallbackPsychMatch(book, userProfile);
      }
      
      return evaluation;
      
    } catch (error) {
      logger.warn(`🧪 Failed to parse evaluation for "${book.title}"`);
      return {
        matchScore: this.calculateFallbackScore(book, userProfile, surveyData),
        matchingSteps: this.generateFallbackSteps(book, surveyData),
        psychologicalMatch: this.generateFallbackPsychMatch(book, userProfile)
      };
    }
  }

  calculateFallbackScore(book, userProfile, surveyData) {
    let score = 50; // Base score
    
    // Genre matching
    if (surveyData.favoriteGenres?.length) {
      const genreMatch = book.genre?.some(g => 
        surveyData.favoriteGenres.some(fg => 
          g.toLowerCase().includes(fg.toLowerCase()) || 
          fg.toLowerCase().includes(g.toLowerCase())
        )
      );
      if (genreMatch) score += 20;
    }
    
    // Complexity matching
    if (book.complexity === userProfile.complexityLevel) {
      score += 15;
    }
    
    // Emotional tone matching
    if (book.emotionalTone && userProfile.emotionalTolerance) {
      const toneMap = { light: 'low', medium: 'medium', heavy: 'high' };
      if (toneMap[book.emotionalTone] === userProfile.emotionalTolerance) {
        score += 10;
      }
    }
    
    // Cinema mode specific scoring
    if (surveyData.surveyMode === 'cinema' && surveyData.favoriteFilms?.length) {
      // Boost score for books with cinematic qualities
      if (book.themes?.some(theme => 
        ['visual', 'cinematic', 'adaptation', 'screenplay'].includes(theme.toLowerCase())
      )) {
        score += 15;
      }
    }
    
    // Random variation to avoid ties
    score += Math.random() * 10 - 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
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
    
    return steps.length ? steps : ['General compatibility with user preferences'];
  }

  generateFallbackPsychMatch(book, userProfile) {
    return {
      moodAlignment: `Complements your ${userProfile.emotionalState || 'current emotional state'}`,
      cognitiveMatch: `Matches your ${userProfile.cognitiveStyle || 'cognitive'} preferences`,
      therapeuticValue: `Supports your ${userProfile.readingMotivation || 'reading goals'}`,
      personalityFit: `Appeals to ${userProfile.personalityTraits?.join(' and ') || 'your personality'} traits`
    };
  }
}