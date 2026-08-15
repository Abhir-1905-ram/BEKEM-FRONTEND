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
  const iconBg = tone ? STAT_ICON_BG[tone] : 'bg-bekem-accent';

  if (loading) {
    return (
      <div className={cn('panel p-2.5 animate-pulse', hero && 'lg:p-3', className)}>
        <div className="h-3 w-20 bg-surface-muted rounded mb-3" />
        <div className="h-8 w-24 bg-surface-muted rounded" />
      </div>
    );
  }

  const displayValue =
    currency && typeof value === 'string' && value.startsWith('₹') ? (
      <span className="inline-flex items-baseline gap-0.5">
        <span className={cn('font-semibold text-ink-muted', hero ? 'text-sm' : 'text-xs')}>₹</span>
        <span
          className={cn(
            'font-semibold tabular-nums text-ink tracking-tight',
            hero ? 'text-2xl lg:text-3xl' : 'text-xl'
          )}
        >
          {value.slice(1)}
        </span>
      </span>
    ) : (
      <span
        className={cn(
          'font-semibold tabular-nums text-ink tracking-tight',
          hero ? 'text-2xl lg:text-3xl' : 'text-xl'
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
        'relative overflow-hidden rounded-lg border border-surface-border bg-white text-left w-full group',
        'transition-colors duration-200',
        hero ? 'p-3' : 'p-2.5',
        onClick && 'hover:border-bekem-accent/30 hover:bg-bekem-accent-soft/20 cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">{label}</p>
          <div className="mt-0.5">{displayValue}</div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 text-[11px] font-semibold mt-1.5',
                trend.positive === true && 'text-success',
                trend.positive === false && 'text-warning',
                trend.positive === undefined && 'text-ink-muted'
              )}
            >
              {TrendIcon && <TrendIcon className="h-3 w-3" />}
              <span>{trend.label}</span>
            </div>
          )}
          {hint && !trend && <p className="text-[11px] text-ink-muted mt-1">{hint}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          {icon && (
            <div
              className={cn(
                'shrink-0 rounded-lg flex items-center justify-center text-white',
                hero ? 'h-8 w-8' : 'h-7 w-7',
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
