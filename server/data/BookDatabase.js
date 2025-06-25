import { logger } from '../utils/logger.js';

export class BookDatabase {
  constructor() {
    this.books = this.initializeBooks();
    this.genreIndex = this.buildGenreIndex();
  }

  initializeBooks() {
    return [
      // Fiction & Literary
      {
        id: 'book_1',
        title: 'The Seven Husbands of Evelyn Hugo',
        author: 'Taylor Jenkins Reid',
        genre: ['fiction', 'romance', 'contemporary'],
        description: 'A captivating story of love, ambition, and the price of fame.',
        themes: ['love', 'ambition', 'secrets', 'hollywood'],
        complexity: 'medium',
        emotionalTone: 'medium',
        pageCount: 400,
        publicationYear: 2017,
        coverUrl: 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=400'
      },
      {
        id: 'book_2',
        title: 'The Midnight Library',
        author: 'Matt Haig',
        genre: ['fiction', 'philosophy', 'contemporary'],
        description: 'A novel about all the choices that go into a life well lived.',
        themes: ['choices', 'regret', 'possibility', 'hope'],
        complexity: 'medium',
        emotionalTone: 'medium',
        pageCount: 288,
        publicationYear: 2020,
        coverUrl: 'https://images.pexels.com/photos/1002638/pexels-photo-1002638.jpeg?auto=compress&cs=tinysrgb&w=400'
      },
      {
        id: 'book_3',
        title: 'Project Hail Mary',
        author: 'Andy Weir',
        genre: ['scifi', 'adventure', 'humor'],
        description: 'A thrilling space adventure with humor and heart.',
        themes: ['science', 'friendship', 'survival', 'discovery'],
        complexity: 'medium',
        emotionalTone: 'light',
        pageCount: 476,
        publicationYear: 2021,
        coverUrl: 'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=400'
      },

      // Self-Help & Psychology
      {
        id: 'book_4',
        title: 'Atomic Habits',
        author: 'James Clear',
        genre: ['selfhelp', 'psychology', 'productivity'],
        description: 'An easy & proven way to build good habits & break bad ones.',
        themes: ['habits', 'productivity', 'self-improvement', 'behavior'],
        complexity: 'low',
        emotionalTone: 'light',
        pageCount: 320,
        publicationYear: 2018,
        coverUrl: 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=400'
      },
      {
        id: 'book_5',
        title: 'The Power of Now',
        author: 'Eckhart Tolle',
        genre: ['spirituality', 'selfhelp', 'philosophy'],
        description: 'A guide to spiritual enlightenment and present-moment awareness.',
        themes: ['mindfulness', 'spirituality', 'consciousness', 'peace'],
        complexity: 'medium',
        emotionalTone: 'light',
        pageCount: 236,
        publicationYear: 1997,
        coverUrl: 'https://images.pexels.com/photos/46274/pexels-photo-46274.jpeg?auto=compress&cs=tinysrgb&w=400'
      },

      // Mystery & Thriller
      {
        id: 'book_6',
        title: 'Gone Girl',
        author: 'Gillian Flynn',
        genre: ['mystery', 'thriller', 'psychological'],
        description: 'A psychological thriller about a marriage gone terribly wrong.',
        themes: ['marriage', 'deception', 'media', 'identity'],
        complexity: 'high',
        emotionalTone: 'heavy',
        pageCount: 432,
        publicationYear: 2012,
        coverUrl: 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=400'
      },

      // Fantasy
      {
        id: 'book_7',
        title: 'The Name of the Wind',
        author: 'Patrick Rothfuss',
        genre: ['fantasy', 'adventure', 'magic'],
        description: 'The first book in the Kingkiller Chronicle series.',
        themes: ['magic', 'music', 'storytelling', 'coming-of-age'],
        complexity: 'high',
        emotionalTone: 'medium',
        pageCount: 662,
        publicationYear: 2007,
        coverUrl: 'https://images.pexels.com/photos/1002638/pexels-photo-1002638.jpeg?auto=compress&cs=tinysrgb&w=400'
      },

      // Biography & Memoir
      {
        id: 'book_8',
        title: 'Educated',
        author: 'Tara Westover',
        genre: ['biography', 'memoir', 'education'],
        description: 'A memoir about education, family, and the struggle for self-invention.',
        themes: ['education', 'family', 'identity', 'resilience'],
        complexity: 'medium',
        emotionalTone: 'heavy',
        pageCount: 334,
        publicationYear: 2018,
        coverUrl: 'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=400'
      },

      // Science & Popular Science
      {
        id: 'book_9',
        title: 'Sapiens',
        author: 'Yuval Noah Harari',
        genre: ['science', 'history', 'anthropology'],
        description: 'A brief history of humankind and our species\' journey.',
        themes: ['evolution', 'civilization', 'technology', 'future'],
        complexity: 'high',
        emotionalTone: 'medium',
        pageCount: 443,
        publicationYear: 2011,
        coverUrl: 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=400'
      },

      // Romance
      {
        id: 'book_10',
        title: 'Beach Read',
        author: 'Emily Henry',
        genre: ['romance', 'contemporary', 'humor'],
        description: 'Two rival writers challenge each other to write outside their comfort zones.',
        themes: ['love', 'writing', 'healing', 'friendship'],
        complexity: 'low',
        emotionalTone: 'light',
        pageCount: 352,
        publicationYear: 2020,
        coverUrl: 'https://images.pexels.com/photos/46274/pexels-photo-46274.jpeg?auto=compress&cs=tinysrgb&w=400'
      }
    ];
  }

