import { useEffect, useState } from 'react';
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
  min = 0,
  max,
  step = 1,
  unit,
  accentColor,
  size = 'default',
}: QuantityStepperProps) {
  const compact = size === 'compact';
  const allowDecimal = step < 1;
  /** Keep blank while editing/cleared so backspace removes 0 instead of sticking on 0. */
  const [draft, setDraft] = useState<string | null>(value > 0 ? null : '');

  useEffect(() => {
    if (value > 0) setDraft(null);
    else setDraft((prev) => (prev === null ? '' : prev));
  }, [value]);

  const display = draft !== null ? draft : String(value);

  const applyNumber = (n: number) => {
    let next = n;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    onChange(next);
    if (next > 0) setDraft(null);
    else setDraft('');
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', compact && 'gap-1')}>
      <div className={cn('text-center', compact ? 'min-w-[72px]' : 'min-w-[120px]')}>
        <input
          type="text"
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          value={display}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw !== '' && !/^-?\d*\.?\d*$/.test(raw)) return;
            if (raw === '' || raw === '-' || raw === '.') {
              setDraft(raw === '.' ? '0.' : raw);
              onChange(0);
              return;
            }
            const n = allowDecimal ? parseFloat(raw) : parseInt(raw, 10);
            if (!Number.isFinite(n)) {
              setDraft(raw);
              return;
            }
            setDraft(raw);
            applyNumber(n);
          }}
          onBlur={() => {
            if (draft === '' || draft === '-' || draft === '.' || draft === '0.') {
              setDraft('');
              onChange(0);
              return;
            }
            if (draft != null) {
              const n = allowDecimal ? parseFloat(draft) : parseInt(draft, 10);
              if (Number.isFinite(n)) applyNumber(n);
              else {
                setDraft('');
                onChange(0);
              }
            }
          }}
          onFocus={(e) => e.target.select()}
          aria-label="Quantity"
          placeholder="Enter number"
          className={cn(
            'w-full bg-transparent text-center font-bold tabular-nums outline-none',
            'border-b-2 border-current/20 focus:border-current/50',
            'appearance-none [appearance:textfield]',
            '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            'placeholder:font-semibold placeholder:text-ink-muted/70 placeholder:normal-nums',
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
