import { useState, useCallback } from 'react';
import { SurveyData, BookRecommendation } from '../types';
import { recommendationAPI } from '../services/api';
import { captureError } from '../utils/sentry';

interface UseOptimizedRecommendationsReturn {
  recommendations: BookRecommendation[];
  isLoading: boolean;
  error: string | null;
  generateRecommendations: (surveyData: Partial<SurveyData>) => Promise<{ recommendations: BookRecommendation[]; sessionId: string } | null>;
  clearError: () => void;
}

export const useOptimizedRecommendations = (): UseOptimizedRecommendationsReturn => {
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRecommendations = useCallback(async (surveyData: Partial<SurveyData>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use optimized pipeline by default
      const result = await recommendationAPI.generateRecommendations(surveyData, true);
      setRecommendations(result.recommendations);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Capture error for monitoring
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'useOptimizedRecommendations',
        surveyMode: surveyData.surveyMode
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    recommendations,
    isLoading,
    error,
    generateRecommendations,
    clearError
  };
};