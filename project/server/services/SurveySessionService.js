import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

export class SurveySessionService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Debug logging
    logger.debug(`🔍 Supabase URL check: ${supabaseUrl ? 'PRESENT' : 'MISSING'}`);
    logger.debug(`🔍 Supabase Key check: ${supabaseKey ? 'PRESENT' : 'MISSING'}`);
    
    if (!supabaseUrl || !supabaseKey || 
        supabaseUrl === 'https://placeholder.supabase.co' || 
        supabaseKey === 'placeholder-service-role-key' ||
        supabaseUrl.includes('your_supabase_url') ||
        supabaseKey.includes('your_supabase_service_role_key')) {
      logger.warn('⚠️ Supabase not configured - using in-memory storage');
      this.useInMemoryStorage = true;
      this.supabase = null;
      this.sessions = new Map(); // In-memory storage
    } else {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.useInMemoryStorage = false;
        logger.info('✅ Supabase client initialized successfully');
      } catch (error) {
        logger.error('❌ Failed to initialize Supabase client:', error.message);
        this.useInMemoryStorage = true;
        this.supabase = null;
        this.sessions = new Map();
      }
    }
  }

  async createSession({ surveyData, recommendations, userEmail }) {
    if (this.useInMemoryStorage) {
      return this.createInMemorySession({ surveyData, recommendations, userEmail });
    }

    try {
      const sessionData = {
        survey_mode: surveyData.surveyMode,
        survey_data: surveyData,
        recommendations: recommendations,
        user_ratings: {},
        user_email: userEmail || null,
        session_metadata: {
          created_at: new Date().toISOString(),
          user_agent: 'BookSoul-Web-App',
          version: '1.0.0'
        }
      };

      const { data, error } = await this.supabase
        .from('survey_sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`📝 Survey session created: ${data.id}`);
      return data;

    } catch (error) {
      logger.error('❌ Failed to create survey session:', error);
      logger.warn('🔄 Falling back to in-memory storage');
      return this.createInMemorySession({ surveyData, recommendations, userEmail });
    }
  }

  createInMemorySession({ surveyData, recommendations, userEmail }) {
    const sessionId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      survey_mode: surveyData.surveyMode,
      survey_data: surveyData,
      recommendations: recommendations,
      user_ratings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_email: userEmail || null,
      session_metadata: {
        created_at: new Date().toISOString(),
        user_agent: 'BookSoul-Web-App',
        version: '1.0.0',
        storage: 'in-memory'
      }
    };

    this.sessions.set(sessionId, session);
    logger.info(`📝 In-memory session created: ${sessionId}`);
    return session;
  }

  async submitRating(sessionId, bookId, rating) {
    if (this.useInMemoryStorage) {
      return this.submitInMemoryRating(sessionId, bookId, rating);
    }

    try {
      // First, get the current session
      const { data: session, error: fetchError } = await this.supabase
        .from('survey_sessions')
        .select('user_ratings')
        .eq('id', sessionId)
        .single();

      if (fetchError || !session) {
        logger.warn(`Session not found: ${sessionId}, falling back to in-memory`);
        return this.submitInMemoryRating(sessionId, bookId, rating);
      }

      // Update the ratings
      const updatedRatings = {
        ...session.user_ratings,
        [bookId]: rating
      };

      const { error: updateError } = await this.supabase
        .from('survey_sessions')
        .update({ 
          user_ratings: updatedRatings,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        throw updateError;
      }

      logger.info(`⭐ Rating updated: ${sessionId} → ${bookId} = ${rating}`);
      return true;

    } catch (error) {
      logger.error('❌ Failed to submit rating:', error);
      logger.warn('🔄 Falling back to in-memory storage');
      return this.submitInMemoryRating(sessionId, bookId, rating);
    }
  }

  submitInMemoryRating(sessionId, bookId, rating) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`In-memory session not found: ${sessionId}`);
      return false;
    }

    session.user_ratings[bookId] = rating;
    session.updated_at = new Date().toISOString();
    
    logger.info(`⭐ In-memory rating updated: ${sessionId} → ${bookId} = ${rating}`);
    return true;
  }

  async getSession(sessionId) {
    if (this.useInMemoryStorage) {
      return this.sessions.get(sessionId) || null;
    }

    try {
      const { data, error } = await this.supabase
        .from('survey_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('❌ Failed to fetch session:', error);
      return this.sessions.get(sessionId) || null;
    }
  }

  async getAnalytics() {
    if (this.useInMemoryStorage) {
      return this.getInMemoryAnalytics();
    }

    try {
      // Get basic statistics
      const { data: sessions, error } = await this.supabase
        .from('survey_sessions')
        .select('survey_mode, user_ratings, created_at');

      if (error) {
        throw error;
      }

      return this.calculateAnalytics(sessions);

    } catch (error) {
      logger.error('❌ Failed to fetch analytics:', error);
      return this.getInMemoryAnalytics();
    }
  }

  getInMemoryAnalytics() {
    const sessions = Array.from(this.sessions.values());
    return this.calculateAnalytics(sessions);
  }

  calculateAnalytics(sessions) {
    const analytics = {
      totalSessions: sessions.length,
      sessionsByMode: {},
      ratingsDistribution: { 0: 0, 1: 0, 2: 0 },
      averageRating: 0,
      sessionsWithRatings: 0,
      recentSessions: sessions.slice(-10)
    };

    let totalRatings = 0;
    let ratingSum = 0;

    sessions.forEach(session => {
      // Count by mode
      analytics.sessionsByMode[session.survey_mode] = 
        (analytics.sessionsByMode[session.survey_mode] || 0) + 1;

      // Count ratings
      const ratings = Object.values(session.user_ratings || {});
      if (ratings.length > 0) {
        analytics.sessionsWithRatings++;
        ratings.forEach(rating => {
          analytics.ratingsDistribution[rating]++;
          totalRatings++;
          ratingSum += rating;
        });
      }
    });

    analytics.averageRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
    return analytics;
  }

  async getSessionsByDateRange(startDate, endDate) {
    if (this.useInMemoryStorage) {
      const sessions = Array.from(this.sessions.values());
      return sessions.filter(session => {
        const sessionDate = new Date(session.created_at);
        return sessionDate >= new Date(startDate) && sessionDate <= new Date(endDate);
      });
    }

    try {
      const { data, error } = await this.supabase
        .from('survey_sessions')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('❌ Failed to fetch sessions by date range:', error);
      return [];
    }
  }

  async getRatingsByBook() {
    if (this.useInMemoryStorage) {
      const sessions = Array.from(this.sessions.values());
      return this.calculateBookRatings(sessions);
    }

    try {
      const { data: sessions, error } = await this.supabase
        .from('survey_sessions')
        .select('recommendations, user_ratings');

      if (error) {
        throw error;
      }

      return this.calculateBookRatings(sessions);

    } catch (error) {
      logger.error('❌ Failed to fetch ratings by book:', error);
      return {};
    }
  }

  calculateBookRatings(sessions) {
    const bookRatings = {};

    sessions.forEach(session => {
      const recommendations = session.recommendations || [];
      const ratings = session.user_ratings || {};

      recommendations.forEach(book => {
        if (ratings[book.id] !== undefined) {
          if (!bookRatings[book.id]) {
            bookRatings[book.id] = {
              title: book.title,
              author: book.author,
              ratings: [],
              averageRating: 0,
              totalRatings: 0
            };
          }

          bookRatings[book.id].ratings.push(ratings[book.id]);
          bookRatings[book.id].totalRatings++;
        }
      });
    });

    // Calculate averages
    Object.values(bookRatings).forEach(book => {
      book.averageRating = book.ratings.reduce((sum, rating) => sum + rating, 0) / book.ratings.length;
    });

    return bookRatings;
  }
}