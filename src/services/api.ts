import axios from 'axios';
import { SurveyData, BookRecommendation } from '../types';

// FIXED: Use proxy path instead of direct localhost URL
const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 360000, // 6 minutes timeout for AI processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`🔗 Full URL: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// FIXED: Improved response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    
    // Handle network errors specifically
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      throw new Error(`Cannot connect to backend server. Please ensure the backend server is running on port 3001 and try refreshing the page.`);
    }
    
    // Handle specific error cases
    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }
    
    if (error.response?.status === 503) {
      const errorData = error.response.data;
      if (errorData?.error === 'AI recommendation models are currently unavailable') {
        throw new Error(errorData.message || 'AI recommendation service is temporarily unavailable. Please check the system configuration.');
      }
      throw new Error('Service is temporarily unavailable. Please try again later.');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. The AI is taking longer than usual to process your request.');
    }
    
    // Handle connection refused
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection refused. Backend server is not running or not accessible.');
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
  // Generate recommendations using AI agents
  async generateRecommendations(surveyData: Partial<SurveyData>): Promise<{ recommendations: BookRecommendation[]; sessionId: string }> {
    try {
      console.log(`🎯 Generating ${surveyData.surveyMode} recommendations...`);
      console.log('📊 Survey data:', surveyData);
      
      const response = await api.post<RecommendationResponse>('/recommendations/generate', {
        surveyData
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to generate recommendations');
      }
      
      console.log(`✨ Generated ${response.data.data.recommendations.length} recommendations`);
      console.log(`🤖 Agents used: ${response.data.data.metadata.agentsUsed.join(', ')}`);
      console.log(`⏱️ Processing time: ${response.data.data.metadata.processingTime}ms`);
      console.log(`📝 Session ID: ${response.data.data.sessionId}`);
      
      return {
        recommendations: response.data.data.recommendations,
        sessionId: response.data.data.sessionId
      };
      
    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error);
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
      console.error('❌ Failed to get system status:', error);
      throw error;
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
      console.error('❌ Failed to create survey session:', error);
      throw error;
    }
  },

  // Submit a rating for a book recommendation
  async submitRating(sessionId: string, bookId: string, rating: number): Promise<boolean> {
    try {
      const response = await api.post('/sessions/rating', {
        sessionId,
        bookId,
        rating
      });
      
      return response.data.success;
      
    } catch (error) {
      console.error('❌ Failed to submit rating:', error);
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
      console.error('❌ Failed to fetch session:', error);
      return null;
    }
  },

  // Get analytics data (for admin use)
  async getAnalytics(): Promise<any> {
    try {
      const response = await api.get('/sessions/analytics');
      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to fetch analytics:', error);
      return null;
    }
  },

  // Health check for the API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('❌ API health check failed:', error);
      return false;
    }
  }
};

export default api;