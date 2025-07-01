import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { captureError } from '../utils/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Capture error in Sentry
    captureError(error, {
      context: 'react_error_boundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });

    // Log error in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="text-red-500 text-6xl mb-4">
              <AlertTriangle className="w-16 h-16 mx-auto" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Ups! Coś poszło nie tak
            </h1>
            
            <p className="text-gray-600 mb-6">
              Wystąpił nieoczekiwany błąd. Nasz zespół został automatycznie powiadomiony 
              i pracuje nad rozwiązaniem problemu.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-2xl hover:from-orange-600 hover:to-pink-600 transition-all transform hover:-translate-y-1"
              >
                <RefreshCw className="w-5 h-5 inline mr-2" />
                Spróbuj ponownie
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-2xl hover:bg-gray-300 transition-all"
              >
                <Home className="w-5 h-5 inline mr-2" />
                Wróć do strony głównej
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Szczegóły błędu (tryb deweloperski)
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;