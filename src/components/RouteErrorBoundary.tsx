import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ListErrorState } from '@/components/ListErrorState';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  /** Reset boundary when route changes */
  resetKey?: string;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors so a single bad .map never blanks the whole shell.
 */
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="page-container max-w-lg py-12">
          <ListErrorState
            title="This page could not load"
            description="Something went wrong while showing this screen. Retry or use the menu to navigate elsewhere."
            onRetry={this.retry}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
