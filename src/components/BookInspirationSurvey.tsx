import React, { useState, useCallback } from 'react';
import { Plus, X, BookOpen, ArrowLeft, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { t } from '../utils/translations';
import { useOptimizedRecommendations } from '../hooks/useOptimizedRecommendations';
import LoadingSpinner from './LoadingSpinner';

interface BookEntry {
  title: string;
  whyLoved: string;
}

const BookInspirationSurvey: React.FC = () => {
  const { setCurrentStep, surveyData, setSurveyData, language, setRecommendations, setSessionId } = useAppContext();
  const { generateRecommendations, isLoading, error, clearError } = useOptimizedRecommendations();
  
  const [books, setBooks] = useState<BookEntry[]>([
    { title: '', whyLoved: '' },
    { title: '', whyLoved: '' },
    { title: '', whyLoved: '' }
  ]);

  const updateBook = useCallback((index: number, field: 'title' | 'whyLoved', value: string) => {
    setBooks(prev => {
      const newBooks = [...prev];
      newBooks[index] = { ...newBooks[index], [field]: value };
      return newBooks;
    });
  }, []);

  const addBook = useCallback(() => {
    if (books.length < 8) {
      setBooks(prev => [...prev, { title: '', whyLoved: '' }]);
    }
  }, [books.length]);

  const removeBook = useCallback((index: number) => {
    if (index >= 3 && books.length > 3) {
      setBooks(prev => prev.filter((_, i) => i !== index));
    }
  }, [books.length]);

  const getFilledBooksCount = () => {
    return books.filter(book => book.title.trim() !== '' && book.whyLoved.trim() !== '').length;
  };

  const canProceed = () => {
    return getFilledBooksCount() >= 3 && surveyData.dataConsent && !isLoading;
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  const handleGenerateRecommendations = async () => {
    clearError();
    
    try {
      // Prepare survey data for API
      const filledBooks = books.filter(book => book.title.trim() !== '' && book.whyLoved.trim() !== '');
      
      const apiSurveyData = {
        ...surveyData,
        favoriteBooks: filledBooks
      };
      
      const result = await generateRecommendations(apiSurveyData);
      
      if (result) {
        setSessionId(result.sessionId);
        setRecommendations(result.recommendations);
        setCurrentStep(2);
      }
      
    } catch (err) {
      // Error is already handled by the hook
      console.error('Failed to generate recommendations:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <BookOpen className="w-12 h-12 text-emerald-500 mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
              {t('favoriteBooks', language)}
            </h1>
          </div>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {t('favoriteBooksDesc', language)}
          </p>
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-8 max-w-2xl mx-auto">
            <p className="text-emerald-700">
              📊 {t('booksAdded', language)}: {getFilledBooksCount()}/3 ({t('minimumRequired', language)})
            </p>
          </div>
        </div>

        {/* Book Entry Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <div className="space-y-8">
            {books.map((book, index) => (
              <div key={index} className="border border-gray-200 rounded-2xl p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {t('bookTitle', language)} {index + 1}
                    {index < 3 && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  
                  {index >= 3 && (
                    <button
                      type="button"
                      onClick={() => removeBook(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title={t('removeBook', language)}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={book.title}
                      onChange={(e) => updateBook(index, 'title', e.target.value)}
                      placeholder={t('bookTitlePlaceholder', language)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors text-lg"
                      autoComplete="off"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('whyLoved', language)}
                      {index < 3 && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <textarea
                      value={book.whyLoved}
                      onChange={(e) => updateBook(index, 'whyLoved', e.target.value)}
                      placeholder={t('whyLovedPlaceholder', language)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none resize-none h-24 transition-colors"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Book Button */}
          {books.length < 8 && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={addBook}
                className="flex items-center justify-center mx-auto px-6 py-3 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('addAnotherBook', language)}
              </button>
            </div>
          )}

          {/* Data Consent */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="dataConsent"
                checked={surveyData.dataConsent}
                onChange={(e) => setSurveyData({ dataConsent: e.target.checked })}
                className="mt-1 mr-3"
              />
              <label htmlFor="dataConsent" className="text-gray-700">
                {t('dataConsent', language)}
              </label>
            </div>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium mb-2">{t('aiServiceUnavailable', language)}</p>
                  <p className="text-red-700 text-sm mb-3">{error}</p>
                  <div className="text-red-600 text-sm">
                    <p className="font-medium mb-1">{t('possibleSolutions', language)}</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('checkApiKey', language)}</li>
                      <li>{t('verifyCredits', language)}</li>
                      <li>{t('ensureInternet', language)}</li>
                      <li>{t('tryAgainLater', language)}</li>
                    </ul>
                  </div>
                  <button
                    onClick={clearError}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    {t('tryAgain', language)}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="mt-6 p-4 bg-emerald-50 rounded-xl">
              <div className="flex items-center">
                <LoadingSpinner size="md" className="mr-3" />
                <div>
                  <p className="text-emerald-800 font-medium">{t('aiProcessingInProgress', language)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={isLoading}
            className={`flex items-center px-6 py-3 rounded-2xl font-medium transition-all ${
              !isLoading
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('back', language)}
          </button>

          <button
            onClick={handleGenerateRecommendations}
            disabled={!canProceed()}
            className={`flex items-center px-8 py-3 rounded-2xl font-medium transition-all transform hover:-translate-y-1 ${
              canProceed()
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('aiProcessing', language)}
              </>
            ) : (
              <>
                {t('getRecommendations', language)}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>

        {/* Validation Message */}
        {getFilledBooksCount() < 3 && (
          <div className="mt-4 text-center">
            <p className="text-gray-500 text-sm">
              {t('minimumBooks', language)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookInspirationSurvey;