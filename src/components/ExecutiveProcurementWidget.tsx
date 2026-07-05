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
      <div className="h-36 rounded-lg bg-surface-muted border border-surface-border animate-pulse mb-6 lg:mb-8" />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left mb-6 lg:mb-8 rounded-lg border border-surface-border bg-white p-4 hover:border-bekem-accent/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Pending Procurement Decisions
          </p>
          <p className="text-3xl font-bold text-ink mt-1 tabular-nums">{total}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-review-light text-review-dark flex items-center justify-center">
          <ClipboardCheck className="h-5 w-5" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-surface-muted/60 px-3 py-2">
          <p className="text-xs text-ink-muted">Purchase decisions</p>
          <p className="font-semibold tabular-nums text-lg">{poPending}</p>
        </div>
        <div className="rounded-lg bg-surface-muted/60 px-3 py-2">
          <p className="text-xs text-ink-muted">Branch transfer decisions</p>
          <p className="font-semibold tabular-nums text-lg">{btPending}</p>
        </div>
      </div>
    </button>
  );
}
