import { formatCurrency } from '@afios/shared';
import type { MaterialPurchaseHistoryDto } from '@afios/shared';
import { cn } from '@/lib/utils';

interface PurchaseHistoryPanelProps {
  history: MaterialPurchaseHistoryDto[];
  className?: string;
  /** Current quote rate to compare against history (optional). */
  currentQuoteRate?: number | null;
}

export function PurchaseHistoryPanel({
  history,
  className,
  currentQuoteRate,
}: PurchaseHistoryPanelProps) {
  if (!history.length) return null;

  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted mb-1">
        Purchase history (approved POs)
      </p>
      <div className="table-shell">
        <table className="data-table min-w-[480px]">
          <thead>
            <tr>
              <th>Material</th>
              <th className="num">Min</th>
              <th className="num">Max</th>
              <th className="num">Latest</th>
              {currentQuoteRate != null && <th className="num">Current quote</th>}
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.materialId || row.materialName}>
                <td className="cell-text" title={row.materialName}>
                  {row.materialName}
                </td>
                <td className="num">
                  {row.minPurchaseRate != null ? formatCurrency(row.minPurchaseRate) : '—'}
                </td>
                <td className="num">
                  {row.maxPurchaseRate != null ? formatCurrency(row.maxPurchaseRate) : '—'}
                </td>
                <td className="num font-semibold">
                  {row.latestPurchaseRate != null ? formatCurrency(row.latestPurchaseRate) : '—'}
                </td>
                {currentQuoteRate != null && (
                  <td className={cn('num font-semibold', 'text-bekem-navy')}>
                    {formatCurrency(currentQuoteRate)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
