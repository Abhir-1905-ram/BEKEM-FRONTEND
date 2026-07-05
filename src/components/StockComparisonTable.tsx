import type { IndentLineItemDto } from '@afios/shared';
import { computeRequiredQty, formatCurrency, formatQuantity } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface StockComparisonTableProps {
  items: IndentLineItemDto[];
  className?: string;
  showBanner?: boolean;
  /** Show unit price and line total columns when item pricing is present. */
  showPricing?: boolean;
  /** Server-computed total (sum of line totals). Falls back to item sum. */
  totalEstimatedValue?: number | null;
}

function lineItems(items: IndentLineItemDto[]) {
  return items.map((item) => {
    const requestedQty = item.requestedQty ?? item.quantityRequested ?? 0;
    const availableQty = item.availableQty ?? 0;
    const unitPrice = item.unitPrice ?? null;
    const lineTotal =
      item.lineTotal ??
      (unitPrice != null ? Math.round((requestedQty * unitPrice + Number.EPSILON) * 100) / 100 : null);
    return {
      id: item.id,
      name: item.material?.name || 'Material',
      unit: item.unit || item.material?.unit || '',
      requestedQty,
      availableQty,
      requiredQty: computeRequiredQty(requestedQty, availableQty),
      unitPrice,
      lineTotal,
    };
  });
}

export function StockComparisonTable({
  items,
  className,
  showBanner = true,
  showPricing = false,
  totalEstimatedValue,
}: StockComparisonTableProps) {
  const rows = lineItems(items);
  if (!rows.length) return null;

  const hasShortfall = rows.some((row) => row.requiredQty > 0);
  const hasPricing = showPricing || rows.some((row) => row.unitPrice != null);
  const computedTotal =
    totalEstimatedValue ??
    (hasPricing
      ? Math.round(
          rows.reduce((sum, row) => sum + (row.lineTotal ?? 0), 0) * 100 + Number.EPSILON
        ) / 100
      : null);

  return (
    <div className={cn('space-y-3', className)}>
      {showBanner && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            hasShortfall
              ? 'border-warning/40 bg-warning/10 text-warning-dark'
              : 'border-success/30 bg-success-light/50 text-success-dark'
          )}
        >
          {hasShortfall
            ? 'Insufficient stock available for this project.'
            : 'Stock is available. Material can be issued without procurement.'}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[32rem]">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted/50">
                <th className="text-left px-3 py-2 font-semibold text-ink-muted">Item</th>
                <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Requested</th>
                <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Available</th>
                <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Required</th>
                {hasPricing && (
                  <>
                    <th className="text-right px-3 py-2 font-semibold text-ink-muted w-28">Unit price</th>
                    <th className="text-right px-3 py-2 font-semibold text-ink-muted w-28">Line total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sufficient = row.requiredQty === 0;
                return (
                  <tr key={row.id} className="border-b border-surface-border last:border-0">
                    <td className="px-3 py-3">
                      <p className="font-medium">{row.name}</p>
                      {row.unit && !hasPricing && (
                        <p className="text-xs text-ink-muted">{row.unit}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatQuantity(row.requestedQty, row.unit)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.availableQty}</td>
                    <td
                      className={cn(
                        'px-3 py-3 text-right tabular-nums font-semibold',
                        sufficient ? 'text-success' : 'text-warning-dark'
                      )}
                    >
                      {row.requiredQty}
                    </td>
                    {hasPricing && (
                      <>
                        <td className="px-3 py-3 text-right tabular-nums text-ink-secondary">
                          {formatCurrency(row.unitPrice ?? 0)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium">
                          {formatCurrency(row.lineTotal ?? 0)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {hasPricing && computedTotal != null && (
              <tfoot>
                <tr className="border-t-2 border-surface-border bg-surface-muted/30">
                  <td
                    colSpan={hasPricing ? 5 : 4}
                    className="px-3 py-3 text-right font-semibold text-ink"
                  >
                    Total estimated value
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-bold text-ink">
                    {formatCurrency(computedTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
