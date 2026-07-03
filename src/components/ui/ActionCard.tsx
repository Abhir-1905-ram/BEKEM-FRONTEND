import { type LucideIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionTone = 'primary' | 'success' | 'warning' | 'info' | 'neutral' | 'danger';

const STRIP: Record<ActionTone, string> = {
  primary: 'bg-bekem-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-bekem-accent',
  neutral: 'bg-ink-muted',
  danger: 'bg-danger',
};

const ICON_BG: Record<ActionTone, string> = {
  primary: 'bg-bekem-accent text-white',
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  info: 'bg-bekem-accent-soft text-bekem-accent',
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
          'relative w-full text-left rounded-3xl p-8 lg:p-10 overflow-hidden',
          'bg-gradient-to-br from-bekem-navy to-bekem-navy-light text-white',
          'shadow-card-hover transition-all duration-200',
          onClick && 'hover:-translate-y-1 cursor-pointer',
          className
        )}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="h-14 w-14 rounded-2xl bg-bekem-accent flex items-center justify-center shadow-glow">
              <Icon className="h-7 w-7 text-white" strokeWidth={1.75} />
            </div>
            {count !== undefined && (
              <span className="text-4xl font-semibold tabular-nums text-white/90">{count}</span>
            )}
          </div>
          <p className="text-xl font-semibold mt-6">{title}</p>
          {subtitle && <p className="text-sm text-white/65 mt-2 max-w-md">{subtitle}</p>}
          {onClick && (
            <span className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-bekem-accent-soft">
              Go now <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </div>
        <div className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-white/5" />
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
            'shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105',
            ICON_BG[tone]
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-semibold text-ink">{title}</p>
            {count !== undefined && (
              <span className="text-2xl font-semibold tabular-nums text-ink">{count}</span>
            )}
          </div>
          {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
          {onClick && (
            <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-bekem-accent opacity-0 group-hover:opacity-100 transition-opacity">
              Open <ArrowRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </Comp>
  );
}
