import React, { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { t } from '../utils/translations';
import SurveyStep from './SurveyStep';
import { Heart, Clock, Target, BookOpen, User, Star, Shield, Brain, Zap, Home, Lightbulb, TrendingUp, Smile, Film, Plus, X, Sparkles, AlertTriangle } from 'lucide-react';
import { recommendationAPI } from '../services/api';

const Survey: React.FC = () => {
  const { currentStep, setCurrentStep, surveyData, setSurveyData, language, setRecommendations, setSessionId } = useAppContext();
  const [currentSurveyStep, setCurrentSurveyStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Local state for cinema mode films - COMPLETELY SEPARATE
  const [cinemaFilms, setCinemaFilms] = useState<string[]>(['', '']);
  
  // Determine total steps based on survey mode
  const isQuickMode = surveyData.surveyMode === 'quick';
  const isCinemaMode = surveyData.surveyMode === 'cinema';
  const totalSteps = isQuickMode ? 6 : isCinemaMode ? 3 : 16;

  // Initialize cinema films when entering cinema mode
  useEffect(() => {
    if (isCinemaMode) {
      console.log('🎬 Cinema mode activated - initializing films');
      setCinemaFilms(['', '']);
    }
  }, [isCinemaMode]);

  const handleNext = async () => {
    if (currentSurveyStep < totalSteps) {
      setCurrentSurveyStep(currentSurveyStep + 1);
    } else {
      // Generate recommendations using AI backend
      await generateRecommendations();
    }
  };

  const handleBack = () => {
    if (currentSurveyStep > 1) {
      setCurrentSurveyStep(currentSurveyStep - 1);
    } else {
      setCurrentStep(0);
    }
  };

  const generateRecommendations = async () => {
    setIsGenerating(true);
    setErrorMessage('');
    
    try {
      console.log('🎯 Starting AI recommendation generation...');
      
      // Prepare survey data for API - convert cinema films to proper format
      const apiSurveyData = {
        ...surveyData,
        favoriteFilms: isCinemaMode ? cinemaFilms.filter(film => film.trim() !== '') : []
      };
      
      const response = await recommendationAPI.generateRecommendations(apiSurveyData);
      
      // Extract sessionId from response metadata
      if (response.sessionId) {
        setSessionId(response.sessionId);
        console.log('📝 Session ID set:', response.sessionId);
      }
      
      setRecommendations(response.recommendations);
      setCurrentStep(2);
      
    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      
      // Don't proceed to recommendations page on error
      // User can retry or go back to fix the issue
      
    } finally {
      setIsGenerating(false);
    }
  };

  // Simple cinema film management functions
  const updateCinemaFilm = (index: number, value: string) => {
    console.log(`🎬 Updating film ${index}:`, value);
    const newFilms = [...cinemaFilms];
    newFilms[index] = value;
    setCinemaFilms(newFilms);
  };

  const addCinemaFilm = () => {
    if (cinemaFilms.length < 5) {
      console.log('➕ Adding new cinema film');
      setCinemaFilms([...cinemaFilms, '']);
    }
  };

  const removeCinemaFilm = (index: number) => {
    if (index >= 2 && cinemaFilms.length > 2) {
      console.log(`🗑️ Removing film ${index}`);
      const newFilms = cinemaFilms.filter((_, i) => i !== index);
      setCinemaFilms(newFilms);
    }
  };

  const OptionButton: React.FC<{ 
    option: string; 
    selected: boolean; 
    onClick: () => void;
    icon?: React.ReactNode;
    description?: string;
  }> = React.memo(({ option, selected, onClick, icon, description }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start p-4 rounded-2xl border-2 transition-all transform hover:-translate-y-1 text-left ${
        selected
          ? 'border-orange-500 bg-orange-50 text-orange-700'
          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
      }`}
    >
      {icon && <span className="mr-3 mt-1 flex-shrink-0">{icon}</span>}
      <div>
        <span className="font-medium block">{option}</span>
        {description && <span className="text-sm opacity-75 mt-1 block">{description}</span>}
      </div>
    </button>
  ));

  const MultiSelectButton: React.FC<{ 
    option: string; 
    selected: boolean; 
    onClick: () => void;
  }> = React.memo(({ option, selected, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
        selected
          ? 'border-orange-500 bg-orange-50 text-orange-700'
          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
      }`}
    >
      {option}
    </button>
  ));

  // Reusable Data Consent Component with consistent styling
  const DataConsentStep: React.FC = () => (
    <SurveyStep
      stepNumber={currentSurveyStep}
      totalSteps={totalSteps}
      title={t('dataConsent', language)}
      onNext={handleNext}
      onBack={handleBack}
      canProceed={surveyData.dataConsent && !isGenerating}
      isLoading={isGenerating}
      loadingText="AI Processing in Progress..."
    >
      <div className="space-y-6">
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

        {/* Error Message Display */}
        {errorMessage && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium mb-2">AI Recommendation Service Unavailable</p>
                <p className="text-red-700 text-sm mb-3">{errorMessage}</p>
                <div className="text-red-600 text-sm">
                  <p className="font-medium mb-1">Possible solutions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check if the OpenAI API key is properly configured</li>
                    <li>Verify your OpenAI account has sufficient credits</li>
                    <li>Ensure the backend server has internet access</li>
                    <li>Try again in a few minutes</li>
                  </ul>
                </div>
                <button
                  onClick={() => setErrorMessage('')}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <div>
                <p className="text-blue-800 font-medium">AI Processing in Progress...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SurveyStep>
  );

  const renderCurrentStep = () => {
    // Cinema Mode Steps (1-3)
    if (isCinemaMode) {
      switch (currentSurveyStep) {
        case 1:
          const filledFilmsCount = cinemaFilms.filter(film => film.trim() !== '').length;
          
          return (
            <SurveyStep
              stepNumber={1}
              totalSteps={totalSteps}
              title={t('favoriteFilms', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={filledFilmsCount >= 2}
            >
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <Film className="w-6 h-6 text-purple-500 mr-3" />
                  <span className="text-gray-600">{t('favoriteFilmsDesc', language)}</span>
                </div>
                
                <div className="space-y-3">
                  {cinemaFilms.map((film, index) => (
                    <div key={`film-${index}`} className="flex items-center gap-2">
                      <span className="text-gray-500 font-medium min-w-[20px]">{index + 1}.</span>
                      <input
                        type="text"
                        value={film}
                        onChange={(e) => updateCinemaFilm(index, e.target.value)}
                        placeholder={index < 2 ? t('filmPlaceholderRequired', language) : t('filmPlaceholderOptional', language)}
                        className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                        autoComplete="off"
                      />
                      {index >= 2 && (
                        <button
                          type="button"
                          onClick={() => removeCinemaFilm(index)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove this film"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {cinemaFilms.length < 5 && (
                  <button
                    type="button"
                    onClick={addCinemaFilm}
                    className="flex items-center text-purple-600 hover:text-purple-700 font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t('addAnotherFilm', language)}
                  </button>
                )}

                <div className="mt-6 p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-700">
                    <strong>{t('examples', language)}:</strong> Interstellar, Fleabag, Dark, The Office, Before Sunrise, Parasite, The Grand Budapest Hotel
                  </p>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    📊 Wypełnione filmy: {filledFilmsCount}/2 (minimum wymagane)
                  </p>
                </div>
              </div>
            </SurveyStep>
          );

        case 2:
          return (
            <SurveyStep
              stepNumber={2}
              totalSteps={totalSteps}
              title={t('filmConnection', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={true}
            >
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <Sparkles className="w-6 h-6 text-purple-500 mr-3" />
                  <span className="text-gray-600">{t('filmConnectionDesc', language)}</span>
                </div>
                
                <textarea
                  value={surveyData.filmConnection || ''}
                  onChange={(e) => setSurveyData({ filmConnection: e.target.value })}
                  placeholder={t('filmConnectionPlaceholder', language)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none resize-none h-32"
                />

                <div className="mt-6 p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-700">
                    <strong>{t('examples', language)}:</strong> "{t('filmConnectionExamples', language)}"
                  </p>
                </div>
              </div>
            </SurveyStep>
          );

        case 3:
          return <DataConsentStep />;

        default:
          return null;
      }
    }

    // Quick Mode Steps (1-6)
    else if (isQuickMode) {
      switch (currentSurveyStep) {
        case 1:
          return (
            <SurveyStep
              stepNumber={1}
              totalSteps={totalSteps}
              title={t('favoriteGenres', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={(surveyData.favoriteGenres?.length || 0) > 0}
            >
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(t('genres', language) as Record<string, string>).map(([key, genre]) => (
                  <MultiSelectButton
                    key={key}
                    option={genre}
                    selected={surveyData.favoriteGenres?.includes(key) || false}
                    onClick={() => {
                      const currentGenres = surveyData.favoriteGenres || [];
                      const newGenres = currentGenres.includes(key)
                        ? currentGenres.filter(g => g !== key)
                        : [...currentGenres, key];
                      setSurveyData({ favoriteGenres: newGenres });
                    }}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 2:
          return (
            <SurveyStep
              stepNumber={2}
              totalSteps={totalSteps}
              title={t('currentMood', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.currentMood}
            >
              <div className="grid gap-4">
                {Object.entries(t('moods', language) as Record<string, string>).map(([key, mood]) => (
                  <OptionButton
                    key={key}
                    option={mood}
                    selected={surveyData.currentMood === key}
                    onClick={() => setSurveyData({ currentMood: key })}
                    icon={<Heart className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 3:
          return (
            <SurveyStep
              stepNumber={3}
              totalSteps={totalSteps}
              title={t('readingGoal', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.readingGoal}
            >
              <div className="grid gap-4">
                {Object.entries(t('goals', language) as Record<string, string>).map(([key, goal]) => (
                  <OptionButton
                    key={key}
                    option={goal}
                    selected={surveyData.readingGoal === key}
                    onClick={() => setSurveyData({ readingGoal: key })}
                    icon={<Target className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 4:
          return (
            <SurveyStep
              stepNumber={4}
              totalSteps={totalSteps}
              title={t('actionPaceQuestion', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.actionPace}
            >
              <div className="grid gap-4">
                {Object.entries(t('actionPace', language) as Record<string, string>).map(([key, pace]) => (
                  <OptionButton
                    key={key}
                    option={pace}
                    selected={surveyData.actionPace === key}
                    onClick={() => setSurveyData({ actionPace: key })}
                    icon={<Zap className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 5:
          return (
            <SurveyStep
              stepNumber={5}
              totalSteps={totalSteps}
              title={t('triggers', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={true}
            >
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <Shield className="w-6 h-6 text-orange-500 mr-3" />
                  <span className="text-gray-600">Select any content you'd prefer to avoid for your wellbeing</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(t('commonTriggers', language) as Record<string, string>).map(([key, trigger]) => (
                    <MultiSelectButton
                      key={key}
                      option={trigger}
                      selected={surveyData.triggers?.includes(key) || false}
                      onClick={() => {
                        const currentTriggers = surveyData.triggers || [];
                        const newTriggers = currentTriggers.includes(key)
                          ? currentTriggers.filter(t => t !== key)
                          : [...currentTriggers, key];
                        setSurveyData({ triggers: newTriggers });
                      }}
                    />
                  ))}
                </div>
              </div>
            </SurveyStep>
          );

        case 6:
          return <DataConsentStep />;

        default:
          return null;
      }
    }

    // Deep Mode Steps (1-16)
    else {
      switch (currentSurveyStep) {
        case 1:
          return (
            <SurveyStep
              stepNumber={1}
              totalSteps={totalSteps}
              title={t('favoriteGenres', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={(surveyData.favoriteGenres?.length || 0) > 0}
            >
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(t('genres', language) as Record<string, string>).map(([key, genre]) => (
                  <MultiSelectButton
                    key={key}
                    option={genre}
                    selected={surveyData.favoriteGenres?.includes(key) || false}
                    onClick={() => {
                      const currentGenres = surveyData.favoriteGenres || [];
                      const newGenres = currentGenres.includes(key)
                        ? currentGenres.filter(g => g !== key)
                        : [...currentGenres, key];
                      setSurveyData({ favoriteGenres: newGenres });
                    }}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 2:
          return (
            <SurveyStep
              stepNumber={2}
              totalSteps={totalSteps}
              title={t('currentMood', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.currentMood}
            >
              <div className="grid gap-4">
                {Object.entries(t('moods', language) as Record<string, string>).map(([key, mood]) => (
                  <OptionButton
                    key={key}
                    option={mood}
                    selected={surveyData.currentMood === key}
                    onClick={() => setSurveyData({ currentMood: key })}
                    icon={<Heart className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 3:
          return (
            <SurveyStep
              stepNumber={3}
              totalSteps={totalSteps}
              title={t('readingGoal', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.readingGoal}
            >
              <div className="grid gap-4">
                {Object.entries(t('goals', language) as Record<string, string>).map(([key, goal]) => (
                  <OptionButton
                    key={key}
                    option={goal}
                    selected={surveyData.readingGoal === key}
                    onClick={() => setSurveyData({ readingGoal: key })}
                    icon={<Target className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 4:
          return (
            <SurveyStep
              stepNumber={4}
              totalSteps={totalSteps}
              title={t('triggers', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={true}
            >
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <Shield className="w-6 h-6 text-orange-500 mr-3" />
                  <span className="text-gray-600">Select any content you'd prefer to avoid for your wellbeing</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(t('commonTriggers', language) as Record<string, string>).map(([key, trigger]) => (
                    <MultiSelectButton
                      key={key}
                      option={trigger}
                      selected={surveyData.triggers?.includes(key) || false}
                      onClick={() => {
                        const currentTriggers = surveyData.triggers || [];
                        const newTriggers = currentTriggers.includes(key)
                          ? currentTriggers.filter(t => t !== key)
                          : [...currentTriggers, key];
                        setSurveyData({ triggers: newTriggers });
                      }}
                    />
                  ))}
                </div>
              </div>
            </SurveyStep>
          );

        case 5:
          return (
            <SurveyStep
              stepNumber={5}
              totalSteps={totalSteps}
              title={t('stressLevel', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.stressLevel}
            >
              <div className="grid gap-4">
                {Object.entries(t('stressLevels', language) as Record<string, string>).map(([key, level]) => (
                  <OptionButton
                    key={key}
                    option={level}
                    selected={surveyData.stressLevel === key}
                    onClick={() => setSurveyData({ stressLevel: key })}
                    icon={<Brain className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 6:
          return (
            <SurveyStep
              stepNumber={6}
              totalSteps={totalSteps}
              title={t('actionPaceQuestion', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.actionPace}
            >
              <div className="grid gap-4">
                {Object.entries(t('actionPace', language) as Record<string, string>).map(([key, pace]) => (
                  <OptionButton
                    key={key}
                    option={pace}
                    selected={surveyData.actionPace === key}
                    onClick={() => setSurveyData({ actionPace: key })}
                    icon={<Zap className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 7:
          return (
            <SurveyStep
              stepNumber={7}
              totalSteps={totalSteps}
              title={t('complexityTolerance', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.complexityTolerance}
            >
              <div className="grid gap-4">
                {Object.entries(t('complexityLevels', language) as Record<string, string>).map(([key, level]) => (
                  <OptionButton
                    key={key}
                    option={level}
                    selected={surveyData.complexityTolerance === key}
                    onClick={() => setSurveyData({ complexityTolerance: key })}
                    icon={<Star className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 8:
          return (
            <SurveyStep
              stepNumber={8}
              totalSteps={totalSteps}
              title={t('bookLength', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.bookLength}
            >
              <div className="grid gap-4">
                {Object.entries(t('bookLengths', language) as Record<string, string>).map(([key, length]) => (
                  <OptionButton
                    key={key}
                    option={length}
                    selected={surveyData.bookLength === key}
                    onClick={() => setSurveyData({ bookLength: key })}
                    icon={<BookOpen className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 9:
          return (
            <SurveyStep
              stepNumber={9}
              totalSteps={totalSteps}
              title={t('bookFormat', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.bookFormat}
            >
              <div className="grid gap-4">
                {Object.entries(t('bookFormats', language) as Record<string, string>).map(([key, format]) => (
                  <OptionButton
                    key={key}
                    option={format}
                    selected={surveyData.bookFormat === key}
                    onClick={() => setSurveyData({ bookFormat: key })}
                    icon={<BookOpen className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 10:
          return (
            <SurveyStep
              stepNumber={10}
              totalSteps={totalSteps}
              title={t('readingFrequencyQuestion', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.readingFrequency}
            >
              <div className="grid gap-4">
                {Object.entries(t('readingFrequency', language) as Record<string, string>).map(([key, frequency]) => (
                  <OptionButton
                    key={key}
                    option={frequency}
                    selected={surveyData.readingFrequency === key}
                    onClick={() => setSurveyData({ readingFrequency: key })}
                    icon={<Clock className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 11:
          return (
            <SurveyStep
              stepNumber={11}
              totalSteps={totalSteps}
              title={t('finishBooks', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.finishBooks}
            >
              <div className="grid gap-4">
                {[
                  { key: 'always', label: 'Always - I finish every book I start' },
                  { key: 'usually', label: 'Usually - Most books get finished' },
                  { key: 'sometimes', label: 'Sometimes - Depends on the book' },
                  { key: 'rarely', label: 'Rarely - I often abandon books' }
                ].map((option) => (
                  <OptionButton
                    key={option.key}
                    option={option.label}
                    selected={surveyData.finishBooks === option.key}
                    onClick={() => setSurveyData({ finishBooks: option.key })}
                    icon={<Target className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 12:
          return (
            <SurveyStep
              stepNumber={12}
              totalSteps={totalSteps}
              title={t('readingLocation', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.readingLocation}
            >
              <div className="grid gap-4">
                {Object.entries(t('readingLocations', language) as Record<string, string>).map(([key, location]) => (
                  <OptionButton
                    key={key}
                    option={location}
                    selected={surveyData.readingLocation === key}
                    onClick={() => setSurveyData({ readingLocation: key })}
                    icon={<Home className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 13:
          return (
            <SurveyStep
              stepNumber={13}
              totalSteps={totalSteps}
              title={t('wantToLearn', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={true}
            >
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <Lightbulb className="w-6 h-6 text-blue-500 mr-3" />
                  <span className="text-gray-600">Select topics you'd like to explore</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(t('wantToLearnOptions', language) as Record<string, string>).map(([key, topic]) => (
                    <MultiSelectButton
                      key={key}
                      option={topic}
                      selected={surveyData.wantToLearn?.includes(key) || false}
                      onClick={() => {
                        const currentTopics = surveyData.wantToLearn || [];
                        const newTopics = currentTopics.includes(key)
                          ? currentTopics.filter(t => t !== key)
                          : [...currentTopics, key];
                        setSurveyData({ wantToLearn: newTopics });
                      }}
                    />
                  ))}
                </div>
              </div>
            </SurveyStep>
          );

        case 14:
          return (
            <SurveyStep
              stepNumber={14}
              totalSteps={totalSteps}
              title={t('difficultyLevel', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.difficultyLevel}
            >
              <div className="grid gap-4">
                {[
                  { key: 'easy', label: 'Easy - Light, accessible reading' },
                  { key: 'moderate', label: 'Moderate - Some challenge is good' },
                  { key: 'challenging', label: 'Challenging - I like to work for it' },
                  { key: 'academic', label: 'Academic - Bring on the complexity' }
                ].map((option) => (
                  <OptionButton
                    key={option.key}
                    option={option.label}
                    selected={surveyData.difficultyLevel === option.key}
                    onClick={() => setSurveyData({ difficultyLevel: option.key })}
                    icon={<TrendingUp className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 15:
          return (
            <SurveyStep
              stepNumber={15}
              totalSteps={totalSteps}
              title={t('motivationNeeded', language)}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={!!surveyData.motivationNeeded}
            >
              <div className="grid gap-4">
                {Object.entries(t('motivationNeededOptions', language) as Record<string, string>).map(([key, option]) => (
                  <OptionButton
                    key={key}
                    option={option}
                    selected={surveyData.motivationNeeded === key}
                    onClick={() => setSurveyData({ motivationNeeded: key })}
                    icon={<Smile className="w-6 h-6" />}
                  />
                ))}
              </div>
            </SurveyStep>
          );

        case 16:
          return <DataConsentStep />;

        default:
          return null;
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {renderCurrentStep()}
    </div>
  );
};

export default Survey;