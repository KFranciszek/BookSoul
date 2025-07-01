import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { SurveyData, BookRecommendation, UserProfile } from '../types';
import { setUserContext, addBreadcrumb } from '../utils/sentry';

interface AppContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  surveyData: Partial<SurveyData>;
  setSurveyData: (data: Partial<SurveyData>) => void;
  recommendations: BookRecommendation[];
  setRecommendations: (recommendations: BookRecommendation[]) => void;
  userProfile: Partial<UserProfile>;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  language: 'en' | 'pl';
  setLanguage: (lang: 'en' | 'pl') => void;
  sessionId: string | null;
  setSessionId: (sessionId: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [surveyData, setSurveyData] = useState<Partial<SurveyData>>({});
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});
  const [language, setLanguage] = useState<'en' | 'pl'>('en');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const updateSurveyData = (data: Partial<SurveyData>) => {
    setSurveyData(prev => {
      const newData = { ...prev, ...data };
      
      // Add Sentry breadcrumb for survey data updates (only in development)
      if (import.meta.env.DEV) {
        addBreadcrumb(
          'Survey data updated',
          'user_action',
          {
            step: currentStep,
            mode: newData.surveyMode,
            updatedFields: Object.keys(data)
          }
        );
      }
      
      return newData;
    });
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...profile }));
  };

  const updateCurrentStep = (step: number) => {
    setCurrentStep(step);
    
    // Add Sentry breadcrumb for step changes (only in development)
    if (import.meta.env.DEV) {
      addBreadcrumb(
        `Navigation: Step ${step}`,
        'navigation',
        {
          previousStep: currentStep,
          newStep: step,
          stepName: step === 0 ? 'landing' : step === 1 ? 'survey' : step === 2 ? 'recommendations' : 'unknown'
        }
      );
    }
  };

  const updateSessionId = (newSessionId: string | null) => {
    setSessionId(newSessionId);
    
    if (newSessionId) {
      // Update Sentry user context when session is created
      setUserContext({
        sessionId: newSessionId,
        email: surveyData.userEmail
      });
      
      // Add breadcrumb (only in development)
      if (import.meta.env.DEV) {
        addBreadcrumb(
          'Session created',
          'user_action',
          {
            sessionId: newSessionId,
            mode: surveyData.surveyMode
          }
        );
      }
    }
  };

  const updateRecommendations = (newRecommendations: BookRecommendation[]) => {
    setRecommendations(newRecommendations);
    
    // Add Sentry breadcrumb for recommendations received (only in development)
    if (import.meta.env.DEV) {
      addBreadcrumb(
        'Recommendations received',
        'user_action',
        {
          count: newRecommendations.length,
          sessionId,
          mode: surveyData.surveyMode
        }
      );
    }
  };

  // Update Sentry context when language changes (only in development)
  useEffect(() => {
    if (import.meta.env.DEV) {
      addBreadcrumb(
        `Language changed to ${language}`,
        'user_action',
        { language }
      );
    }
  }, [language]);

  return (
    <AppContext.Provider
      value={{
        currentStep,
        setCurrentStep: updateCurrentStep,
        surveyData,
        setSurveyData: updateSurveyData,
        recommendations,
        setRecommendations: updateRecommendations,
        userProfile,
        setUserProfile: updateUserProfile,
        language,
        setLanguage,
        sessionId,
        setSessionId: updateSessionId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};