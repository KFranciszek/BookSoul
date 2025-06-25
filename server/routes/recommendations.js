import express from 'express';
import { validateSurveyData } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

// Export a function that creates the router with dependencies
export default function createRecommendationRoutes(orchestrator) {
  const router = express.Router();

  // Generate recommendations endpoint
  router.post('/generate', validateSurveyData, async (req, res) => {
    try {
      const { surveyData } = req.body;
      
      logger.info(`🎯 Processing ${surveyData.surveyMode} mode recommendation request`);
      
      // Check system availability first
      const systemStatus = await orchestrator.isSystemAvailable();
      
      if (!systemStatus.overall) {
        return res.status(503).json({
          success: false,
          error: 'AI recommendation models are currently unavailable',
          message: 'The AI recommendation system is not accessible at the moment. Please check your OpenAI API configuration or try again later.',
          details: {
            ai_service: systemStatus.ai ? 'available' : 'unavailable',
            database: systemStatus.database ? 'available' : 'in-memory fallback'
          }
        });
      }
      
      const startTime = Date.now();
      const recommendations = await orchestrator.generateRecommendations(surveyData);
      const processingTime = Date.now() - startTime;
      
      // Create session after generating recommendations
      const session = await orchestrator.sessionService.createSession({
        surveyData,
        recommendations,
        userEmail: surveyData.userEmail
      });
      
      logger.info(`✅ Generated ${recommendations.length} recommendations in ${processingTime}ms`);
      logger.info(`📝 Created session: ${session.id}`);
      
      res.json({
        success: true,
        data: {
          recommendations,
          sessionId: session.id,
          metadata: {
            mode: surveyData.surveyMode,
            processingTime,
            timestamp: new Date().toISOString(),
            agentsUsed: orchestrator.getLastUsedAgents(),
            systemStatus
          }
        }
      });
      
    } catch (error) {
      logger.error('❌ Recommendation generation failed:', error);
      
      // Check if it's a service unavailability error
      if (error.message.includes('unavailable') || error.message.includes('not configured')) {
        return res.status(503).json({
          success: false,
          error: 'AI recommendation models are currently unavailable',
          message: error.message,
          details: {
            error_type: 'service_unavailable',
            suggestion: 'Please check your OpenAI API configuration and ensure the service is accessible.'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate recommendations',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  // System status endpoint
  router.get('/status', async (req, res) => {
    try {
      const systemStatus = await orchestrator.isSystemAvailable();
      
      res.json({
        success: true,
        data: {
          status: systemStatus.overall ? 'available' : 'unavailable',
          services: {
            ai_models: systemStatus.ai ? 'available' : 'unavailable',
            database: systemStatus.database ? 'available' : 'in-memory fallback'
          },
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('❌ Failed to check system status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check system status'
      });
    }
  });

  // Get recommendation analytics (for admin use)
  router.get('/analytics', async (req, res) => {
    try {
      const analytics = await orchestrator.getRecommendationAnalytics();
      
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