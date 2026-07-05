import { cn } from '@/lib/utils';

export function FulfillmentStatusChip({
  status,
  className,
}: {
  status?: 'open_partial' | 'closed_complete' | string;
  className?: string;
}) {
  const isComplete = status === 'closed_complete';
  return (
    <span
      className={cn(
        'enterprise-chip',
        isComplete
          ? 'bg-success-light text-success-dark border-success/25'
          : 'bg-warning-light text-warning-dark border-warning/25',
        className
      )}
    >
      {isComplete ? 'Closed — Complete' : 'Open — Partial'}
    </span>
  );
}
