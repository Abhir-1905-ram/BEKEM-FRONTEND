import { cn } from '@/lib/utils';

interface AgeingBadgeProps {
  days: number;
  className?: string;
}

export function AgeingBadge({ days, className }: AgeingBadgeProps) {
  const level = days >= 3 ? 'critical' : days >= 1 ? 'warning' : 'fresh';

  const styles = {
    fresh: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    critical: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const label = days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        styles[level],
        className
      )}
    >
      {label}
    </span>
  );
}

export function daysSince(iso?: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}
