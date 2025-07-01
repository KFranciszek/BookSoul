import * as Sentry from '@sentry/react';

// Initialize Sentry for frontend
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN || 'https://a873cac765c17336bcd420c22a6dd13f@o4509576563326976.ingest.de.sentry.io/4509576593670224';
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development';
  const release = import.meta.env.VITE_SENTRY_RELEASE || '1.0.0';

  if (!dsn) {
    console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [
      new Sentry.BrowserTracing({
        // Set tracing sample rate
        tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
      }),
      new Sentry.Replay({
        // Capture 10% of all sessions for replay
        sessionSampleRate: 0.1,
        // Capture 100% of sessions with an error for replay
        errorSampleRate: 1.0,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // CRITICAL: Enable debug mode to see what's being sent
    debug: true, // ZAWSZE TRUE dla debugowania
    
    // Error filtering
    beforeSend(event, hint) {
      // TEMPORARILY DISABLE FILTERING to see all events
      if (environment === 'development') {
        // Log what we're sending to Sentry
        console.log('🔍 Frontend Sentry Event:', {
          type: event.type,
          level: event.level,
          message: event.message,
          tags: event.tags,
          extra: event.extra ? Object.keys(event.extra) : 'none'
        });
      }
      
      // Filter out development errors in production ONLY
      if (environment === 'production') {
        // Don't send console errors in production
        if (event.exception?.values?.[0]?.value?.includes('Non-Error promise rejection')) {
          return null;
        }
        
        // Don't send network errors that are user-related
        if (event.exception?.values?.[0]?.value?.includes('NetworkError')) {
          return null;
        }
      }
      
      // Add user context if available
      const userContext = localStorage.getItem('user-context');
      if (userContext) {
        try {
          const user = JSON.parse(userContext);
          event.user = {
            id: user.sessionId || 'anonymous',
            email: user.email || undefined,
          };
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      return event;
    },
    
    // Additional configuration
    maxBreadcrumbs: 50,
    attachStacktrace: true,
    
    // CRITICAL: Ensure all message levels are captured
    beforeBreadcrumb(breadcrumb) {
      // Log breadcrumbs in development
      if (environment === 'development') {
        console.log('🍞 Frontend Sentry Breadcrumb:', breadcrumb.message, breadcrumb.category);
      }
      return breadcrumb;
    }
  });

  console.log(`✅ Sentry initialized for frontend (DEBUG MODE) - Environment: ${environment}, Release: ${release}`);
  
  // Test Sentry immediately
  Sentry.captureMessage('Sentry Frontend Initialized Successfully', 'info');
};

// Helper functions for manual error reporting
export const captureError = (error: Error, context?: Record<string, any>) => {
  console.log('📤 Frontend capturing error to Sentry:', error.message, context);
  
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
  console.log(`📤 Frontend capturing message to Sentry [${level}]:`, message, context);
  
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
    }
    
    const eventId = Sentry.captureMessage(message, level);
    console.log(`✅ Frontend Sentry message captured with ID: ${eventId}`);
    
    return eventId;
  });
};

export const setUserContext = (user: { id?: string; email?: string; sessionId?: string }) => {
  Sentry.setUser({
    id: user.id || user.sessionId || 'anonymous',
    email: user.email,
  });
  
  // Store in localStorage for persistence
  localStorage.setItem('user-context', JSON.stringify(user));
};

export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  console.log(`🍞 Frontend adding breadcrumb: ${message} [${category}]`, data);
  
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
};

// React Error Boundary component
export const SentryErrorBoundary = Sentry.withErrorBoundary;

// Performance monitoring helpers
export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({ name, op });
};

export const finishTransaction = (transaction: any) => {
  transaction.finish();
};