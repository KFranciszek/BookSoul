import React from 'react';
import { BookOpen, Brain, Heart, Sparkles, Clock, Target, Film } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { t } from '../utils/translations';

const LandingPage: React.FC = () => {
  const { setCurrentStep, language, setLanguage, setSurveyData } = useAppContext();

  const handleModeSelection = (mode: 'quick' | 'deep' | 'cinema') => {
    setSurveyData({ surveyMode: mode, dataConsent: false });
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex bg-white/10 rounded-full p-1">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              language === 'en' ? 'bg-white text-blue-900' : 'text-white/70 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('pl')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              language === 'pl' ? 'bg-white text-blue-900' : 'text-white/70 hover:text-white'
            }`}
          >
            PL
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
        {/* Hero Section */}
        <div className="text-center mb-16 max-w-4xl">
          <div className="flex items-center justify-center mb-6">
            <BookOpen className="w-16 h-16 text-orange-400 mr-4" />
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-orange-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              {t('title', language)}
            </h1>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-light mb-6 text-blue-100">
            {t('subtitle', language)}
          </h2>
          
          <p className="text-lg text-blue-200 mb-12 max-w-2xl mx-auto leading-relaxed">
            {t('description', language)}
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-6xl w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center hover:bg-white/15 transition-all duration-300 transform hover:-translate-y-1">
            <Brain className="w-12 h-12 text-teal-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">{t('aiPsychologyTitle', language)}</h3>
            <p className="text-blue-200">{t('aiPsychologyDesc', language)}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center hover:bg-white/15 transition-all duration-300 transform hover:-translate-y-1">
            <Heart className="w-12 h-12 text-pink-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">{t('empatheticMatchingTitle', language)}</h3>
            <p className="text-blue-200">{t('empatheticMatchingDesc', language)}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center hover:bg-white/15 transition-all duration-300 transform hover:-translate-y-1">
            <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">{t('personalizedExperienceTitle', language)}</h3>
            <p className="text-blue-200">{t('personalizedExperienceDesc', language)}</p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">{t('chooseModeTitle', language)}</h3>
          <p className="text-xl text-blue-200 mb-8">{t('chooseModeSubtitle', language)}</p>
        </div>

        {/* CTA Buttons */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl w-full">
          <div className="bg-gradient-to-br from-orange-500/20 to-pink-500/20 backdrop-blur-lg rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center mb-4">
              <Clock className="w-8 h-8 text-orange-400 mr-3" />
              <h4 className="text-2xl font-bold">{t('quickMode', language)}</h4>
            </div>
            <p className="text-blue-200 mb-6 text-lg">{t('quickModeDesc', language)}</p>
            <ul className="text-blue-200 mb-8 space-y-2">
              <li>• {t('quickModeFeatures.feature1', language)}</li>
              <li>• {t('quickModeFeatures.feature2', language)}</li>
              <li>• {t('quickModeFeatures.feature3', language)}</li>
              <li>• {t('quickModeFeatures.feature4', language)}</li>
            </ul>
            <button
              onClick={() => handleModeSelection('quick')}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-4 px-8 rounded-2xl hover:from-orange-600 hover:to-pink-600 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
            >
              {t('startQuick', language)}
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-lg rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center mb-4">
              <Film className="w-8 h-8 text-purple-400 mr-3" />
              <h4 className="text-2xl font-bold">{t('cinemaMode', language)}</h4>
            </div>
            <p className="text-blue-200 mb-6 text-lg">{t('cinemaModeDesc', language)}</p>
            <ul className="text-blue-200 mb-8 space-y-2">
              <li>• {t('cinemaModeFeatures.feature1', language)}</li>
              <li>• {t('cinemaModeFeatures.feature2', language)}</li>
              <li>• {t('cinemaModeFeatures.feature3', language)}</li>
              <li>• {t('cinemaModeFeatures.feature4', language)}</li>
            </ul>
            <button
              onClick={() => handleModeSelection('cinema')}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold py-4 px-8 rounded-2xl hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
            >
              {t('startCinema', language)}
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-teal-500/20 to-blue-500/20 backdrop-blur-lg rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center mb-4">
              <Target className="w-8 h-8 text-teal-400 mr-3" />
              <h4 className="text-2xl font-bold">{t('deepMode', language)}</h4>
            </div>
            <p className="text-blue-200 mb-6 text-lg">{t('deepModeDesc', language)}</p>
            <ul className="text-blue-200 mb-8 space-y-2">
              <li>• {t('deepModeFeatures.feature1', language)}</li>
              <li>• {t('deepModeFeatures.feature2', language)}</li>
              <li>• {t('deepModeFeatures.feature3', language)}</li>
              <li>• {t('deepModeFeatures.feature4', language)}</li>
            </ul>
            <button
              onClick={() => handleModeSelection('deep')}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold py-4 px-8 rounded-2xl hover:from-teal-600 hover:to-blue-600 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
            >
              {t('startDeep', language)}
            </button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <p className="text-blue-300 text-sm mb-4">
            {t('trustIndicators', language)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;