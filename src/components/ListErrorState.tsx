import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ListErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ListErrorState({
  title = 'Could not load data',
  description = 'Something went wrong while fetching this list. Check your connection and try again.',
  onRetry,
  retrying,
}: ListErrorStateProps) {
  return (
    <div className="panel p-8 text-center border-danger/20 bg-danger-light/30">
      <AlertCircle className="h-10 w-10 text-danger mx-auto mb-3" aria-hidden />
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-sm text-ink-secondary mt-1 max-w-md mx-auto">{description}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onRetry}
          disabled={retrying}
        >
          <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Retrying…' : 'Retry'}
        </Button>
      )}
    </div>
  );
}
