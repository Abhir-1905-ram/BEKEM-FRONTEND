import { GST_PERCENT_OPTIONS, snapGstPercent } from '@afios/shared';
import { cn } from '@/lib/utils';

interface GstPercentSelectProps {
  value?: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function GstPercentSelect({
  value,
  onChange,
  className,
  disabled,
  compact = false,
}: GstPercentSelectProps) {
  const selected = snapGstPercent(value);

  return (
    <select
      value={selected}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'flex w-full rounded-card border border-surface-border bg-white text-ink',
        compact ? 'h-8 px-2 text-xs' : 'h-10 px-3 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-bekem-navy/15 focus:border-bekem-navy/30',
        disabled && 'opacity-60 cursor-not-allowed bg-surface-muted',
        className
      )}
    >
      {GST_PERCENT_OPTIONS.map((pct) => (
        <option key={pct} value={pct}>
          {pct}%
        </option>
      ))}
    </select>
  );
}
