import axios from 'axios';
import { SurveyData, BookRecommendation } from '../types';
import { captureError, addBreadcrumb } from '../utils/sentry';

// Use proxy path instead of direct localhost URL
const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for AI processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and Sentry breadcrumbs
api.interceptors.request.use(
  (config) => {
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`🔗 Full URL: ${config.baseURL}${config.url}`);
    }
    
    // Add Sentry breadcrumb for API requests
    addBreadcrumb(
      `API Request: ${config.method?.toUpperCase()} ${config.url}`,
      'http',
      {
        url: `${config.baseURL}${config.url}`,
        method: config.method?.toUpperCase(),
        data: config.data ? 'present' : 'none'
      }
    );
    
    return config;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('❌ API Request Error:', error);
    }
    captureError(error, { context: 'api_request_interceptor' });
    return Promise.reject(error);
  }
);

// Improved response interceptor with better error handling and Sentry integration
api.interceptors.response.use(
  (response) => {
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    
    // Add Sentry breadcrumb for successful API responses
    addBreadcrumb(
      `API Response: ${response.status} ${response.config.url}`,
      'http',
      {
        status: response.status,
        url: response.config.url,
        responseSize: JSON.stringify(response.data).length
      }
    );
    
    return response;
  },
  (error) => {
    // Only log in development
    if (import.meta.env.DEV) {
      console.error('❌ API Response Error:', error.response?.data || error.message);
    }
    
    // Add Sentry breadcrumb for API errors
    addBreadcrumb(
      `API Error: ${error.response?.status || 'Network'} ${error.config?.url || 'Unknown'}`,
      'http',
      {
        status: error.response?.status,
        url: error.config?.url,
        errorMessage: error.message,
        errorData: error.response?.data
      }
    );
    
    // Capture error in Sentry with context
    captureError(error, {
      context: 'api_response_error',
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      responseData: error.response?.data
    });
    
    // Handle network errors specifically
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      throw new Error(`Nie można połączyć się z serwerem backend. Upewnij się, że serwer backend działa na porcie 3001 i odśwież stronę.`);
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Przekroczono limit czasu żądania. AI potrzebuje więcej czasu na przetworzenie Twojego żądania. Spróbuj ponownie.');
    }
    
    // Handle specific error cases
    if (error.response?.status === 429) {
      throw new Error('Zbyt wiele żądań. Poczekaj chwilę i spróbuj ponownie.');
    }
    
    if (error.response?.status === 503) {
      const errorData = error.response.data;
      if (errorData?.error === 'AI recommendation models are currently unavailable') {
        throw new Error(errorData.message || 'Usługa rekomendacji AI jest tymczasowo niedostępna. Sprawdź konfigurację systemu.');
      }
      throw new Error('Usługa jest tymczasowo niedostępna. Spróbuj ponownie później.');
    }
    
    if (error.response?.status === 500) {
      const errorData = error.response.data;
      if (errorData?.message?.includes('AI')) {
        throw new Error('Problem z usługą AI. Sprawdź konfigurację OpenAI API lub spróbuj ponownie.');
      }
      throw new Error('Błąd serwera. Spróbuj ponownie za chwilę.');
    }
    
    // Handle connection refused
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Połączenie odrzucone. Serwer backend nie działa lub nie jest dostępny.');
    }
    
    throw error;
  }
);

export interface RecommendationResponse {
  success: boolean;
  data: {
    recommendations: BookRecommendation[];
    sessionId: string;
    metadata: {
      mode: string;
      processingTime: number;
      timestamp: string;
      agentsUsed: string[];
      systemStatus: {
        ai: boolean;
        database: boolean;
        overall: boolean;
      };
      optimized?: boolean;
      performance?: {
        totalTime: number;
        averageTimePerBook: number;
        cacheHits: number;
      };
    };
  };
  error?: string;
  message?: string;
}

export interface SurveySession {
  id: string;
  survey_mode: string;
  survey_data: any;
  recommendations: BookRecommendation[];
  user_ratings: Record<string, number>;
  created_at: string;
  updated_at: string;
  user_email?: string;
  session_metadata: any;
}

export interface CreateSessionRequest {
  surveyData: Partial<SurveyData>;
  recommendations: BookRecommendation[];
}

export interface RatingRequest {
  sessionId: string;
  bookId: string;
  rating: number;
}

export interface SystemStatus {
  status: 'available' | 'unavailable';
  services: {
    ai_models: 'available' | 'unavailable';
    database: 'available' | 'in-memory fallback';
  };
  timestamp: string;
}

