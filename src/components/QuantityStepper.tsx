import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  accentColor?: string;
  size?: 'default' | 'compact';
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  unit,
  accentColor,
  size = 'default',
}: QuantityStepperProps) {
  const compact = size === 'compact';
  const allowDecimal = step < 1;

  const commit = (raw: string) => {
    if (raw === '' || raw === '-') {
      onChange(min);
      return;
    }
    const n = allowDecimal ? parseFloat(raw) : parseInt(raw, 10);
    if (!Number.isFinite(n)) {
      onChange(min);
      return;
    }
    let next = n;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    onChange(next);
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', compact && 'gap-1')}>
      <div className={cn('text-center', compact ? 'min-w-[72px]' : 'min-w-[120px]')}>
        <input
          type="number"
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : min}
          onChange={(e) => commit(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          aria-label="Quantity"
          className={cn(
            'w-full bg-transparent text-center font-bold tabular-nums outline-none',
            'border-b-2 border-current/20 focus:border-current/50',
            'appearance-none [appearance:textfield]',
            '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            compact ? 'text-lg py-0.5' : 'text-4xl py-1'
          )}
          style={{ color: accentColor }}
        />
        {unit && (
          <p className={cn('text-ink-secondary mt-0.5', compact ? 'text-xs' : 'text-sm')}>{unit}</p>
        )}
      </div>
      {max != null && !compact && (
        <p className="text-sm font-medium text-ink-secondary">
          Available: <span className="text-ink font-semibold tabular-nums">{max}</span> {unit}
        </p>
      )}
    </div>
  );
}
