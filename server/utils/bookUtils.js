// Centralized book utilities for validation and generation
import { logger } from './logger.js';
import { detectPolishPreference, translateDifficulty } from './languageUtils.js';

/**
 * Validates and normalizes match score
 * @param {number} score - Raw match score
 * @returns {number} - Validated score between 70-98
 */
export const validateMatchScore = (score) => {
  const num = parseInt(score);
  if (isNaN(num) || num < 70 || num > 98) {
    return 85; // Default high score
  }
  return num;
};

/**
 * Validates emotional tone
 * @param {string} tone - Emotional tone
 * @returns {string} - Valid emotional tone
 */
export const validateEmotionalTone = (tone) => {
  const validTones = ['light', 'medium', 'heavy'];
  return validTones.includes(tone) ? tone : 'medium';
};

/**
 * Validates complexity level
 * @param {string} complexity - Complexity level
 * @returns {string} - Valid complexity level
 */
export const validateComplexity = (complexity) => {
  const validComplexities = ['low', 'medium', 'high'];
  return validComplexities.includes(complexity) ? complexity : 'medium';
};

/**
 * Validates page count
 * @param {number} pageCount - Page count
 * @returns {number} - Valid page count between 150-800
 */
export const validatePageCount = (pageCount) => {
  const num = parseInt(pageCount);
  if (isNaN(num) || num < 150 || num > 800) {
    return 300;
  }
  return num;
};

/**
 * Validates publication year
 * @param {number} year - Publication year
 * @returns {number} - Valid publication year
 */
export const validatePublicationYear = (year) => {
  const num = parseInt(year);
  const currentYear = new Date().getFullYear();
  if (isNaN(num) || num < 1950 || num > currentYear) {
    return 2020;
  }
  return num;
};

/**
 * Generates unique book ID
 * @param {string} title - Book title
 * @param {string} author - Book author
 * @returns {string} - Unique book ID
 */
export const generateBookId = (title, author) => {
  return `ai_book_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${author.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
};

/**
 * Generates cover URL for book
 * @param {string} title - Book title
 * @returns {string} - Cover URL
 */
export const generateCoverUrl = (title) => {
  const bookImages = [
    'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1002638/pexels-photo-1002638.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/46274/pexels-photo-46274.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/694740/pexels-photo-694740.jpeg?auto=compress&cs=tinysrgb&w=400'
  ];
  
  const hash = title.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return bookImages[Math.abs(hash) % bookImages.length];
};

/**
 * Generates purchase links for book
 * @param {string} title - Book title
 * @param {string} author - Book author
 * @returns {Object} - Purchase links object
 */
export const generatePurchaseLinks = (title, author) => {
  const encodedTitle = encodeURIComponent(`${title} ${author}`);
  
  return {
    amazon: `https://amazon.com/s?k=${encodedTitle}`,
    empik: `https://empik.com/szukaj/produkt?q=${encodedTitle}`,
    taniaKsiazka: `https://taniaksiazka.pl/szukaj?q=${encodedTitle}`
  };
};

/**
 * Generates book details based on page count and language preference
 * @param {Object} book - Book object
 * @param {Object} surveyData - Survey data
 * @returns {Object} - Book details object
 */
export const generateBookDetails = (book, surveyData) => {
  const isPolish = detectPolishPreference(surveyData);
  const pageCount = book.pageCount || 300;
  
  let length, readingTime;
  
  if (isPolish) {
    if (pageCount < 200) {
      length = 'Krótka';
      readingTime = '2-4 godziny';
    } else if (pageCount > 400) {
      length = 'Długa';
      readingTime = '8-12 godzin';
    } else {
      length = 'Średnia';
      readingTime = '4-6 godzin';
    }
    
    return {
      length: `${length} (${pageCount} stron)`,
      difficulty: translateDifficulty(book.complexity || 'medium', isPolish),
      format: ['Fizyczna', 'E-book', 'Audiobook'],
      readingTime
    };
  } else {
    if (pageCount < 200) {
      length = 'Short';
      readingTime = '2-4 hours';
    } else if (pageCount > 400) {
      length = 'Long';
      readingTime = '8-12 hours';
    } else {
      length = 'Medium';
      readingTime = '4-6 hours';
    }
    
    return {
      length: `${length} (${pageCount} pages)`,
      difficulty: book.complexity || 'Medium',
      format: ['Physical', 'E-book', 'Audiobook'],
      readingTime
    };
  }
};

/**
 * Validates AI-generated book object
 * @param {Object} book - Book object to validate
 * @returns {boolean} - True if book is valid
 */
export const validateAIGeneratedBook = (book) => {
  const requiredFields = ['title', 'author', 'description'];
  
  for (const field of requiredFields) {
    if (!book[field] || typeof book[field] !== 'string' || book[field].trim() === '') {
      logger.warn(`📚 AI-generated book missing required field: ${field}`);
      return false;
    }
  }
  
  return true;
};

/**
 * Enhances AI-generated book with additional fields and validation
 * @param {Object} book - Raw AI-generated book
 * @param {Object} surveyData - Survey data
 * @returns {Object} - Enhanced book object
 */
export const enhanceAIGeneratedBook = (book, surveyData) => {
  return {
    ...book,
    id: generateBookId(book.title, book.author),
    source: 'ai_generated',
    confidence: 0.9,
    coverUrl: generateCoverUrl(book.title),
    purchaseLinks: generatePurchaseLinks(book.title, book.author),
    bookDetails: generateBookDetails(book, surveyData),
    // Ensure all required fields have fallbacks
    genres: book.genres || book.genre || ['fiction'], // Handle both naming conventions
    themes: book.themes || ['general'],
    matchScore: validateMatchScore(book.matchScore),
    emotionalTone: validateEmotionalTone(book.emotionalTone),
    complexity: validateComplexity(book.complexity),
    pageCount: validatePageCount(book.pageCount),
    publicationYear: validatePublicationYear(book.publicationYear),
    matchingSteps: book.matchingSteps || ['Matches your reading preferences'],
    psychologicalMatch: book.psychologicalMatch || {
      moodAlignment: 'Complements your current emotional state',
      cognitiveMatch: 'Matches your cognitive preferences',
      therapeuticValue: 'Supports your reading goals',
      personalityFit: 'Appeals to your personality traits'
    },
    personalizedDescription: book.personalizedDescription || book.description || 'A great book recommendation for you.'
  };
};