'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component for graceful error handling
 * - Shows user-friendly error message
 * - Provides retry and home navigation options
 * - Includes debug info for development
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorText = `Error: ${error?.message}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorText);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4"
          role="alert"
        >
          <div className="w-full max-w-md bg-gray-800 rounded-xl p-6 text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-400 text-sm mb-6">
              An unexpected error occurred. Please try again or return to the home page.
            </p>

            {/* Error Details (collapsible) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 flex items-center gap-1">
                  <Bug className="w-3 h-3" />
                  Debug Info
                </summary>
                <div className="mt-2 p-3 bg-gray-900 rounded-lg overflow-auto max-h-32">
                  <p className="text-red-400 text-xs font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="text-gray-500 text-[10px] mt-2 whitespace-pre-wrap">
                      {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleReset}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12"
                aria-label="Try again"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 h-12"
                aria-label="Go to home page"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={this.handleCopyError}
                  variant="ghost"
                  className="w-full text-gray-500 hover:text-gray-400 h-10"
                  aria-label="Copy error details"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Copy Error Details
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Async error handler for use with async operations
 */
export function useAsyncError() {
  const [, setError] = React.useState<Error | null>(null);

  return (error: Error) => {
    setError(() => {
      throw error;
    });
  };
}
