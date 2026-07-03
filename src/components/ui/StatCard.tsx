import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatTone } from '@/lib/roleColors';
import { STAT_ICON_BG } from '@/lib/roleColors';
import { Sparkline } from '@/components/ui/Sparkline';

export interface StatTrend {
  label: string;
  positive?: boolean;
  changePct?: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: StatTone;
  trend?: StatTrend;
  sparkline?: number[];
  currency?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  hero?: boolean;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  trend,
  sparkline,
  currency,
  loading,
  onClick,
  className,
  hero,
}: StatCardProps) {
  const Comp = onClick ? 'button' : 'div';
  const iconBg = tone ? STAT_ICON_BG[tone] : 'bg-bekem-navy';

  if (loading) {
    return (
      <div className={cn('panel p-6 lg:p-8 animate-pulse', hero && 'lg:p-10', className)}>
        <div className="h-4 w-24 bg-surface-muted rounded mb-6" />
        <div className="h-12 w-32 bg-surface-muted rounded" />
      </div>
    );
  }

  const displayValue =
    currency && typeof value === 'string' && value.startsWith('₹') ? (
      <span className="inline-flex items-baseline gap-0.5">
        <span className={cn('font-semibold text-ink-muted', hero ? 'text-xl' : 'text-lg')}>₹</span>
        <span
          className={cn(
            'font-semibold tabular-nums text-ink tracking-tight',
            hero ? 'text-5xl lg:text-6xl' : 'text-4xl'
          )}
        >
          {value.slice(1)}
        </span>
      </span>
    ) : (
      <span
        className={cn(
          'font-semibold tabular-nums text-ink tracking-tight',
          hero ? 'text-5xl lg:text-6xl' : 'text-4xl'
        )}
      >
        {value}
      </span>
    );

  const TrendIcon =
    trend?.changePct !== undefined ? (trend.changePct >= 0 ? TrendingUp : TrendingDown) : null;

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-surface-border bg-white text-left w-full group',
        'shadow-card transition-all duration-200',
        hero ? 'p-8 lg:p-10' : 'p-6 lg:p-7',
        onClick && 'hover:shadow-card-hover hover:-translate-y-1 cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{label}</p>
          <div className="mt-3">{displayValue}</div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1.5 text-xs font-semibold mt-3',
                trend.positive === true && 'text-success',
                trend.positive === false && 'text-warning',
                trend.positive === undefined && 'text-ink-muted'
              )}
            >
              {TrendIcon && <TrendIcon className="h-3.5 w-3.5" />}
              <span>{trend.label}</span>
            </div>
          )}
          {hint && !trend && <p className="text-xs text-ink-muted mt-2">{hint}</p>}
        </div>
        <div className="flex flex-col items-end gap-3">
          {icon && (
            <div
              className={cn(
                'shrink-0 rounded-2xl flex items-center justify-center text-white shadow-sm',
                'transition-transform group-hover:scale-105',
                hero ? 'h-14 w-14' : 'h-12 w-12',
                iconBg
              )}
            >
              {icon}
            </div>
          )}
          {sparkline && sparkline.length > 0 && (
            <Sparkline data={sparkline} positive={trend?.positive !== false} />
          )}
        </div>
      </div>
    </Comp>
  );
}
