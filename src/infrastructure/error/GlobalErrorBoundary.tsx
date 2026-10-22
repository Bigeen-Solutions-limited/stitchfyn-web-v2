import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { GlobalErrorFallback } from './GlobalErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Error reporting (e.g. Sentry) is deferred for launch
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <GlobalErrorFallback />;
    }

    return this.props.children;
  }
}
