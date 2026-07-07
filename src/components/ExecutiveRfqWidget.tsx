import { FileStack } from 'lucide-react';

interface ExecutiveRfqWidgetProps {
  openCount?: number;
  totalCount?: number;
  loading?: boolean;
  onClick?: () => void;
}

export function ExecutiveRfqWidget({
  openCount = 0,
  totalCount = 0,
  loading,
  onClick,
}: ExecutiveRfqWidgetProps) {
  if (loading) {
    return (
      <div className="h-20 rounded-lg bg-surface-muted border border-surface-border animate-pulse section-gap" />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left section-gap rounded-lg border border-surface-border bg-white p-3 hover:border-bekem-accent/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Request for quotation
          </p>
          <p className="text-2xl font-bold text-ink mt-0.5 tabular-nums">{openCount}</p>
          <p className="text-xs text-ink-secondary mt-0.5">
            {openCount > 0
              ? `${openCount} open RFQ${openCount === 1 ? '' : 's'} — compare quotes before PO`
              : totalCount > 0
                ? `${totalCount} RFQ${totalCount === 1 ? '' : 's'} on file`
                : 'Create RFQ after procurement decision'}
          </p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-bekem-accent/10 text-bekem-accent flex items-center justify-center">
          <FileStack className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}
