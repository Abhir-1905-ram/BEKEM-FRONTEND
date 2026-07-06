import { formatCurrency } from '@afios/shared';
import type { MaterialPurchaseHistoryDto } from '@afios/shared';

interface PurchaseHistoryPanelProps {
  history: MaterialPurchaseHistoryDto[];
  className?: string;
}

export function PurchaseHistoryPanel({ history, className }: PurchaseHistoryPanelProps) {
  if (!history.length) return null;

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
        Purchase history (approved POs)
      </p>
      <div className="space-y-2">
        {history.map((row) => (
          <div
            key={row.materialId || row.materialName}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border px-3 py-2 text-xs"
          >
            <span className="font-medium text-ink">{row.materialName}</span>
            <span className="text-ink-secondary tabular-nums">
              Min {row.minPurchaseRate != null ? formatCurrency(row.minPurchaseRate) : '—'}
              {' · '}
              Max {row.maxPurchaseRate != null ? formatCurrency(row.maxPurchaseRate) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
