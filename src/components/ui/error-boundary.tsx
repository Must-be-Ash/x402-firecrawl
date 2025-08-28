'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center max-w-md px-6 py-8">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Something went wrong
            </h3>
            
            <p className="text-gray-600 mb-6 text-sm">
              We encountered an unexpected error while loading this content. Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  Error Details
                </summary>
                <pre className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            
            <div className="space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors text-sm font-medium"
              >
                Reload Page
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md transition-colors text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional error boundary for specific scenarios
export function NewsErrorFallback({ 
  error, 
  resetError 
}: { 
  error?: Error; 
  resetError?: () => void; 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-center max-w-md">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" 
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load news
        </h3>
        
        <p className="text-gray-600 mb-4 text-sm">
          {error?.message || 'There was a problem loading the news articles. This might be due to a network issue or server error.'}
        </p>

        <div className="space-x-3">
          {resetError && (
            <button
              onClick={resetError}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md transition-colors text-sm font-medium"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

// Calendar specific error fallback
export function CalendarErrorFallback({ 
  resetError 
}: { 
  error?: Error; 
  resetError?: () => void; 
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="text-center">
        <div className="text-red-500 mb-3">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
        </div>
        
        <h4 className="font-semibold text-gray-900 mb-2">
          Calendar Error
        </h4>
        
        <p className="text-gray-600 text-sm mb-4">
          Unable to load calendar
        </p>

        {resetError && (
          <button
            onClick={resetError}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}