export interface SurveyData {
  // Mode selection
  surveyMode: 'quick' | 'deep' | 'cinema';
  
  // Required fields for both modes
  favoriteGenres?: string[];
  currentMood?: string;
  readingGoal?: string;
  actionPace?: string;
  triggers?: string[];
  
  // Cinema mode specific fields - FIXED: Changed to string array
  favoriteFilms?: string[];
  filmConnection?: string;
  
  // Additional required fields for deep mode
  stressLevel?: string;
  emotionalTolerance?: string;
  complexityTolerance?: string;
  bookLength?: string;
  bookFormat?: string;
  readingFrequency?: string;
  finishBooks?: string;
  readingLocation?: string;
  wantToLearn?: string[];
  difficultyLevel?: string;
  motivationNeeded?: string;
  moodImprovement?: string;
  
  // Optional fields
  favoriteBooks?: string;
  favoriteAuthors?: string;
  disappointingBooks?: string;
  literaryMotifs?: string[];
  similarToMovies?: string;
  personalityType?: string;
  cognitiveNeed?: string;
  budget?: string;
  season?: string;
  currentTrends?: string;
  learningTopics?: string;
  socialInfluence?: string;
  bookClub?: string;
  culturalRepresentation?: string;
  identityReflection?: string;
  
  // Technical data
  userName?: string;
  completionDate?: string;
  dataConsent: boolean;
  emailResults?: boolean;
  userEmail?: string;
}

export interface BookRecommendation {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  personalizedDescription: string;
  matchScore: number;
  matchingSteps: string[];
  genres: string[];
  psychologicalMatch: {
    moodAlignment: string;
    cognitiveMatch: string;
    therapeuticValue: string;
    personalityFit: string;
  };
  purchaseLinks: {
    empik?: string;
    amazon?: string;
    taniaKsiazka?: string;
  };
  bookDetails: {
    length: string;
    difficulty: string;
    format: string[];
    readingTime: string;
  };
}

export interface UserProfile {
  emotionalState: string;
  personalityTraits: string[];
  readingPreferences: string[];
  recommendationMode: 'quick' | 'deep' | 'cinema';
  psychologicalProfile?: {
    stressLevel: string;
    cognitiveStyle: string;
    emotionalNeeds: string[];
  };
}

export interface SurveySession {
  id: string;
  survey_mode: string;
  survey_data: SurveyData;
  recommendations: BookRecommendation[];
  user_ratings: Record<string, number>;
  created_at: string;
  updated_at: string;
  user_email?: string;
  session_metadata: any;
}

export interface BookRating {
  bookId: string;
  rating: number; // 0 = not for me, 1 = okay, 2 = perfect match
  timestamp: string;
}