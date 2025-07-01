import React from 'react';
import * as Sentry from '@sentry/react';
import { AppProvider, useAppContext } from './contexts/AppContext';
import LandingPage from './components/LandingPage';
import Survey from './components/Survey';
import Recommendations from './components/Recommendations';
import ErrorBoundary from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const { currentStep } = useAppContext();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <LandingPage />;
      case 1:
        return <Survey />;
      case 2:
        return <Recommendations />;
      default:
        return <LandingPage />;
    }
  };

  return (
    <ErrorBoundary>
      {renderCurrentStep()}
    </ErrorBoundary>
  );
};

// Wrap the main App component with Sentry Error Boundary
const AppWithSentry = Sentry.withErrorBoundary(AppContent, {
  fallback: ({ error, resetError }) => (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Ups! Coś poszło nie tak</h1>
        <p className="text-gray-600 mb-6">
          Wystąpił nieoczekiwany błąd. Nasz zespół został automatycznie powiadomiony i pracuje nad rozwiązaniem problemu.
        </p>
        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-2xl hover:from-orange-600 hover:to-pink-600 transition-all"
          >
            Spróbuj ponownie
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-2xl hover:bg-gray-300 transition-all"
          >
            Odśwież stronę
          </button>
        </div>
        {import.meta.env.DEV && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Szczegóły błędu (tryb deweloperski)
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto max-h-32">
              {error.toString()}
            </pre>
          </details>
        )}
      </div>
    </div>
  ),
  beforeCapture: (scope, error, errorInfo) => {
    scope.setTag('errorBoundary', true);
    scope.setContext('errorInfo', errorInfo);
  },
});

function App() {
  return (
    <AppProvider>
      <AppWithSentry />
    </AppProvider>
  );
}

export default App;