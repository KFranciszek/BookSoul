import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Wifi, Zap, BarChart3, Trash2, ChevronDown, ChevronUp, Minimize2 } from 'lucide-react';
import { recommendationAPI } from '../services/api';

const TestConnection: React.FC = () => {
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [isTestingRecommendations, setIsTestingRecommendations] = useState(false);
  const [isTestingOptimized, setIsTestingOptimized] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [recommendationStatus, setRecommendationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [optimizedStatus, setOptimizedStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [performanceData, setPerformanceData] = useState<any>(null);
  
  // Nowy stan dla zwijania/rozwijania
  const [isCollapsed, setIsCollapsed] = useState(false);

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

      const startTime = Date.now();
      const result = await recommendationAPI.generateRecommendations(testSurveyData, false); // Use standard pipeline
      const endTime = Date.now();
      
      if (result.recommendations && result.recommendations.length > 0) {
        setRecommendationStatus('success');
        setPerformanceData(prev => ({
          ...prev,
          standardTime: endTime - startTime
        }));
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

  const testOptimizedRecommendations = async () => {
    setIsTestingOptimized(true);
    setOptimizedStatus('idle');
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

      const startTime = Date.now();
      const result = await recommendationAPI.generateRecommendations(testSurveyData, true); // Use optimized pipeline
      const endTime = Date.now();
      
      if (result.recommendations && result.recommendations.length > 0) {
        setOptimizedStatus('success');
        setPerformanceData(prev => ({
          ...prev,
          optimizedTime: endTime - startTime
        }));
      } else {
        setOptimizedStatus('error');
        setErrorMessage('No recommendations returned from optimized API');
      }
    } catch (error) {
      setOptimizedStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsTestingOptimized(false);
    }
  };

  const clearCache = async () => {
    setIsClearingCache(true);
    
    try {
      const success = await recommendationAPI.clearPerformanceCache();
      if (success) {
        setPerformanceData(null);
        console.log('✅ Performance cache cleared');
      }
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    } finally {
      setIsClearingCache(false);
    }
  };

  const getStatusIcon = (status: 'idle' | 'success' | 'error', isLoading: boolean) => {
    if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    if (status === 'success') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'error') return <XCircle className="w-5 h-5 text-red-500" />;
    return <Wifi className="w-5 h-5 text-gray-400" />;
  };

  const getPerformanceImprovement = () => {
    if (performanceData?.standardTime && performanceData?.optimizedTime) {
      const improvement = ((performanceData.standardTime - performanceData.optimizedTime) / performanceData.standardTime) * 100;
      return improvement.toFixed(1);
    }
    return null;
  };

  return (
    <div className="fixed top-4 left-4 z-50 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-md transition-all duration-300">
      {/* Header z przyciskiem zwijania */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center">
          <Wifi className="w-6 h-6 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Performance Test</h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          title={isCollapsed ? 'Rozwiń panel' : 'Zwiń panel'}
        >
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Zawartość panelu - ukrywana gdy zwinięty */}
      {!isCollapsed && (
        <div className="p-4">
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

            {/* Standard Recommendations Test */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-700">Standard Pipeline</p>
                <p className="text-sm text-gray-500">Sequential AI processing</p>
                {performanceData?.standardTime && (
                  <p className="text-xs text-blue-600">{performanceData.standardTime}ms</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(recommendationStatus, isTestingRecommendations)}
                <button
                  onClick={testRecommendations}
                  disabled={isTestingRecommendations}
                  className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50"
                >
                  Test
                </button>
              </div>
            </div>

            {/* Optimized Recommendations Test */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
              <div>
                <p className="font-medium text-gray-700 flex items-center">
                  <Zap className="w-4 h-4 mr-1 text-green-500" />
                  Optimized Pipeline
                </p>
                <p className="text-sm text-gray-500">Parallel AI processing</p>
                {performanceData?.optimizedTime && (
                  <p className="text-xs text-green-600">{performanceData.optimizedTime}ms</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(optimizedStatus, isTestingOptimized)}
                <button
                  onClick={testOptimizedRecommendations}
                  disabled={isTestingOptimized}
                  className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
                >
                  Test
                </button>
              </div>
            </div>

            {/* Performance Comparison */}
            {getPerformanceImprovement() && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center">
                  <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <p className="font-medium text-green-800">Performance Improvement</p>
                    <p className="text-sm text-green-700">
                      {getPerformanceImprovement()}% faster with optimized pipeline
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cache Control */}
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-700">Cache Control</p>
                <p className="text-sm text-gray-500">Clear performance cache</p>
              </div>
              <button
                onClick={clearCache}
                disabled={isClearingCache}
                className="flex items-center px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50"
              >
                {isClearingCache ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
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
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Optimized:</span>
                <span className="font-mono text-green-600">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimalna wersja gdy zwinięty */}
      {isCollapsed && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Status:</span>
            <div className="flex items-center gap-1">
              {getStatusIcon(healthStatus, isTestingHealth)}
              {getStatusIcon(recommendationStatus, isTestingRecommendations)}
              {getStatusIcon(optimizedStatus, isTestingOptimized)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestConnection;