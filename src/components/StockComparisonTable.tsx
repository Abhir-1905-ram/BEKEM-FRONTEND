import type { IndentLineItemDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface StockComparisonTableProps {
  items: IndentLineItemDto[];
  className?: string;
}

function lineItems(items: IndentLineItemDto[]) {
  return items.map((item) => ({
    id: item.id,
    name: item.material?.name || 'Material',
    unit: item.unit || item.material?.unit || '',
    requestedQty: item.requestedQty ?? item.quantityRequested,
    availableQty: item.availableQty ?? 0,
    existingStock: item.existingStock ?? 0,
    requiredQty: item.requiredQty ?? Math.max(0, item.quantityRequested - (item.availableQty ?? 0)),
  }));
}

export function StockComparisonTable({ items, className }: StockComparisonTableProps) {
  const rows = lineItems(items);
  if (!rows.length) return null;

  return (
    <Card className={cn('overflow-hidden p-0', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-surface-muted/50">
            <th className="text-left px-3 py-2 font-semibold text-ink-muted">Item</th>
            <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Requested</th>
            <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Available</th>
            <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Existing</th>
            <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Required</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const short = row.requiredQty > 0;
            return (
              <tr key={row.id} className="border-b border-surface-border last:border-0">
                <td className="px-3 py-3">
                  <p className="font-medium">{row.name}</p>
                  {row.unit && <p className="text-xs text-ink-muted">{row.unit}</p>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{row.requestedQty}</td>
                <td className="px-3 py-3 text-right tabular-nums">{row.availableQty}</td>
                <td className="px-3 py-3 text-right tabular-nums">{row.existingStock}</td>
                <td
                  className={cn(
                    'px-3 py-3 text-right tabular-nums font-medium',
                    short ? 'text-danger' : 'text-ink'
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
  );
}
