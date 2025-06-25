import React from 'react';
import { AppProvider, useAppContext } from './contexts/AppContext';
import LandingPage from './components/LandingPage';
import Survey from './components/Survey';
import Recommendations from './components/Recommendations';
import TestConnection from './components/TestConnection';

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
    <>
      {renderCurrentStep()}
      {/* Show connection test only in development */}
      {import.meta.env.DEV && <TestConnection />}
    </>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;