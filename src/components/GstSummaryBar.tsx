import { formatCurrency } from '@afios/shared';
import { computeGstBreakdown } from '@afios/shared';
import { cn } from '@/lib/utils';

interface GstSummaryBarProps {
  quantity: number;
  rate: number;
  gstPercent?: number;
  className?: string;
  compact?: boolean;
}

export function GstSummaryBar({
  quantity,
  rate,
  gstPercent = 18,
  className,
  compact = false,
}: GstSummaryBarProps) {
  const { gstPercent: gst, gstAmount, finalAmount, subtotal } = computeGstBreakdown(
    quantity,
    rate,
    gstPercent
  );

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-[11px] tabular-nums', className)}>
        <span>
          <span className="text-ink-muted">GST </span>
          <span className="font-semibold">{gst}%</span>
        </span>
        <span>
          <span className="text-ink-muted">GST amt </span>
          <span className="font-semibold">{formatCurrency(gstAmount)}</span>
        </span>
        <span>
          <span className="text-ink-muted">Final </span>
          <span className="font-semibold text-bekem-navy">{formatCurrency(finalAmount)}</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-surface-border pt-2',
        className
      )}
    >
      <div>
        <p className="text-ink-muted">Subtotal</p>
        <p className="font-semibold tabular-nums">{formatCurrency(subtotal)}</p>
      </div>
      <div>
        <p className="text-ink-muted">GST %</p>
        <p className="font-semibold tabular-nums">{gst}%</p>
      </div>
      <div>
        <p className="text-ink-muted">GST amount</p>
        <p className="font-semibold tabular-nums">{formatCurrency(gstAmount)}</p>
      </div>
      <div>
        <p className="text-ink-muted">Final amount</p>
        <p className="font-semibold tabular-nums text-bekem-navy">{formatCurrency(finalAmount)}</p>
      </div>
    </div>
  );
}
