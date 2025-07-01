import express from 'express';
import { validateSurveyData } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

// Export a function that creates the router with dependencies
export default function createOptimizedRecommendationRoutes(orchestrator) {
  const router = express.Router();

  // Generate recommendations endpoint with performance monitoring
  router.post('/generate', validateSurveyData, async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { surveyData } = req.body;
      
      logger.info(`🎯 Processing OPTIMIZED ${surveyData.surveyMode} mode recommendation request`);
      
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
      
      const recommendations = await orchestrator.generateRecommendations(surveyData);
      const processingTime = Date.now() - startTime;
      
      // Create session after generating recommendations
      const session = await orchestrator.sessionService.createSession({
        surveyData,
        recommendations,
        userEmail: surveyData.userEmail
      });
      
      logger.info(`✅ OPTIMIZED: Generated ${recommendations.length} recommendations in ${processingTime}ms`);
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
            systemStatus,
            optimized: true,
            performance: {
              totalTime: processingTime,
              averageTimePerBook: Math.round(processingTime / recommendations.length),
              cacheHits: 0 // Would be tracked by optimizer
            }
          }
        }
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`❌ OPTIMIZED recommendation generation failed after ${processingTime}ms:`, error);
      
      // Check if it's a service unavailability error
      if (error.message.includes('unavailable') || error.message.includes('not configured')) {
        return res.status(503).json({
          success: false,
          error: 'AI recommendation models are currently unavailable',
          message: error.message,
          details: {
            error_type: 'service_unavailable',
            suggestion: 'Please check your OpenAI API configuration and ensure the service is accessible.',
            processingTime
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate recommendations',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        details: {
          processingTime,
          optimized: true
        }
      });
    }
  });

  // Performance analytics endpoint
  router.get('/performance', async (req, res) => {
    try {
      const analytics = await orchestrator.getPerformanceAnalytics();
      
      res.json({
        success: true,
        data: analytics
      });
      
    } catch (error) {
      logger.error('❌ Failed to fetch performance analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance analytics'
      });
    }
  });

  // Clear caches endpoint (for admin use)
  router.post('/clear-cache', async (req, res) => {
    try {
      orchestrator.clearAllCaches();
      
      res.json({
        success: true,
        message: 'All caches cleared successfully'
      });
      
    } catch (error) {
      logger.error('❌ Failed to clear caches:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear caches'
      });
    }
  });

  return router;
}