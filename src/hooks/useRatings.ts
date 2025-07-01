import { useState, useCallback } from 'react';
import { recommendationAPI } from '../services/api';
import { captureError } from '../utils/sentry';

interface UseRatingsReturn {
  userRatings: Record<string, number>;
  isSubmitting: boolean;
  submitRating: (sessionId: string, bookId: string, rating: number) => Promise<boolean>;
}

export const useRatings = (): UseRatingsReturn => {
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitRating = useCallback(async (sessionId: string, bookId: string, rating: number): Promise<boolean> => {
    if (!sessionId) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ No session ID available for rating');
      }
      return false;
    }

    setIsSubmitting(true);
    
    try {
      // Update local state immediately for better UX
      setUserRatings(prev => ({
        ...prev,
        [bookId]: rating
      }));

      // Submit rating to backend
      const success = await recommendationAPI.submitRating(sessionId, bookId, rating);
      
      if (!success) {
        // Revert local state if submission failed
        setUserRatings(prev => {
          const newRatings = { ...prev };
          delete newRatings[bookId];
          return newRatings;
        });
      }
      
      return success;
      
    } catch (error) {
      // Revert local state on error
      setUserRatings(prev => {
        const newRatings = { ...prev };
        delete newRatings[bookId];
        return newRatings;
      });
      
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'useRatings',
        sessionId,
        bookId,
        rating
      });
      
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    userRatings,
    isSubmitting,
    submitRating
  };
};