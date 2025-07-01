import React from 'react';
import { ArrowLeft, Sparkles, Heart, RefreshCw, Brain, Target, Film } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { t } from '../utils/translations';
import RecommendationCard from './RecommendationCard';
import { recommendationAPI } from '../services/api';

const Recommendations: React.FC = () => {
  const { recommendations, setCurrentStep, language, surveyData, sessionId, setSessionId } = useAppContext();
  const [userRatings, setUserRatings] = React.useState<Record<string, number>>({});

  // LOGGING: Track userRatings state changes
  React.useEffect(() => {
    console.log(`📊 Recommendations - userRatings state changed:`, {
      userRatings,
      ratingsCount: Object.keys(userRatings).length,
      timestamp: new Date().toISOString()
    });
  }, [userRatings]);

  // LOGGING: Track component renders
  React.useEffect(() => {
    console.log(`🔄 Recommendations - Component rendered:`, {
      recommendationsCount: recommendations.length,
      sessionId,
      userRatingsCount: Object.keys(userRatings).length
    });
  });

  const handleRatingChange = async (bookId: string, rating: number) => {
    console.log(`🎯 Recommendations - handleRatingChange called:`, {
      bookId,
      rating,
      sessionId,
      currentUserRatings: userRatings,
      timestamp: new Date().toISOString()
    });

    if (!sessionId) {
      console.warn('⚠️ Recommendations - No session ID available for rating');
      return;
    }

    try {
      console.log(`⏳ Recommendations - Updating local state for ${bookId} = ${rating}`);
      
      // Update local state immediately for better UX
      setUserRatings(prev => {
        const newRatings = {
          ...prev,
          [bookId]: rating
        };
        console.log(`📝 Recommendations - Local state updated:`, {
          previousRatings: prev,
          newRatings,
          bookId,
          rating
        });
        return newRatings;
      });

      console.log(`📤 Recommendations - Submitting rating to API: ${bookId} = ${rating}`);
      
      // Submit rating to backend
      await recommendationAPI.submitRating(sessionId, bookId, rating);
      
      console.log(`✅ Recommendations - Rating submitted successfully: ${bookId} = ${rating}`);
      
    } catch (error) {
      console.error(`❌ Recommendations - Failed to submit rating:`, {
        bookId,
        rating,
        error: error instanceof Error ? error.message : error
      });
      
      console.log(`🔄 Recommendations - Reverting local state for ${bookId}`);
      
      // Revert local state on error
      setUserRatings(prev => {
        const newRatings = { ...prev };
        delete newRatings[bookId];
        console.log(`↩️ Recommendations - Local state reverted:`, {
          previousRatings: prev,
          newRatings,
          removedBookId: bookId
        });
        return newRatings;
      });
      throw error;
    }
  };

  const handleStartOver = () => {
    console.log(`🔄 Recommendations - Starting over`);
    setCurrentStep(0);
    setSessionId(null);
    setUserRatings({});
  };

  const handleBackToSurvey = () => {
    console.log(`⬅️ Recommendations - Going back to survey`);
    setCurrentStep(1);
  };

  const isQuickMode = surveyData.surveyMode === 'quick';
  const isCinemaMode = surveyData.surveyMode === 'cinema';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="w-12 h-12 text-orange-500 mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
              {t('recommendationsTitle', language)}
            </h1>
          </div>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {t('recommendationsSubtitle', language)}
          </p>

          <div className="flex items-center justify-center gap-6 text-gray-500 mb-8">
            <div className="flex items-center">
              <Heart className="w-5 h-5 mr-2 text-pink-500" />
              <span>{t('personalizedJustForYou', language)}</span>
            </div>
            <div className="flex items-center">
              {isCinemaMode ? (
                <Film className="w-5 h-5 mr-2 text-purple-500" />
              ) : isQuickMode ? (
                <Target className="w-5 h-5 mr-2 text-orange-500" />
              ) : (
                <Brain className="w-5 h-5 mr-2 text-teal-500" />
              )}
              <span>
                {isCinemaMode ? t('cinematch', language) : isQuickMode ? t('quickMatch', language) : t('deepAnalysis', language)}
              </span>
            </div>
          </div>

          {/* Mode-specific messaging */}
          {isCinemaMode ? (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-8 max-w-2xl mx-auto">
              <p className="text-purple-800">
                <strong>{t('cinematch', language)} {t('results', language)}:</strong> {t('cinematchResults', language)}
              </p>
            </div>
          ) : isQuickMode ? (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-8 max-w-2xl mx-auto">
              <p className="text-orange-800">
                <strong>{t('quickMatch', language)} {t('results', language)}:</strong> {t('quickMatchResults', language)}
              </p>
            </div>
          ) : (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-8 max-w-2xl mx-auto">
              <p className="text-teal-800">
                <strong>{t('deepAnalysis', language)} {t('complete', language)}:</strong> {t('deepAnalysisResults', language)}
              </p>
            </div>
          )}

          {/* Rating Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8 max-w-2xl mx-auto">
            <p className="text-blue-800">
              <strong>{t('helpUs', language)} {t('improve', language)}:</strong> {t('helpUsImprove', language)}
            </p>
          </div>
        </div>

        {/* Recommendations Grid */}
        <div className="space-y-8 mb-12">
          {recommendations.map((book) => {
            const currentRating = userRatings[book.id];
            
            console.log(`🎨 Recommendations - Rendering card for ${book.id}:`, {
              bookTitle: book.title,
              currentRating,
              hasRating: currentRating !== undefined
            });
            
            return (
              <RecommendationCard 
                key={book.id} 
                book={book} 
                onRatingChange={handleRatingChange}
                currentRating={currentRating}
              />
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <button
            onClick={handleBackToSurvey}
            className="flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl font-medium hover:bg-gray-300 transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('refinePreferences', language)}
          </button>
          
          <button
            onClick={handleStartOver}
            className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-medium hover:from-orange-600 hover:to-pink-600 transition-all transform hover:-translate-y-1"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            {t('startNewSearch', language)}
          </button>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-12 p-6 bg-white/60 backdrop-blur-sm rounded-3xl">
          <p className="text-gray-600 mb-2">
            <strong>{t('happyReading', language)}!</strong> 📚
          </p>
          <p className="text-sm text-gray-500">
            {t('bestBookQuote', language)}
          </p>
          {isCinemaMode ? (
            <p className="text-sm text-purple-600 mt-2">
              {t('lovedCinemaPicks', language)}
            </p>
          ) : isQuickMode ? (
            <p className="text-sm text-orange-600 mt-2">
              {t('wantBetterMatches', language)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Recommendations;