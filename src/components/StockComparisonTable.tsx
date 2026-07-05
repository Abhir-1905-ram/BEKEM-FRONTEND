import type { IndentLineItemDto } from '@afios/shared';
import { computeRequiredQty } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface StockComparisonTableProps {
  items: IndentLineItemDto[];
  className?: string;
  showBanner?: boolean;
}

function lineItems(items: IndentLineItemDto[]) {
  return items.map((item) => {
    const requestedQty = item.requestedQty ?? item.quantityRequested ?? 0;
    const availableQty = item.availableQty ?? 0;
    return {
      id: item.id,
      name: item.material?.name || 'Material',
      unit: item.unit || item.material?.unit || '',
      requestedQty,
      availableQty,
      requiredQty: computeRequiredQty(requestedQty, availableQty),
    };
  });
}

export function StockComparisonTable({
  items,
  className,
  showBanner = true,
}: StockComparisonTableProps) {
  const rows = lineItems(items);
  if (!rows.length) return null;

  const hasShortfall = rows.some((row) => row.requiredQty > 0);

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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted/50">
              <th className="text-left px-3 py-2 font-semibold text-ink-muted">Item</th>
              <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Requested</th>
              <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Available</th>
              <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Required</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const sufficient = row.requiredQty === 0;
              return (
                <tr key={row.id} className="border-b border-surface-border last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-medium">{row.name}</p>
                    {row.unit && <p className="text-xs text-ink-muted">{row.unit}</p>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.requestedQty}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.availableQty}</td>
                  <td
                    className={cn(
                      'px-3 py-3 text-right tabular-nums font-semibold',
                      sufficient ? 'text-success' : 'text-warning-dark'
                    )}
                  >
                    {row.requiredQty}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
