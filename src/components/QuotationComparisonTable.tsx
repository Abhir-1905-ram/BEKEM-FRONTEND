import { formatCurrency } from '@afios/shared';
import type { QuotationComparisonDto } from '@afios/shared';
import { cn } from '@/lib/utils';

interface QuotationComparisonTableProps {
  comparison: QuotationComparisonDto;
  className?: string;
  maxVendors?: number;
}

type RowKey = keyof QuotationComparisonDto['vendors'][0] | 'gstAmount';

const ROWS: Array<{ key: RowKey; label: string; format?: 'currency' | 'percent' | 'text' }> = [
  { key: 'rate', label: 'Rate', format: 'currency' },
  { key: 'gstPercent', label: 'GST %', format: 'percent' },
  { key: 'gstAmount', label: 'GST amount', format: 'currency' },
  { key: 'finalCost', label: 'Final amount', format: 'currency' },
  { key: 'paymentTerms', label: 'Payment terms', format: 'text' },
  { key: 'deliveryTerms', label: 'Delivery terms', format: 'text' },
];

function formatCell(value: unknown, format?: string) {
  if (value == null || value === '') return '—';
  if (format === 'currency') return formatCurrency(Number(value));
  if (format === 'percent') return `${value}%`;
  return String(value);
}

function cellValue(
  vendor: QuotationComparisonDto['vendors'][0],
  key: RowKey
): unknown {
  if (key === 'gstAmount') {
    return vendor.gstAmount ?? null;
  }
  return vendor[key];
}

export function QuotationComparisonTable({
  comparison,
  className,
  maxVendors = 3,
}: QuotationComparisonTableProps) {
  const vendors = comparison.vendors.slice(0, maxVendors);

  if (!vendors.length) {
    return <p className="text-sm text-ink-muted">No vendor quotations yet.</p>;
  }

  return (
    <div className={cn('procurement-landscape-scroll -mx-1', className)}>
      <table className="procurement-landscape-table">
        <thead>
          <tr>
            <th className="w-24" />
            {vendors.map((v, i) => (
              <th
                key={v.id}
                className={cn('min-w-[110px]', v.isL1 && 'bg-emerald-50 text-emerald-800')}
              >
                <span className="block">Vendor {i + 1}</span>
                <span className="block font-normal text-[10px] truncate max-w-[130px]">{v.vendorName}</span>
                {v.isL1 && (
                  <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600">
                    L1
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.key}>
              <td className="font-medium text-ink-secondary whitespace-nowrap">{row.label}</td>
              {vendors.map((v) => (
                <td
                  key={v.id}
                  className={cn(
                    v.isL1 && 'bg-emerald-50/60',
                    row.format === 'currency' && 'tabular-nums font-semibold'
                  )}
                >
                  {formatCell(cellValue(v, row.key), row.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
