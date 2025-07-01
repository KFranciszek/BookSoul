// Centralized language detection utility
import { logger } from './logger.js';

/**
 * Detects if user prefers Polish language based on survey data
 * @param {Object} surveyData - Survey data containing text fields
 * @returns {boolean} - True if Polish preference detected
 */
export const detectPolishPreference = (surveyData) => {
  const textFields = [
    surveyData.filmConnection,
    surveyData.favoriteBooks,
    surveyData.favoriteAuthors,
    ...(surveyData.favoriteFilms || [])
  ].filter(Boolean);
  
  const polishIndicators = /[ąćęłńóśźż]|się|jest|dla|czy|jak|gdzie|kiedy|dlaczego|bardzo|tylko|może|będzie|można|przez|oraz|także|między|podczas|według|właśnie|jednak|również|ponieważ|dlatego|żeby|aby|gdyby|jeśli|chociaż|mimo|oprócz|zamiast|wokół|około|podczas|przed|po|nad|pod|przy|bez|do|od|za|na|w|z|o|u|dla|przez|między|wśród|wobec|przeciwko|dzięki|zgodnie|według|wzdłuż|obok|koło|blisko|daleko|tutaj|tam|gdzie|kiedy|jak|dlaczego|czy|który|jaki|ile|kto|co|czyj|czym|kim|kogo|komu|czego|czemu|jakim|jaką|jakie|które|których|którym|którymi|tego|tej|tych|tym|tymi|ten|ta|to|te|ci|one|oni|ona|ono|jego|jej|ich|im|nimi|nią|nim|niego|niej/i;
  
  const isPolish = textFields.some(text => polishIndicators.test(text));
  
  logger.debug(`Language detection: ${isPolish ? 'Polish' : 'English'} (based on ${textFields.length} text fields)`);
  
  return isPolish;
};

/**
 * Translates difficulty level to Polish
 * @param {string} complexity - Complexity level (low/medium/high)
 * @param {boolean} isPolish - Whether to translate to Polish
 * @returns {string} - Translated difficulty level
 */
export const translateDifficulty = (complexity, isPolish) => {
  if (!isPolish) return complexity;
  
  const difficultyMap = {
    'low': 'Łatwa',
    'medium': 'Umiarkowana',
    'high': 'Trudna'
  };
  
  return difficultyMap[complexity] || 'Umiarkowana';
};