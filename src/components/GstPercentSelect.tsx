import { GST_PERCENT_OPTIONS, snapGstPercent } from '@afios/shared';
import { cn } from '@/lib/utils';

interface GstPercentSelectProps {
  value?: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export function GstPercentSelect({
  value,
  onChange,
  className,
  disabled,
}: GstPercentSelectProps) {
  const selected = snapGstPercent(value);

  return (
    <select
      value={selected}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'flex h-10 w-full rounded-card border border-surface-border bg-white px-3 text-sm text-ink',
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
