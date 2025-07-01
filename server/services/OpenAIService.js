import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { captureAIError, addBreadcrumb, captureMessage } from '../utils/sentry.js';

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
          timeout: 300000, // 5 minut - bardziej rozsądny timeout
          maxRetries: 2 // Wbudowane retry w kliencie OpenAI
        });
        this.isAvailable = true;
        logger.info('✅ OpenAI client initialized successfully with 5-minute timeout');
      } catch (error) {
        logger.error('❌ Failed to initialize OpenAI client:', error.message);
        captureAIError(error, { context: 'openai_initialization' });
        this.client = null;
        this.isAvailable = false;
      }
    }
    
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxRetries = 2; // Zmniejszone retry dla szybszego failover
    this.retryDelay = 1500; // Krótsze opóźnienia
  }

  async generateCompletion(prompt, options = {}) {
    // Check if service is available
    if (!this.isAvailable || !this.client) {
      const error = new Error('AI recommendation service is currently unavailable. Please check your OpenAI API configuration.');
      captureAIError(error, { context: 'service_unavailable' });
      throw error;
    }

    let defaultOptions = {
      model: this.model,
      temperature: 0.7,
      maxTokens: 6000, // Bardziej konserwatywny limit
      ...options
    };

    // Sprawdź czy model obsługuje żądaną liczbę tokenów
    const adjustedMaxTokens = this.adjustMaxTokensForModel(defaultOptions.model, defaultOptions.maxTokens);
    if (adjustedMaxTokens !== defaultOptions.maxTokens) {
      logger.info(`🔧 Adjusted maxTokens from ${defaultOptions.maxTokens} to ${adjustedMaxTokens} for model ${defaultOptions.model}`);
      defaultOptions.maxTokens = adjustedMaxTokens;
    }

    // Log full request to Sentry as message
    captureMessage(
      `OpenAI Request Started: ${defaultOptions.model}`,
      'info',
      {
        model: defaultOptions.model,
        maxTokens: defaultOptions.maxTokens,
        temperature: defaultOptions.temperature,
        promptLength: prompt.length,
        fullPrompt: prompt,
        requestOptions: defaultOptions
      }
    );

    // Add Sentry breadcrumb for OpenAI request with FULL PROMPT
    addBreadcrumb(
      `OpenAI request started`,
      'ai_service',
      {
        model: defaultOptions.model,
        maxTokens: defaultOptions.maxTokens,
        temperature: defaultOptions.temperature,
        promptLength: prompt.length,
        fullPrompt: prompt // FULL PROMPT LOGGED
      }
    );

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`🤖 OpenAI request (attempt ${attempt}/${this.maxRetries}) - Model: ${defaultOptions.model}, MaxTokens: ${defaultOptions.maxTokens}`);
        
        const startTime = Date.now();
        
        const response = await this.client.chat.completions.create({
          model: defaultOptions.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert book recommendation AI with deep knowledge of literature, psychology, and reader preferences. Always provide helpful, accurate, and personalized responses in the requested language. Focus on creating comprehensive, detailed recommendations that truly match the user\'s psychological profile and reading needs. Be concise but thorough.'
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

        const endTime = Date.now();
        const content = response.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        logger.info(`✅ OpenAI response received in ${endTime - startTime}ms (${content.length} chars, ${response.usage?.total_tokens || 'unknown'} tokens)`);
        
        // Log full successful response to Sentry as message
        captureMessage(
          `OpenAI Response Received Successfully: ${defaultOptions.model}`,
          'info',
          {
            model: defaultOptions.model,
            duration: endTime - startTime,
            responseLength: content.length,
            tokensUsed: response.usage?.total_tokens,
            attempt,
            fullResponse: content,
            usage: response.usage,
            fullPrompt: prompt
          }
        );

        // Add Sentry breadcrumb for successful OpenAI response with FULL RESPONSE
        addBreadcrumb(
          `OpenAI request completed`,
          'ai_service',
          {
            duration: endTime - startTime,
            responseLength: content.length,
            tokensUsed: response.usage?.total_tokens,
            attempt,
            fullResponse: content, // FULL RESPONSE LOGGED
            usage: response.usage // Complete usage statistics
          }
        );
        
        // Log token usage for monitoring
        if (response.usage) {
          logger.info(`📊 Token usage - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`);
          
          // Warn if approaching limits
          if (response.usage.total_tokens > 3000) {
            logger.warn(`⚠️ High token usage: ${response.usage.total_tokens} tokens`);
          }
        }
        
        return content;

      } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        logger.error(`❌ OpenAI attempt ${attempt} failed:`, errorMessage);
        
        // Log more details about the error
        if (error.response) {
          logger.error(`❌ OpenAI API Error Response:`, {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          });
        }
        
        // Log failed attempt to Sentry as message
        captureMessage(
          `OpenAI Request Failed (Attempt ${attempt}/${this.maxRetries})`,
          'warning',
          {
            model: defaultOptions.model,
            attempt,
            maxRetries: this.maxRetries,
            error: errorMessage,
            status: error.response?.status,
            code: error.code,
            fullPrompt: prompt,
            errorResponse: error.response?.data,
            requestOptions: defaultOptions
          }
        );
        
        // Add Sentry breadcrumb for failed attempt with FULL CONTEXT
        addBreadcrumb(
          `OpenAI request failed (attempt ${attempt})`,
          'ai_service',
          {
            error: errorMessage,
            attempt,
            maxRetries: this.maxRetries,
            status: error.response?.status,
            code: error.code,
            fullPrompt: prompt, // FULL PROMPT FOR FAILED REQUESTS
            errorResponse: error.response?.data // FULL ERROR RESPONSE
          }
        );
        
        if (attempt === this.maxRetries) {
          // After all retries failed, capture error in Sentry and throw user-friendly error
          captureAIError(error, {
            context: 'openai_request_failed',
            model: defaultOptions.model,
            maxTokens: defaultOptions.maxTokens,
            attempts: this.maxRetries,
            promptLength: prompt.length,
            fullPrompt: prompt, // FULL PROMPT IN ERROR CONTEXT
            fullErrorResponse: error.response?.data // FULL ERROR RESPONSE
          });
          
          if (error.code === 'insufficient_quota' || errorMessage.includes('quota')) {
            throw new Error('AI service quota exceeded. Please check your OpenAI billing settings.');
          } else if (error.code === 'invalid_api_key' || errorMessage.includes('api_key')) {
            throw new Error('Invalid OpenAI API key. Please check your configuration.');
          } else if (error.code === 'rate_limit_exceeded' || errorMessage.includes('rate_limit')) {
            throw new Error('AI service rate limit exceeded. Please try again in a few minutes.');
          } else if (errorMessage.includes('maximum context length') || errorMessage.includes('context_length_exceeded')) {
            throw new Error('Request too large for AI model. Please try with shorter input or different mode.');
          } else if (errorMessage.includes('max_tokens') || errorMessage.includes('token')) {
            throw new Error(`Token limit exceeded for model ${defaultOptions.model}. Maximum allowed: ${this.getMaxTokensForModel(defaultOptions.model)}`);
          } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNABORTED')) {
            throw new Error('AI service timeout. The request took too long to process. Please try again.');
          } else if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
            throw new Error('Network connection error. Please check your internet connection and try again.');
          } else {
            throw new Error(`AI recommendation service is temporarily unavailable: ${errorMessage}`);
          }
        }
        
        // Wait before retry with exponential backoff
        const delay = this.retryDelay * Math.pow(1.5, attempt - 1);
        logger.info(`⏳ Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }
  }

  // Dostosuj maxTokens do możliwości modelu
  adjustMaxTokensForModel(model, requestedTokens) {
    const modelLimits = this.getMaxTokensForModel(model);
    const safeLimit = Math.floor(modelLimits * 0.8); // 80% limitu dla bezpieczeństwa
    return Math.min(requestedTokens, safeLimit);
  }

  // Pobierz maksymalną liczbę tokenów dla danego modelu
  getMaxTokensForModel(model) {
    const modelTokenLimits = {
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 4096,
      'gpt-4-turbo-preview': 4096,
      'gpt-4o': 4096,
      'gpt-4o-mini': 16384,
      'gpt-4-1106-preview': 4096,
      'gpt-3.5-turbo-1106': 4096
    };
    
    return modelTokenLimits[model] || 4096; // Domyślnie 4096 dla nieznanych modeli
  }

  async generateEmbedding(text) {
    if (!this.isAvailable || !this.client) {
      const error = new Error('AI embedding service is currently unavailable. Please check your OpenAI API configuration.');
      captureAIError(error, { context: 'embedding_service_unavailable' });
      throw error;
    }
    
    try {
      // Log embedding request to Sentry as message
      captureMessage(
        'OpenAI Embedding Request Started',
        'info',
        {
          textLength: text.length,
          fullText: text,
          model: 'text-embedding-ada-002'
        }
      );

      addBreadcrumb(
        'OpenAI embedding request started',
        'ai_service',
        { 
          textLength: text.length,
          fullText: text // FULL TEXT FOR EMBEDDING
        }
      );
      
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });

      // Log successful embedding response to Sentry as message
      captureMessage(
        'OpenAI Embedding Response Received',
        'info',
        {
          textLength: text.length,
          embeddingLength: response.data[0].embedding.length,
          fullText: text,
          fullEmbedding: response.data[0].embedding,
          usage: response.usage
        }
      );

      addBreadcrumb(
        'OpenAI embedding completed',
        'ai_service',
        { 
          embeddingLength: response.data[0].embedding.length,
          fullEmbedding: response.data[0].embedding, // FULL EMBEDDING VECTOR
          usage: response.usage // USAGE STATISTICS
        }
      );

      return response.data[0].embedding;
      
    } catch (error) {
      logger.error('❌ OpenAI embedding failed:', error.message);
      
      // Log embedding error to Sentry as message
      captureMessage(
        'OpenAI Embedding Request Failed',
        'error',
        {
          textLength: text.length,
          fullText: text,
          error: error.message,
          fullErrorResponse: error.response?.data
        }
      );

      captureAIError(error, {
        context: 'openai_embedding_failed',
        textLength: text.length,
        fullText: text, // FULL TEXT IN ERROR CONTEXT
        fullErrorResponse: error.response?.data
      });
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
      logger.info('🔍 Performing OpenAI health check...');
      const startTime = Date.now();
      
      const healthCheckPrompt = 'Say "OK" if you can respond.';
      
      // Log health check request to Sentry as message
      captureMessage(
        'OpenAI Health Check Started',
        'info',
        {
          healthCheckPrompt: healthCheckPrompt,
          model: this.model
        }
      );
      
      addBreadcrumb(
        'OpenAI health check started',
        'ai_service',
        {}
      );
      
      const response = await this.generateCompletion(healthCheckPrompt, {
        maxTokens: 10,
        temperature: 0
      });
      
      const endTime = Date.now();
      logger.info(`✅ OpenAI health check passed in ${endTime - startTime}ms`);
      
      // Log successful health check to Sentry as message
      captureMessage(
        'OpenAI Health Check Completed Successfully',
        'info',
        {
          duration: endTime - startTime,
          healthCheckPrompt: healthCheckPrompt,
          healthCheckResponse: response,
          model: this.model
        }
      );
      
      addBreadcrumb(
        'OpenAI health check completed',
        'ai_service',
        { 
          duration: endTime - startTime, 
          status: 'success',
          healthCheckPrompt: healthCheckPrompt, // FULL HEALTH CHECK PROMPT
          healthCheckResponse: response // FULL HEALTH CHECK RESPONSE
        }
      );
      
      return true;
    } catch (error) {
      logger.error('❌ OpenAI health check failed:', error.message);
      
      // Log health check error to Sentry as message
      captureMessage(
        'OpenAI Health Check Failed',
        'error',
        {
          error: error.message,
          fullErrorResponse: error.response?.data,
          model: this.model
        }
      );

      captureAIError(error, { 
        context: 'openai_health_check_failed',
        fullErrorResponse: error.response?.data
      });
      
      addBreadcrumb(
        'OpenAI health check failed',
        'ai_service',
        { 
          error: error.message,
          fullErrorResponse: error.response?.data
        }
      );
      
      return false;
    }
  }

  // Check if service is properly configured and available
  isServiceAvailable() {
    return this.isAvailable;
  }

  // Get model information
  getModelInfo() {
    return {
      model: this.model,
      maxTokens: this.getMaxTokensForModel(this.model),
      available: this.isAvailable,
      timeout: 300000 // 5 minutes
    };
  }
}