export const recommendationAPI = {
  // Generate recommendations using AI agents (OPTIMIZED VERSION)
  async generateRecommendations(surveyData: Partial<SurveyData>, useOptimized: boolean = true): Promise<{ recommendations: BookRecommendation[]; sessionId: string }> {
    try {
      const endpoint = useOptimized ? '/recommendations-optimized/generate' : '/recommendations/generate';
      
      // Only log in development
      if (import.meta.env.DEV) {
        console.log(`🎯 Generating ${surveyData.surveyMode} recommendations using ${useOptimized ? 'OPTIMIZED' : 'STANDARD'} pipeline...`);
        console.log('📊 Survey data:', surveyData);
      }
      
      // Add Sentry breadcrumb for recommendation generation start
      addBreadcrumb(
        `Starting recommendation generation`,
        'user_action',
        {
          mode: surveyData.surveyMode,
          pipeline: useOptimized ? 'optimized' : 'standard',
          hasGenres: !!surveyData.favoriteGenres?.length,
          hasFilms: !!surveyData.favoriteFilms?.length
        }
      );
      
      const response = await api.post<RecommendationResponse>(endpoint, {
        surveyData
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to generate recommendations');
      }
      
      const { recommendations, sessionId, metadata } = response.data.data;
      
      // Only log in development
      if (import.meta.env.DEV) {
        console.log(`✨ Generated ${recommendations.length} recommendations`);
        console.log(`🤖 Agents used: ${metadata.agentsUsed.join(', ')}`);
        console.log(`⏱️ Processing time: ${metadata.processingTime}ms`);
        console.log(`📝 Session ID: ${sessionId}`);
        
        if (metadata.optimized) {
          console.log(`🚀 OPTIMIZED pipeline used - ${metadata.performance?.averageTimePerBook}ms per book`);
        }
      }
      
      // Add Sentry breadcrumb for successful recommendation generation
      addBreadcrumb(
        `Recommendations generated successfully`,
        'user_action',
        {
          count: recommendations.length,
          processingTime: metadata.processingTime,
          sessionId,
          agentsUsed: metadata.agentsUsed.join(', ')
        }
      );
      
      return {
        recommendations,
        sessionId
      };
      
    } catch (error) {
      // Only log in development
      if (import.meta.env.DEV) {
        console.error('❌ Failed to generate recommendations:', error);
      }
      
      // Capture error in Sentry with detailed context
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'recommendation_generation',
        surveyMode: surveyData.surveyMode,
        useOptimized,
        hasGenres: !!surveyData.favoriteGenres?.length,
        hasFilms: !!surveyData.favoriteFilms?.length
      });
      
      throw error; // Re-throw the error to be handled by the UI
    }
  },

  // Check system status
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const response = await api.get<{ success: boolean; data: SystemStatus }>('/recommendations/status');
      
      if (!response.data.success) {
        throw new Error('Failed to get system status');
      }
      
      return response.data.data;
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Failed to get system status:', error);
      }
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'system_status_check'
      });
      throw error;
    }
  },

  // Get performance analytics (OPTIMIZED)
  async getPerformanceAnalytics(): Promise<any> {
    try {
      const response = await api.get('/recommendations-optimized/performance');
      return response.data.data;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Failed to fetch performance analytics:', error);
      }
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'performance_analytics'
      });
      return null;
    }
  },

  // Clear performance caches (OPTIMIZED)
  async clearPerformanceCache(): Promise<boolean> {
    try {
      const response = await api.post('/recommendations-optimized/clear-cache');
      return response.data.success;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Failed to clear performance cache:', error);
      }
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'cache_clear'
      });
      return false;
    }
  },

  // Create a new survey session
  async createSurveySession(data: CreateSessionRequest): Promise<SurveySession> {
    try {
      const response = await api.post<{ success: boolean; data: SurveySession }>('/sessions/create', data);
      
      if (!response.data.success) {
        throw new Error('Failed to create survey session');
      }
      
      return response.data.data;
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Failed to create survey session:', error);
      }
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'session_creation'
      });
      throw error;
    }
  },

  // Submit a rating for a book recommendation
  async submitRating(sessionId: string, bookId: string, rating: number): Promise<boolean> {
    try {
      addBreadcrumb(
        `Submitting rating`,
        'user_action',
        {
          sessionId,
          bookId,
          rating
        }
      );
      
      const response = await api.post('/sessions/rating', {
        sessionId,
        bookId,
        rating
      });
      
      return response.data.success;
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Failed to submit rating:', error);
      }
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'rating_submission',
        sessionId,
        bookId,
        rating
      });
      throw error;
    }
  },

  // Get session data by ID
  async getSession(sessionId: string): Promise<SurveySession | null> {
    try {
      const response = await api.get(`/sessions/${sessionId}`);
      
      if (!response.data.success) {
        return null;
      }
      
      return response.data.data;
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Failed to fetch session:', error);
      }
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'session_fetch',
        sessionId
      });
      return null;
    }
  },

  // Get analytics data (for admin use)
  async getAnalytics(): Promise<any> {
    try {
      const response = await api.get('/sessions/analytics');
      return response.data.data;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Failed to fetch analytics:', error);
      }
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'analytics_fetch'
      });
      return null;
    }
  },

  // Health check for the API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ API health check failed:', error);
      }
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'health_check'
      });
      return false;
    }
  }
};

export default api;