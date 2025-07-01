import { OpenAIService } from '../services/OpenAIService.js';
import { logger } from '../utils/logger.js';
import { captureAgentError, addBreadcrumb } from '../utils/sentry.js';

export class ProfilerAgent {
  constructor() {
    this.openai = new OpenAIService();
    this.name = 'Profiler';
    this.role = 'Analizuje dane z ankiety, buduje profil emocjonalno-osobowościowy';
  }

  async analyzeProfile(surveyData) {
    logger.info(`🧠 ${this.name}: Analyzing user profile...`);
    
    addBreadcrumb(
      `${this.name} agent started`,
      'ai_agent',
      {
        agent: this.name,
        surveyMode: surveyData.surveyMode,
        hasGenres: !!surveyData.favoriteGenres?.length,
        hasFilms: !!surveyData.favoriteFilms?.length
      }
    );
    
    try {
      const prompt = this.buildProfilePrompt(surveyData);
      const analysis = await this.openai.generateCompletion(prompt, {
        temperature: 0.3,
        maxTokens: 800
      });

      const profile = this.parseProfileAnalysis(analysis, surveyData);
      
      logger.info(`🧠 ${this.name}: Profile analysis complete`);
      
      addBreadcrumb(
        `${this.name} agent completed`,
        'ai_agent',
        {
          agent: this.name,
          confidence: profile.confidence,
          emotionalState: profile.emotionalState,
          complexityLevel: profile.complexityLevel
        }
      );
      
      return profile;
      
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error);
      captureAgentError(this.name, error, {
        surveyMode: surveyData.surveyMode,
        context: 'profile_analysis'
      });
      return this.getFallbackProfile(surveyData);
    }
  }

  buildProfilePrompt(surveyData) {
    const mode = surveyData.surveyMode;
    
    let prompt = `As a psychology expert specializing in reading preferences, analyze this user's profile:

Survey Mode: ${mode}
`;

    if (mode === 'cinema') {
      prompt += `
Favorite Films/Series: ${surveyData.favoriteFilms?.join(', ') || 'Not specified'}
Film Connection: ${surveyData.filmConnection || 'Not specified'}

Analyze their cinematic preferences and create a psychological profile focusing on:
1. Narrative preferences (pacing, complexity, themes)
2. Emotional resonance patterns
3. Character development preferences
4. Visual storytelling appreciation
5. Genre crossover potential from screen to page
`;
    } else {
      prompt += `
Favorite Genres: ${surveyData.favoriteGenres?.join(', ') || 'Not specified'}
Current Mood: ${surveyData.currentMood || 'Not specified'}
Reading Goal: ${surveyData.readingGoal || 'Not specified'}
Action Pace: ${surveyData.actionPace || 'Not specified'}
Stress Level: ${surveyData.stressLevel || 'Not specified'}
`;

      if (mode === 'deep') {
        prompt += `
Complexity Tolerance: ${surveyData.complexityTolerance || 'Not specified'}
Book Length Preference: ${surveyData.bookLength || 'Not specified'}
Reading Frequency: ${surveyData.readingFrequency || 'Not specified'}
Learning Interest: ${surveyData.wantToLearn || 'Not specified'}
Motivation Needed: ${surveyData.motivationNeeded || 'Not specified'}
`;
      }
    }

    prompt += `
Create a comprehensive psychological profile including:
1. Emotional state and needs
2. Cognitive preferences
3. Personality indicators
4. Reading psychology patterns
5. Therapeutic reading potential

Return as JSON with these fields:
{
  "emotionalState": "description",
  "cognitiveStyle": "description", 
  "personalityTraits": ["trait1", "trait2"],
  "readingMotivation": "description",
  "therapeuticNeeds": "description",
  "preferredNarrativeStyle": "description",
  "complexityLevel": "low/medium/high",
  "emotionalTolerance": "low/medium/high"
}`;

    return prompt;
  }

  parseProfileAnalysis(analysis, surveyData) {
    try {
      const parsed = JSON.parse(analysis);
      
      return {
        ...parsed,
        surveyMode: surveyData.surveyMode,
        rawSurveyData: surveyData,
        profileGeneratedAt: new Date().toISOString(),
        confidence: this.calculateConfidence(surveyData)
      };
      
    } catch (error) {
      logger.warn(`🧠 ${this.name}: Failed to parse AI response, using fallback`);
      captureAgentError(this.name, error, {
        context: 'profile_parsing',
        rawResponse: analysis?.substring(0, 200)
      });
      return this.getFallbackProfile(surveyData);
    }
  }

  getFallbackProfile(surveyData) {
    const mode = surveyData.surveyMode;
    
    if (mode === 'cinema') {
      return {
        emotionalState: 'Seeking cinematic storytelling experience',
        cognitiveStyle: 'Visual and narrative-driven',
        personalityTraits: ['cinephile', 'story-focused', 'emotionally engaged'],
        readingMotivation: 'Finding books that capture film-like experiences',
        therapeuticNeeds: 'Escapism through immersive narratives',
        preferredNarrativeStyle: 'Cinematic and visual',
        complexityLevel: 'medium',
        emotionalTolerance: 'medium',
        surveyMode: mode,
        rawSurveyData: surveyData,
        profileGeneratedAt: new Date().toISOString(),
        confidence: 0.6
      };
    }
    
    return {
      emotionalState: surveyData.currentMood || 'neutral',
      cognitiveStyle: 'balanced',
      personalityTraits: ['curious', 'open-minded'],
      readingMotivation: surveyData.readingGoal || 'entertainment',
      therapeuticNeeds: 'moderate',
      preferredNarrativeStyle: surveyData.actionPace || 'moderate',
      complexityLevel: surveyData.complexityTolerance || 'medium',
      emotionalTolerance: 'medium',
      surveyMode: mode,
      rawSurveyData: surveyData,
      profileGeneratedAt: new Date().toISOString(),
      confidence: 0.7
    };
  }

  calculateConfidence(surveyData) {
    let confidence = 0.5;
    
    // More data = higher confidence
    const dataPoints = Object.values(surveyData).filter(v => v && v !== '').length;
    confidence += Math.min(dataPoints * 0.05, 0.3);
    
    // Specific mode bonuses
    if (surveyData.surveyMode === 'deep') confidence += 0.1;
    if (surveyData.surveyMode === 'cinema' && surveyData.favoriteFilms?.length >= 2) confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  }
}