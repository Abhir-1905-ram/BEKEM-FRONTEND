import { cn } from '@/lib/utils';

interface ListSkeletonProps {
  rows?: number;
  className?: string;
}

export function ListSkeleton({ rows = 3, className }: ListSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-surface-muted animate-pulse" />
      ))}
    </div>
  );
}
