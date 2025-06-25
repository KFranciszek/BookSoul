import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SurveyData, BookRecommendation, UserProfile } from '../types';

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
    setSurveyData(prev => ({ ...prev, ...data }));
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...profile }));
  };

  return (
    <AppContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        surveyData,
        setSurveyData: updateSurveyData,
        recommendations,
        setRecommendations,
        userProfile,
        setUserProfile: updateUserProfile,
        language,
        setLanguage,
        sessionId,
        setSessionId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};