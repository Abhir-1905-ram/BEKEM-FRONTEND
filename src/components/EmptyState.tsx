import { PartyPopper, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  celebrate?: boolean;
  className?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  celebrate,
  className,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const Icon = celebrate ? PartyPopper : Inbox;

  return (
    <div className={cn('panel flex flex-col items-center text-center py-10 px-6', className)}>
      <div
        className={cn(
          'h-11 w-11 rounded-xl flex items-center justify-center mb-3',
          celebrate ? 'bg-success-light' : 'bg-bekem-accent-soft'
        )}
      >
        <Icon
          className={cn('h-7 w-7', celebrate ? 'text-success' : 'text-bekem-accent')}
          strokeWidth={1.5}
        />
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && (
        <p className="text-xs text-ink-muted mt-1.5 max-w-sm leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 text-xs font-semibold text-bekem-accent hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
