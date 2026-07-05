import { FilePlus } from 'lucide-react';

interface ExecutivePurchaseRequestsWidgetProps {
  count?: number;
  loading?: boolean;
  onClick?: () => void;
}

export function ExecutivePurchaseRequestsWidget({
  count = 0,
  loading,
  onClick,
}: ExecutivePurchaseRequestsWidgetProps) {
  if (loading) {
    return (
      <div className="h-28 rounded-lg bg-surface-muted border border-surface-border animate-pulse mb-6 lg:mb-8" />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left mb-6 lg:mb-8 rounded-lg border border-surface-border bg-white p-4 hover:border-bekem-accent/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Pending purchase requests
          </p>
          <p className="text-3xl font-bold text-ink mt-1 tabular-nums">{count}</p>
          <p className="text-sm text-ink-secondary mt-1">
            PM-forwarded indents ready for procurement decision
          </p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-bekem-accent/10 text-bekem-accent flex items-center justify-center">
          <FilePlus className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}
