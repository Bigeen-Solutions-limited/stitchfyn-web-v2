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

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // In a production app, we would log this to an external service like Sentry
    // For now, we redirect to the 500 page via window.location if we're not already there
    /*
    if (!window.location.pathname.includes('/500')) {
       // We use window.location because we might be outside the Router context 
       // or the Router itself might have crashed
       window.location.href = '/500';
    }
    */
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <GlobalErrorFallback />;
    }

    return this.props.children;
  }
}
