import { logger } from '../utils/logger.js';

export class FilterAgent {
  constructor() {
    this.name = 'Filter';
    this.role = 'Usuwa pozycje niezgodne z triggerami, budżetem, poziomem trudności';
  }

  async filterBooks(bookCandidates, surveyData) {
    logger.info(`🚨 ${this.name}: Filtering ${bookCandidates.length} candidates...`);
    
    let filteredBooks = [...bookCandidates]; // FIXED: Changed from const to let
    
    // Apply content filters
    filteredBooks = this.applyContentFilters(filteredBooks, surveyData);
    
    // Apply difficulty filters
    filteredBooks = this.applyDifficultyFilters(filteredBooks, surveyData);
    
    // Apply length filters
    filteredBooks = this.applyLengthFilters(filteredBooks, surveyData);
    
    // Apply availability filters
    filteredBooks = this.applyAvailabilityFilters(filteredBooks, surveyData);
    
    logger.info(`🚨 ${this.name}: ${filteredBooks.length} books passed filters`);
    
    return filteredBooks;
  }

  applyContentFilters(books, surveyData) {
    if (!surveyData.triggers?.length) return books;
    
    const triggerKeywords = this.getTriggerKeywords(surveyData.triggers);
    
    return books.filter(book => {
      const content = `${book.description} ${book.themes?.join(' ')} ${book.genre?.join(' ')}`.toLowerCase();
      
      for (const trigger of triggerKeywords) {
        if (content.includes(trigger.toLowerCase())) {
          logger.debug(`🚨 Filtered out "${book.title}" due to trigger: ${trigger}`);
          return false;
        }
      }
      
      return true;
    });
  }

  getTriggerKeywords(triggers) {
    const triggerMap = {
      'violence': ['violence', 'violent', 'murder', 'killing', 'war', 'battle', 'fight'],
      'sexual': ['sexual', 'sex', 'erotic', 'romance', 'intimate'],
      'death': ['death', 'dying', 'suicide', 'grief', 'loss', 'funeral'],
      'mental': ['depression', 'anxiety', 'mental illness', 'therapy', 'psychiatric'],
      'addiction': ['addiction', 'drugs', 'alcohol', 'substance abuse'],
      'abuse': ['abuse', 'domestic violence', 'trauma', 'assault'],
      'war': ['war', 'military', 'combat', 'battlefield', 'conflict']
    };
    
    const keywords = [];
    for (const trigger of triggers) {
      if (triggerMap[trigger]) {
        keywords.push(...triggerMap[trigger]);
      }
    }
    
    return keywords;
  }

  applyDifficultyFilters(books, surveyData) {
    if (!surveyData.complexityTolerance) return books;
    
    const userComplexity = surveyData.complexityTolerance;
    
    return books.filter(book => {
      const bookComplexity = book.complexity || 'medium';
      
      // Allow books at or below user's complexity preference
      const complexityOrder = ['low', 'medium', 'high', 'academic'];
      const userLevel = complexityOrder.indexOf(userComplexity);
      const bookLevel = complexityOrder.indexOf(bookComplexity);
      
      if (bookLevel <= userLevel) {
        return true;
      }
      
      // Allow slightly higher complexity if user is in deep mode
      if (surveyData.surveyMode === 'deep' && bookLevel <= userLevel + 1) {
        return true;
      }
      
      logger.debug(`🚨 Filtered out "${book.title}" due to complexity: ${bookComplexity} > ${userComplexity}`);
      return false;
    });
  }

  applyLengthFilters(books, surveyData) {
    if (!surveyData.bookLength) return books;
    
    const lengthPreference = surveyData.bookLength;
    
    return books.filter(book => {
      const pageCount = book.pageCount || 300;
      
      switch (lengthPreference) {
        case 'short':
          if (pageCount > 250) {
            logger.debug(`🚨 Filtered out "${book.title}" - too long: ${pageCount} pages`);
            return false;
          }
          break;
        case 'medium':
          if (pageCount < 150 || pageCount > 450) {
            logger.debug(`🚨 Filtered out "${book.title}" - wrong length: ${pageCount} pages`);
            return false;
          }
          break;
        case 'long':
          if (pageCount < 350) {
            logger.debug(`🚨 Filtered out "${book.title}" - too short: ${pageCount} pages`);
            return false;
          }
          break;
        case 'any':
        default:
          // No filtering for 'any' preference
          break;
      }
      
      return true;
    });
  }

  applyAvailabilityFilters(books, surveyData) {
    // Filter out books that are too old or too new to be easily available
    const currentYear = new Date().getFullYear();
    
    return books.filter(book => {
      const pubYear = book.publicationYear;
      
      if (!pubYear) return true; // Keep books without publication year
      
      // Filter out books older than 100 years or newer than current year
      if (pubYear < currentYear - 100 || pubYear > currentYear) {
        logger.debug(`🚨 Filtered out "${book.title}" - publication year: ${pubYear}`);
        return false;
      }
      
      return true;
    });
  }
}