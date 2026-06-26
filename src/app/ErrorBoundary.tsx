import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label ?? 'unknown'}] Uncaught error:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const label = this.props.label ?? 'Component';
      return (
        <div className="flex items-center justify-center h-screen bg-space text-white">
          <div className="text-center max-w-2xl px-6">
            <h2 className="text-2xl font-heading text-red-400 mb-2">
              {label} — Crash
            </h2>
            <p className="text-gray-400 font-body mb-4 text-sm">
              An unexpected error occurred in <strong>{label}</strong>.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs text-red-300 bg-black/60 rounded p-4 overflow-auto max-h-72 whitespace-pre-wrap break-all">
                <strong>{this.state.error.name}: {this.state.error.message}</strong>
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            )}
            <button
              className="mt-4 px-6 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 rounded-full text-white font-mono uppercase tracking-wider"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
