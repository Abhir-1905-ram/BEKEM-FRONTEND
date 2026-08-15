import { ClipboardCheck } from 'lucide-react';

interface ExecutiveProcurementWidgetProps {
  total?: number;
  poPending?: number;
  btPending?: number;
  loading?: boolean;
  onClick?: () => void;
}

export function ExecutiveProcurementWidget({
  total = 0,
  poPending = 0,
  btPending = 0,
  loading,
  onClick,
}: ExecutiveProcurementWidgetProps) {
  if (loading) {
    return (
      <div className="h-24 rounded-lg bg-surface-muted border border-surface-border animate-pulse section-gap" />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left section-gap rounded-lg border border-surface-border bg-white p-3 hover:border-bekem-accent/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Pending Procurement Decisions
          </p>
          <p className="text-2xl font-bold text-ink mt-0.5 tabular-nums">{total}</p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-review-light text-review-dark flex items-center justify-center">
          <ClipboardCheck className="h-4 w-4" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-surface-muted/60 px-2 py-1.5">
          <p className="text-[10px] text-ink-muted">Purchase decisions</p>
          <p className="font-semibold tabular-nums text-base">{poPending}</p>
        </div>
        <div className="rounded-lg bg-surface-muted/60 px-2 py-1.5">
          <p className="text-[10px] text-ink-muted">Branch transfer decisions</p>
          <p className="font-semibold tabular-nums text-base">{btPending}</p>
        </div>
      </div>
    </button>
  );
}
