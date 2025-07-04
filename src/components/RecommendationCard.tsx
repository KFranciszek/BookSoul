import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Star, ExternalLink, ShoppingCart, Heart, Brain, Sparkles, Clock } from 'lucide-react';
import { BookRecommendation } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { t } from '../utils/translations';
import RatingComponent from './RatingComponent';

interface RecommendationCardProps {
  book: BookRecommendation;
  onRatingChange: (bookId: string, rating: number) => void;
  currentRating?: number;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ 
  book, 
  onRatingChange,
  currentRating 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showPsychology, setShowPsychology] = useState(false);
  const { language } = useAppContext();

  // Add safety checks for undefined properties
  if (!book) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <p className="text-gray-500">{t('loadingRecommendation', language)}</p>
      </div>
    );
  }

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  // FIXED: Standardized to use 'genres' (plural) with proper fallbacks
  const safeGenres = book.genres || [t('defaultGenre', language)];
  const safeMatchingSteps = book.matchingSteps || [t('defaultMatchingStep', language)];
  const safePsychologicalMatch = book.psychologicalMatch || {
    moodAlignment: t('defaultMoodAlignment', language),
    cognitiveMatch: t('defaultCognitiveMatch', language),
    therapeuticValue: t('defaultTherapeuticValue', language),
    personalityFit: t('defaultPersonalityFit', language)
  };
  const safeBookDetails = book.bookDetails || {
    readingTime: t('defaultReadingTime', language),
    length: t('defaultLength', language),
    difficulty: t('defaultDifficulty', language),
    format: [t('physicalBook', language), t('ebook', language)]
  };
  const safePurchaseLinks = book.purchaseLinks || {};

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Book Cover */}
          <div className="flex-shrink-0">
            <img
              src={book.coverUrl || 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=400'}
              alt={`${book.title} ${t('coverAlt', language)}`}
              className="w-32 h-48 object-cover rounded-2xl shadow-md mx-auto md:mx-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg?auto=compress&cs=tinysrgb&w=400';
              }}
            />
          </div>

          {/* Book Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">{book.title}</h3>
                <p className="text-lg text-gray-600 mb-3">{t('byAuthor', language)} {book.author}</p>
              </div>
              
              <div className={`flex items-center px-3 py-1 rounded-full ${getMatchColor(book.matchScore || 75)}`}>
                <Star className="w-4 h-4 mr-1" />
                <span className="font-bold">{book.matchScore || 75}%</span>
              </div>
            </div>

            {/* Book Details */}
            <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {safeBookDetails.readingTime}
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 mr-1">📖</span>
                {safeBookDetails.length}
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 mr-1">🎯</span>
                {safeBookDetails.difficulty}
              </div>
            </div>

            <p className="text-gray-700 mb-4 leading-relaxed">
              {book.personalizedDescription || book.description || t('recommendationFallback', language)}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {safeGenres.map((genre, index) => (
                <span
                  key={`${genre}-${index}`}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Rating Component */}
            <RatingComponent
              bookId={book.id}
              onRatingChange={onRatingChange}
              currentRating={currentRating}
            />

            {/* Psychology Match Toggle */}
            <button
              onClick={() => setShowPsychology(!showPsychology)}
              className="flex items-center text-teal-600 font-medium hover:text-teal-700 transition-colors mb-4 mt-4"
            >
              <Brain className="w-5 h-5 mr-1" />
              {showPsychology ? t('hidePsychologyMatch', language) : t('showPsychologyMatch', language)}
              {showPsychology ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>

            {/* Psychology Matching Details */}
            {showPsychology && (
              <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-2xl">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-teal-500" />
                  {t('psychologyMatch', language)}
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">{t('moodAlignment', language)}</h5>
                    <p className="text-sm text-gray-600">{safePsychologicalMatch.moodAlignment}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">{t('cognitiveMatch', language)}</h5>
                    <p className="text-sm text-gray-600">{safePsychologicalMatch.cognitiveMatch}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">{t('therapeuticValue', language)}</h5>
                    <p className="text-sm text-gray-600">{safePsychologicalMatch.therapeuticValue}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">{t('personalityFit', language)}</h5>
                    <p className="text-sm text-gray-600">{safePsychologicalMatch.personalityFit}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Matching Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-orange-600 font-medium hover:text-orange-700 transition-colors mb-4"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-5 h-5 mr-1" />
                  {t('showLess', language)}
                </>
              ) : (
                <>
                  <ChevronDown className="w-5 h-5 mr-1" />
                  {t('showMore', language)}
                </>
              )}
            </button>

            {/* Matching Steps */}
            {showDetails && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
                <h4 className="font-semibold text-gray-800 mb-3">{t('whyThisMatches', language)}</h4>
                <ul className="space-y-2">
                  {safeMatchingSteps.map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Purchase Links */}
            <div className="flex flex-wrap gap-3">
              {safePurchaseLinks.amazon && (
                <a
                  href={safePurchaseLinks.amazon}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-2xl font-medium hover:bg-yellow-600 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {t('amazon', language)}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              )}
              
              {safePurchaseLinks.empik && (
                <a
                  href={safePurchaseLinks.empik}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-red-500 text-white rounded-2xl font-medium hover:bg-red-600 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {t('empik', language)}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              )}

              {safePurchaseLinks.taniaKsiazka && (
                <a
                  href={safePurchaseLinks.taniaKsiazka}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-green-500 text-white rounded-2xl font-medium hover:bg-green-600 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {t('taniaKsiazka', language)}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;