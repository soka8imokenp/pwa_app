import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrutalButton } from './BrutalButton';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Structured console error logging
    console.error('💥 [Daily Sumire ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCacheAndReload = () => {
    if (window.confirm('Reset local cache and reload? This will clear temporary UI state while preserving your synced data.')) {
      try {
        // Clear non-critical caches
        sessionStorage.clear();
        localStorage.removeItem('kairo_active_tab');
        localStorage.removeItem('kairo_sound_enabled');
      } catch (e) {
        console.error('Failed to clear cache', e);
      }
      window.location.reload();
    }
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F4F0EA] text-[#24201D] flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white border-3 border-[#24201D] rounded-3xl p-6 shadow-[6px_6px_0px_#24201D] flex flex-col items-center text-center">
            {/* Mascot / Icon */}
            <div className="w-16 h-16 rounded-2xl bg-[#F9E2E5] border-2 border-[#24201D] flex items-center justify-center mb-4 text-3xl shadow-[3px_3px_0px_#24201D]">
              🍵💥
            </div>

            <h1 className="text-2xl font-black tracking-tight mb-2 text-[#24201D]">
              Oops! Something went sideways
            </h1>
            <p className="text-sm font-medium text-[#24201D]/70 mb-6">
              Daily Sumire encountered an unexpected error. Don't worry, your offline database and synced records are safe.
            </p>

            <div className="w-full flex flex-col gap-3 mb-4">
              <BrutalButton
                variant="primary"
                size="md"
                onClick={this.handleReload}
                className="w-full justify-center"
              >
                Reload Daily Sumire 🔄
              </BrutalButton>

              <BrutalButton
                variant="outline"
                size="sm"
                onClick={this.handleResetCacheAndReload}
                className="w-full justify-center text-xs"
              >
                Clear Temp Cache & Reload
              </BrutalButton>
            </div>

            {/* Collapsible Error Details for developers & troubleshooting */}
            <button
              onClick={this.toggleDetails}
              className="text-xs font-bold text-[#3D6B52] underline hover:text-[#24201D] cursor-pointer mt-2"
            >
              {this.state.showDetails ? 'Hide technical details ▲' : 'Show technical details ▼'}
            </button>

            {this.state.showDetails && (
              <div className="mt-4 p-3 bg-[#24201D] text-emerald-400 font-mono text-xs rounded-xl w-full text-left overflow-auto max-h-48 border border-[#24201D]">
                <p className="font-bold text-red-400 mb-1">
                  {this.state.error?.name}: {this.state.error?.message}
                </p>
                <pre className="text-[10px] text-gray-300 whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack || this.state.error?.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
