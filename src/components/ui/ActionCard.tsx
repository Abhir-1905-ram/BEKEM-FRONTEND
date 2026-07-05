import { type LucideIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionTone = 'primary' | 'success' | 'warning' | 'info' | 'neutral' | 'danger';

const STRIP: Record<ActionTone, string> = {
  primary: 'bg-bekem-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-review',
  neutral: 'bg-ink-muted',
  danger: 'bg-danger',
};

const ICON_BG: Record<ActionTone, string> = {
  primary: 'bg-bekem-accent text-white',
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  info: 'bg-review-light text-review-dark',
  neutral: 'bg-surface-muted text-ink-secondary',
  danger: 'bg-danger-light text-danger-dark',
};

interface ActionCardProps {
  title: string;
  subtitle?: string;
  count?: number | string;
  icon: LucideIcon;
  tone?: ActionTone;
  onClick?: () => void;
  featured?: boolean;
  className?: string;
}

export function ActionCard({
  title,
  subtitle,
  count,
  icon: Icon,
  tone = 'neutral',
  onClick,
  featured,
  className,
}: ActionCardProps) {
  const Comp = onClick ? 'button' : 'div';

  if (featured) {
    return (
      <Comp
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={cn(
          'relative w-full text-left rounded-lg border-2 border-bekem-accent bg-white p-6 lg:p-8 overflow-hidden',
          'transition-colors duration-200',
          onClick && 'hover:bg-bekem-accent-soft/30 cursor-pointer',
          className
        )}
      >
        <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-bekem-accent rounded-l-lg" aria-hidden />
        <div className="flex items-start justify-between gap-4 pl-3">
          <div className="h-12 w-12 rounded-lg bg-bekem-accent flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-white" strokeWidth={1.75} />
          </div>
          {count !== undefined && (
            <span className="text-3xl font-semibold tabular-nums text-ink">{count}</span>
          )}
        </div>
        <p className="text-lg font-semibold mt-5 pl-3 text-ink">{title}</p>
        {subtitle && <p className="text-sm text-ink-secondary mt-1.5 max-w-md pl-3">{subtitle}</p>}
        {onClick && (
          <span className="inline-flex items-center gap-2 mt-5 pl-3 text-sm font-semibold text-bekem-accent">
            Go now <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </Comp>
    );
  }

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('action-card group', onClick && 'cursor-pointer', className)}
    >
      <span className={cn('action-card-strip', STRIP[tone])} aria-hidden />
      <div className="flex items-start gap-4 pl-2">
        <div
          className={cn(
            'shrink-0 h-11 w-11 rounded-lg flex items-center justify-center',
            ICON_BG[tone]
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-semibold text-ink">{title}</p>
            {count !== undefined && (
              <span className="text-2xl font-semibold tabular-nums text-ink">{count}</span>
            )}
          </div>
          {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
          {onClick && (
            <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-bekem-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Open <ArrowRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </Comp>
  );
}
