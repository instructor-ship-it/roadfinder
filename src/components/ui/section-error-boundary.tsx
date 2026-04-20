'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Section name shown in the error fallback */
  sectionName: string;
  /** Optional className for the wrapper */
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight section-level error boundary.
 * Wraps individual UI sections (weather, traffic, amenities, etc.) so
 * that a crash in one section does not take down the entire page.
 *
 * Usage:
 *   <SectionErrorBoundary sectionName="Weather">
 *     <WeatherSection ... />
 *   </SectionErrorBoundary>
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[SectionErrorBoundary] ${this.props.sectionName} error:`, error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={`rounded-lg border border-red-800/50 bg-red-900/10 p-4 text-center ${this.props.className || ''}`}
          role="alert"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">
              {this.props.sectionName} — unavailable
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            This section encountered an error. Other sections are unaffected.
          </p>
          <Button
            onClick={this.handleRetry}
            size="sm"
            variant="outline"
            className="border-red-800/50 text-red-400 hover:bg-red-900/20"
            aria-label={`Retry loading ${this.props.sectionName}`}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
