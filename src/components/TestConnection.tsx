import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Wifi } from 'lucide-react';
import { recommendationAPI } from '../services/api';

const TestConnection: React.FC = () => {
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [isTestingRecommendations, setIsTestingRecommendations] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [recommendationStatus, setRecommendationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const testHealthCheck = async () => {
    setIsTestingHealth(true);
    setHealthStatus('idle');
    setErrorMessage('');

    try {
      const isHealthy = await recommendationAPI.healthCheck();
      setHealthStatus(isHealthy ? 'success' : 'error');
      if (!isHealthy) {
        setErrorMessage('Backend server responded but reported unhealthy status');
      }
    } catch (error) {
      setHealthStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsTestingHealth(false);
    }
  };

  const testRecommendations = async () => {
    setIsTestingRecommendations(true);
    setRecommendationStatus('idle');
    setErrorMessage('');

    try {
      const testSurveyData = {
        surveyMode: 'quick' as const,
        favoriteGenres: ['fiction'],
        currentMood: 'curious',
        readingGoal: 'entertain',
        actionPace: 'moderate',
        dataConsent: true
      };

      const result = await recommendationAPI.generateRecommendations(testSurveyData);
      
      if (result.recommendations && result.recommendations.length > 0) {
        setRecommendationStatus('success');
      } else {
        setRecommendationStatus('error');
        setErrorMessage('No recommendations returned from API');
      }
    } catch (error) {
      setRecommendationStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsTestingRecommendations(false);
    }
  };

  const getStatusIcon = (status: 'idle' | 'success' | 'error', isLoading: boolean) => {
    if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    if (status === 'success') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'error') return <XCircle className="w-5 h-5 text-red-500" />;
    return <Wifi className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="fixed top-4 left-4 z-50 bg-white rounded-2xl shadow-lg p-6 border border-gray-200 max-w-md">
      <div className="flex items-center mb-4">
        <Wifi className="w-6 h-6 text-blue-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">Connection Test</h3>
      </div>

      <div className="space-y-4">
        {/* Health Check Test */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-700">Backend Health</p>
            <p className="text-sm text-gray-500">Test if server is running</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(healthStatus, isTestingHealth)}
            <button
              onClick={testHealthCheck}
              disabled={isTestingHealth}
              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              Test
            </button>
          </div>
        </div>

        {/* Recommendations Test */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-700">AI Recommendations</p>
            <p className="text-sm text-gray-500">Test full AI pipeline</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(recommendationStatus, isTestingRecommendations)}
            <button
              onClick={testRecommendations}
              disabled={isTestingRecommendations}
              className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
            >
              Test
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Status Summary */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Frontend URL:</span>
            <span className="font-mono text-blue-600">localhost:5173</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Backend URL:</span>
            <span className="font-mono text-blue-600">localhost:3001</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestConnection;