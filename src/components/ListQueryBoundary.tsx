import type { ReactNode } from 'react';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { ListErrorState } from '@/components/ListErrorState';

interface ListQueryBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  retrying?: boolean;
  isEmpty?: boolean;
  empty: ReactNode;
  skeletonRows?: number;
  children: ReactNode;
  errorTitle?: string;
  errorDescription?: string;
}

export function ListQueryBoundary({
  isLoading,
  isError,
  onRetry,
  retrying,
  isEmpty,
  empty,
  skeletonRows = 4,
  children,
  errorTitle,
  errorDescription,
}: ListQueryBoundaryProps) {
  if (isLoading) return <ListSkeleton rows={skeletonRows} />;
  if (isError) {
    return (
      <ListErrorState
        title={errorTitle}
        description={errorDescription}
        onRetry={onRetry}
        retrying={retrying}
      />
    );
  }
  if (isEmpty) return <>{empty}</>;
  return <>{children}</>;
}
