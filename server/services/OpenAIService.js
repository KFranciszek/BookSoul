import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

export class OpenAIService {
  constructor() {
    // Check if we have a valid API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    // Debug logging
    logger.debug(`🔍 OpenAI API Key check: ${apiKey ? 'PRESENT' : 'MISSING'}`);
    logger.debug(`🔍 API Key starts with: ${apiKey ? apiKey.substring(0, 7) : 'N/A'}`);
    
    if (!apiKey || apiKey === 'sk-test-key-placeholder' || apiKey.includes('your_openai_api_key')) {
      logger.error('❌ OpenAI API key not configured');
      this.client = null;
      this.isAvailable = false;
    } else {
      try {
        this.client = new OpenAI({
          apiKey: apiKey,
          timeout: 360000 

        });
        this.isAvailable = true;
        logger.info('✅ OpenAI client initialized successfully');
      } catch (error) {
        logger.error('❌ Failed to initialize OpenAI client:', error.message);
        this.client = null;
        this.isAvailable = false;
      }
    }
    
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async generateCompletion(prompt, options = {}) {
    // Check if service is available
    if (!this.isAvailable || !this.client) {
      throw new Error('AI recommendation service is currently unavailable. Please check your OpenAI API configuration.');
    }

    const defaultOptions = {
      model: this.model,
      temperature: 0.7,
      maxTokens: 1000,
      ...options
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`🤖 OpenAI request (attempt ${attempt}/${this.maxRetries})`);
        
        const response = await this.client.chat.completions.create({
          model: defaultOptions.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert book recommendation AI with deep knowledge of literature, psychology, and reader preferences. Always provide helpful, accurate, and personalized responses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: defaultOptions.temperature,
          max_tokens: defaultOptions.maxTokens,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        });

        const content = response.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        logger.debug(`✅ OpenAI response received (${content.length} chars)`);
        return content;

      } catch (error) {
        logger.error(`❌ OpenAI attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.maxRetries) {
          // After all retries failed, throw a user-friendly error
          if (error.code === 'insufficient_quota') {
            throw new Error('AI service quota exceeded. Please check your OpenAI billing settings.');
          } else if (error.code === 'invalid_api_key') {
            throw new Error('Invalid OpenAI API key. Please check your configuration.');
          } else if (error.code === 'rate_limit_exceeded') {
            throw new Error('AI service rate limit exceeded. Please try again in a few minutes.');
          } else {
            throw new Error(`AI recommendation service is temporarily unavailable: ${error.message}`);
          }
        }
        
        // Wait before retry
        await this.sleep(this.retryDelay * attempt);
      }
    }
  }

  async generateEmbedding(text) {
    if (!this.isAvailable || !this.client) {
      throw new Error('AI embedding service is currently unavailable. Please check your OpenAI API configuration.');
    }
    
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });

      return response.data[0].embedding;
      
    } catch (error) {
      logger.error('❌ OpenAI embedding failed:', error.message);
      throw new Error(`AI embedding service failed: ${error.message}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method
  async healthCheck() {
    if (!this.isAvailable || !this.client) {
      logger.info('❌ Health check: OpenAI service not available (not configured)');
      return false;
    }
    
    try {
      await this.generateCompletion('Say "OK" if you can respond.', {
        maxTokens: 10,
        temperature: 0
      });
      return true;
    } catch (error) {
      logger.error('❌ OpenAI health check failed:', error.message);
      return false;
    }
  }

  // Check if service is properly configured and available
  isServiceAvailable() {
    return this.isAvailable;
  }
}