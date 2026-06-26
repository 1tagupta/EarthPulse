import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-space text-white">
          <div className="text-center">
            <h2 className="text-2xl font-heading text-red-400 mb-4">Planetary System Failure</h2>
            <p className="text-gray-400 font-body">An unexpected error occurred in the visualization engine.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
