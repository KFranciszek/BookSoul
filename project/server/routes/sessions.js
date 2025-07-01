import express from 'express';
import { logger } from '../utils/logger.js';

// Export a function that creates the router with dependencies
export default function createSessionRoutes(sessionService) {
  const router = express.Router();

  // Create a new survey session
  router.post('/create', async (req, res) => {
    try {
      const { surveyData, recommendations } = req.body;
      
      if (!surveyData || !recommendations) {
        return res.status(400).json({
          success: false,
          error: 'Survey data and recommendations are required'
        });
      }
      
      logger.info(`📝 Creating survey session for ${surveyData.surveyMode} mode`);
      
      const session = await sessionService.createSession({
        surveyData,
        recommendations,
        userEmail: surveyData.userEmail
      });
      
      logger.info(`✅ Survey session created: ${session.id}`);
      
      res.json({
        success: true,
        data: session
      });
      
    } catch (error) {
      logger.error('❌ Failed to create survey session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create survey session'
      });
    }
  });

  // Submit a rating for a book recommendation
  router.post('/rating', async (req, res) => {
    try {
      const { sessionId, bookId, rating } = req.body;
      
      if (!sessionId || !bookId || rating === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Session ID, book ID, and rating are required'
        });
      }
      
      // Validate rating value
      if (![0, 1, 2].includes(rating)) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be 0, 1, or 2'
        });
      }
      
      logger.info(`⭐ Submitting rating: ${sessionId} → ${bookId} = ${rating}`);
      
      const success = await sessionService.submitRating(sessionId, bookId, rating);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      logger.info(`✅ Rating submitted successfully`);
      
      res.json({
        success: true,
        message: 'Rating submitted successfully'
      });
      
    } catch (error) {
      logger.error('❌ Failed to submit rating:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit rating'
      });
    }
  });

  // Get session by ID
  router.get('/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await sessionService.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      res.json({
        success: true,
        data: session
      });
      
    } catch (error) {
      logger.error('❌ Failed to fetch session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session'
      });
    }
  });

  // Get analytics data
  router.get('/analytics', async (req, res) => {
    try {
      const analytics = await sessionService.getAnalytics();
      
      res.json({
        success: true,
        data: analytics
      });
      
    } catch (error) {
      logger.error('❌ Failed to fetch analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics'
      });
    }
  });

  return router;
}