  buildGenreIndex() {
    const index = {};
    
    this.books.forEach(book => {
      book.genre.forEach(genre => {
        if (!index[genre]) {
          index[genre] = [];
        }
        index[genre].push(book);
      });
    });
    
    return index;
  }

  async findMatchingBooks(userProfile, surveyData) {
    logger.debug('📊 Searching database for matching books...');
    
    let candidates = [...this.books];
    
    // Filter by genres if specified
    if (surveyData.favoriteGenres?.length) {
      candidates = candidates.filter(book =>
        book.genre.some(g => 
          surveyData.favoriteGenres.some(fg => 
            g.toLowerCase().includes(fg.toLowerCase()) ||
            fg.toLowerCase().includes(g.toLowerCase())
          )
        )
      );
    }
    
    // Filter by complexity
    if (userProfile.complexityLevel) {
      const complexityOrder = ['low', 'medium', 'high'];
      const userLevel = complexityOrder.indexOf(userProfile.complexityLevel);
      
      candidates = candidates.filter(book => {
        const bookLevel = complexityOrder.indexOf(book.complexity);
        return bookLevel <= userLevel + 1; // Allow slightly higher complexity
      });
    }
    
    // Add source and confidence
    return candidates.map(book => ({
      ...book,
      source: 'database',
      confidence: 0.7
    }));
  }

  async getBooksByGenre(genre, limit = 5) {
    const genreBooks = this.genreIndex[genre.toLowerCase()] || [];
    return genreBooks.slice(0, limit).map(book => ({
      ...book,
      source: 'genre_match',
      confidence: 0.6
    }));
  }

  getFallbackRecommendations(surveyMode) {
    let fallbackBooks;
    
    switch (surveyMode) {
      case 'quick':
        fallbackBooks = this.books.filter(book => 
          book.complexity === 'low' || book.complexity === 'medium'
        ).slice(0, 5);
        break;
        
      case 'cinema':
        // Books with cinematic qualities or film adaptations
        fallbackBooks = this.books.filter(book =>
          book.themes.some(theme => 
            ['hollywood', 'visual', 'adventure', 'drama'].includes(theme.toLowerCase())
          )
        ).slice(0, 3);
        break;
        
      case 'deep':
        fallbackBooks = this.books.slice(0, 8); // All complexity levels
        break;
        
      default:
        fallbackBooks = this.books.slice(0, 5);
    }
    
    return fallbackBooks.map(book => ({
      ...book,
      source: 'fallback',
      confidence: 0.5
    }));
  }

  // Method to add new books (for future expansion)
  addBook(book) {
    const newBook = {
      ...book,
      id: book.id || `book_${Date.now()}`,
      source: 'manual'
    };
    
    this.books.push(newBook);
    
    // Update genre index
    newBook.genre.forEach(genre => {
      if (!this.genreIndex[genre]) {
        this.genreIndex[genre] = [];
      }
      this.genreIndex[genre].push(newBook);
    });
    
    logger.info(`📚 Added new book: "${newBook.title}" by ${newBook.author}`);
  }

  getStats() {
    return {
      totalBooks: this.books.length,
      genres: Object.keys(this.genreIndex).length,
      averagePageCount: Math.round(
        this.books.reduce((sum, book) => sum + book.pageCount, 0) / this.books.length
      ),
      complexityDistribution: {
        low: this.books.filter(b => b.complexity === 'low').length,
        medium: this.books.filter(b => b.complexity === 'medium').length,
        high: this.books.filter(b => b.complexity === 'high').length
      }
    };
  }
}