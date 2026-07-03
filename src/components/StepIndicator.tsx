import { BRAND_ACCENT } from '@/lib/brand';

interface StepIndicatorProps {
  current: number;
  total: number;
  accentColor?: string;
  labels?: string[];
}

export function StepIndicator({
  current,
  total,
  accentColor = BRAND_ACCENT,
  labels,
}: StepIndicatorProps) {
  const stepLabel = labels?.[current]
    ? `Step ${current + 1} of ${total}: ${labels[current]}`
    : `Step ${current + 1} of ${total}`;

  return (
    <div className="px-4">
      <p className="text-center text-xs font-medium text-ink-secondary mb-2" aria-live="polite">
        {stepLabel}
      </p>
      <div
        className="flex items-center justify-center gap-2 py-2"
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={stepLabel}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            title={labels?.[i] ? `Step ${i + 1}: ${labels[i]}` : `Step ${i + 1}`}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i === current ? 24 : 8,
              backgroundColor: i <= current ? accentColor : '#E5E7EB',
            }}
          />
        ))}
      </div>
    </div>
  );
}
