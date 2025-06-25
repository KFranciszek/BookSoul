import React from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { t } from '../utils/translations';
import ProgressBar from './ProgressBar';

interface SurveyStepProps {
  stepNumber: number;
  title: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  canProceed?: boolean;
  totalSteps: number;
  isLoading?: boolean;
  loadingText?: string;
}

const SurveyStep: React.FC<SurveyStepProps> = ({
  stepNumber,
  title,
  children,
  onNext,
  onBack,
  canProceed = true,
  totalSteps,
  isLoading = false,
  loadingText
}) => {
  const { language } = useAppContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {stepNumber} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round((stepNumber / totalSteps) * 100)}%
            </span>
          </div>
          <ProgressBar currentStep={stepNumber} totalSteps={totalSteps} />
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
          <p className="text-gray-600 mb-8">{t('surveySubtitle', language)}</p>
          
          <div className="space-y-6">
            {children}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={onBack}
            disabled={!onBack || isLoading}
            className={`flex items-center px-6 py-3 rounded-2xl font-medium transition-all ${
              onBack && !isLoading
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('back', language)}
          </button>

          <button
            onClick={onNext}
            disabled={!canProceed || isLoading}
            className={`flex items-center px-8 py-3 rounded-2xl font-medium transition-all transform hover:-translate-y-1 ${
              canProceed && !isLoading
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {loadingText || 'Processing...'}
              </>
            ) : (
              <>
                {stepNumber === totalSteps ? t('getRecommendations', language) : t('next', language)}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyStep;