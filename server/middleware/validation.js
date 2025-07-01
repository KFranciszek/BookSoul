import { logger } from '../utils/logger.js';

export const validateSurveyData = (req, res, next) => {
  const { surveyData } = req.body;
  
  if (!surveyData) {
    return res.status(400).json({
      success: false,
      error: 'Survey data is required'
    });
  }
  
  // Validate survey mode
  const validModes = ['quick', 'deep', 'cinema', 'bookInspiration'];
  if (!validModes.includes(surveyData.surveyMode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid survey mode. Must be one of: ' + validModes.join(', ')
    });
  }
  
  // Validate data consent
  if (!surveyData.dataConsent) {
    return res.status(400).json({
      success: false,
      error: 'Data consent is required'
    });
  }
  
  // Mode-specific validation
  const validationResult = validateModeSpecificData(surveyData);
  if (!validationResult.valid) {
    return res.status(400).json({
      success: false,
      error: validationResult.error
    });
  }
  
  // Sanitize data
  req.body.surveyData = sanitizeSurveyData(surveyData);
  
  logger.info(`✅ Survey data validated for ${surveyData.surveyMode} mode`);
  next();
};

function validateModeSpecificData(surveyData) {
  const mode = surveyData.surveyMode;
  
  switch (mode) {
    case 'cinema':
      if (!surveyData.favoriteFilms || surveyData.favoriteFilms.filter(f => f?.trim()).length < 2) {
        return {
          valid: false,
          error: 'Cinema mode requires at least 2 favorite films'
        };
      }
      break;
      
    case 'quick':
      const requiredQuickFields = ['favoriteGenres', 'currentMood', 'readingGoal'];
      for (const field of requiredQuickFields) {
        if (!surveyData[field] || (Array.isArray(surveyData[field]) && surveyData[field].length === 0)) {
          return {
            valid: false,
            error: `Quick mode requires ${field}`
          };
        }
      }
      break;
      
    case 'deep':
      const requiredDeepFields = ['favoriteGenres', 'currentMood', 'readingGoal', 'stressLevel'];
      for (const field of requiredDeepFields) {
        if (!surveyData[field] || (Array.isArray(surveyData[field]) && surveyData[field].length === 0)) {
          return {
            valid: false,
            error: `Deep mode requires ${field}`
          };
        }
      }
      break;

    case 'bookInspiration':
      // Add validation for bookInspiration mode if needed
      // For now, we'll allow it to pass through without specific validation
      break;
  }
  
  return { valid: true };
}

function sanitizeSurveyData(surveyData) {
  const sanitized = { ...surveyData };
  
  // Sanitize string fields
  const stringFields = [
    'currentMood', 'readingGoal', 'actionPace', 'stressLevel', 
    'complexityTolerance', 'bookLength', 'bookFormat', 'readingFrequency',
    'filmConnection', 'userEmail'
  ];
  
  stringFields.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitized[field].trim().substring(0, 500); // Limit length
    }
  });
  
  // Sanitize array fields
  const arrayFields = ['favoriteGenres', 'triggers', 'favoriteFilms'];
  
  arrayFields.forEach(field => {
    if (sanitized[field] && Array.isArray(sanitized[field])) {
      sanitized[field] = sanitized[field]
        .filter(item => item && typeof item === 'string')
        .map(item => item.trim().substring(0, 200))
        .slice(0, 10); // Limit array size
    }
  });
  
  // Sanitize text areas
  const textFields = ['favoriteBooks', 'favoriteAuthors', 'filmConnection'];
  
  textFields.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitized[field].trim().substring(0, 1000);
    }
  });
  
  return sanitized;
}

export const validateFeedback = (req, res, next) => {
  const { recommendationId, rating, feedback } = req.body;
  
  if (!recommendationId) {
    return res.status(400).json({
      success: false,
      error: 'Recommendation ID is required'
    });
  }
  
  if (rating !== undefined) {
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be a number between 1 and 5'
      });
    }
    req.body.rating = numRating;
  }
  
  if (feedback && typeof feedback === 'string') {
    req.body.feedback = feedback.trim().substring(0, 1000);
  }
  
  next();
};