import React from 'react';
import { BookOpen, Sparkles, ArrowLeft, Settings } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { t } from '../utils/translations';

const BookInspirationModeSelection: React.FC = () => {
  const { setCurrentStep, language, setSurveyData } = useAppContext();

  const handleModeSelection = (mode: 'myBookshelf' | 'inspireMe') => {
    if (mode === 'myBookshelf') {
      // For now, just show the development message
      return;
    }
    
    // Set the inspiration sub-mode and proceed to survey
    setSurveyData({ 
      surveyMode: 'bookInspiration',
      inspirationMode: mode,
      dataConsent: false 
    });
    setCurrentStep(1);
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <BookOpen className="w-12 h-12 text-emerald-500 mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
              {t('bookInspirations', language)}
            </h1>
          </div>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {t('chooseInspirationType', language)}
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* My Bookshelf - Coming Soon */}
          <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-200 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
              {t('myBookshelfStatus', language)}
            </div>
            
            <div className="flex items-center mb-4">
              <Settings className="w-8 h-8 text-gray-400 mr-3" />
              <h3 className="text-2xl font-bold text-gray-800">{t('myBookshelf', language)}</h3>
            </div>
            
            <p className="text-gray-600 mb-6 text-lg">
              {t('myBookshelfDesc', language)}
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <p className="text-gray-500 text-center">
                🔗 {t('myBookshelfStatus', language)}
              </p>
            </div>
            
            <button
              disabled
              className="w-full bg-gray-200 text-gray-400 font-semibold py-4 px-8 rounded-2xl cursor-not-allowed"
            >
              {t('myBookshelfStatus', language)}
            </button>
          </div>

          {/* Inspire Me - Active */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-3xl shadow-lg p-8 border border-emerald-200 hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center mb-4">
              <Sparkles className="w-8 h-8 text-emerald-500 mr-3" />
              <h3 className="text-2xl font-bold text-gray-800">{t('inspireMe', language)}</h3>
            </div>
            
            <p className="text-gray-600 mb-6 text-lg">
              {t('inspireMeDesc', language)}
            </p>
            
            <div className="bg-emerald-50 rounded-2xl p-6 mb-6">
              <p className="text-emerald-700 text-sm">
                {t('inspireMeFullDesc', language)}
              </p>
            </div>
            
            <button
              onClick={() => handleModeSelection('inspireMe')}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold py-4 px-8 rounded-2xl hover:from-emerald-600 hover:to-cyan-600 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
            >
              {t('startBookInspiration', language)}
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <button
            onClick={handleBack}
            className="flex items-center px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl font-medium hover:bg-gray-300 transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('back', language)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookInspirationModeSelection;