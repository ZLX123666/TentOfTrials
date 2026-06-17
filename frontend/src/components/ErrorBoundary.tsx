import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trackError } from '../services/telemetry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  fallbackFailed: boolean;
}

/**
 * Reusable error boundary component.
 *
 * Catches render errors in child components and displays a fallback UI
 * instead of crashing the entire application. Errors are logged to both
 * console.error and the telemetry service for monitoring.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      fallbackFailed: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to console.error for debugging
    console.error('[ErrorBoundary] Caught render error:', error.message, errorInfo.componentStack);

    // Log to telemetry service for monitoring
    try {
      trackError(error, 'ErrorBoundary');
    } catch (_telemetryErr) {
      // Telemetry failure must not break the error boundary
      console.error('[ErrorBoundary] Failed to log to telemetry:', _telemetryErr);
    }

    // Call optional onError callback
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (_callbackErr) {
        console.error('[ErrorBoundary] onError callback failed:', _callbackErr);
      }
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, fallbackFailed: false });
  };

  handleCopyError = (): void => {
    const { error, errorInfo } = this.state;
    const details = [
      `Error: ${error?.message ?? 'Unknown error'}`,
      `Stack: ${error?.stack ?? 'No stack trace available'}`,
      `Component Stack: ${errorInfo?.componentStack ?? 'No component stack available'}`,
    ].join('\n\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(details).catch(() => {
        // Clipboard write failed - fallback silently
      });
    }
  };

  componentDidUpdate(_prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    // Detect if the fallback UI itself threw an error by checking if
    // componentDidCatch was called while already in error state
    if (this.state.hasError && prevState.hasError && this.state.error !== prevState.error) {
      this.setState({ fallbackFailed: true });
    }
  }

  render(): ReactNode {
    if (this.state.fallbackFailed) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#ef4444',
          }}
        >
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>
            Something went very wrong
          </h2>
          <p style={{ color: '#888', fontSize: '0.875rem' }}>
            An unexpected error occurred and the fallback UI could not be rendered.
            Please refresh the page or contact support.
          </p>
        </div>
      );
    }

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '240px',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '8px',
            border: '1px solid #fca5a5',
            background: '#fef2f2',
            color: '#1f2937',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              marginBottom: '0.75rem',
            }}
          >
            ⚠️
          </div>
          <h2
            style={{
              marginBottom: '0.5rem',
              fontSize: '1.125rem',
              fontWeight: 600,
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#6b7280',
              maxWidth: '480px',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                background: '#4f46e5',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleCopyError}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              Copy Error Details
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
