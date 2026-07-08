import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@afios/shared';
import type { QuotationComparisonDto } from '@afios/shared';
import { cn } from '@/lib/utils';

interface QuotationComparisonTableProps {
  comparison: QuotationComparisonDto;
  className?: string;
  maxVendors?: number;
}

type VendorCol = QuotationComparisonDto['vendors'][0];

type ItemComparison = {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  vendorOffers?: Array<{
    vendorId: string;
    vendorName: string;
    rate: number;
    gstPercent?: number;
    gstAmount?: number;
    finalCost?: number;
    isL1?: boolean;
  }>;
  minOffer?: { vendorName: string; rate: number } | null;
  maxOffer?: { vendorName: string; rate: number } | null;
};

function formatCell(value: unknown, format?: string) {
  if (value == null || value === '') return '—';
  if (format === 'currency') return formatCurrency(Number(value));
  if (format === 'percent') return `${value}%`;
  return String(value);
}

/**
 * Req 59 — expandable per-item comparison with vendors as columns (Rate / GST / Final Cost).
 */
export function QuotationComparisonTable({
  comparison,
  className,
  maxVendors,
}: QuotationComparisonTableProps) {
  const materialComparisons = (comparison.itemComparisons || []).map((item) => ({
    materialId: item.materialId,
    materialName: item.materialName,
    quantity: item.quantity,
    unit: item.unit,
    minOffer: item.minOffer,
    maxOffer: item.maxOffer,
    vendorOffers: (item.offers || []).map((o) => ({
      vendorId: o.vendorId,
      vendorName: o.vendorName,
      rate: o.rate,
      finalCost: o.finalCost,
    })),
  })) as ItemComparison[];
  const vendors = maxVendors ? comparison.vendors.slice(0, maxVendors) : comparison.vendors;
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    (materialComparisons || []).forEach((item, i) => {
      init[item.materialId || String(i)] = i === 0;
    });
    return init;
  });

  if (!vendors.length) {
    return <p className="text-sm text-ink-muted">No vendor quotations yet.</p>;
  }

  if (materialComparisons?.length) {
    return (
      <div className={cn('space-y-2', className)}>
        {materialComparisons.map((item, idx) => {
          const key = item.materialId || String(idx);
          const open = !!expanded[key];
          return (
            <div key={key} className="panel overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-muted/40"
                onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 text-ink-muted shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{item.materialName}</p>
                  <p className="text-[11px] text-ink-secondary">
                    Qty {item.quantity} {item.unit}
                    {item.minOffer
                      ? ` · Best: ${item.minOffer.vendorName} (${formatCurrency(item.minOffer.rate)})`
                      : ''}
                  </p>
                </div>
              </button>
              {open && (
                <div className="procurement-landscape-scroll border-t border-surface-border">
                  <table className="data-table min-w-[640px]">
                    <thead>
                      <tr>
                        <th className="w-28">Metric</th>
                        {vendors.map((v, i) => (
                          <th
                            key={v.id}
                            className={cn('min-w-[110px]', v.isL1 && 'bg-emerald-50 text-emerald-800')}
                          >
                            <span className="block">Vendor {i + 1}</span>
                            <span className="block font-normal text-[10px] truncate max-w-[130px]">
                              {v.vendorName}
                            </span>
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
                      {(
                        [
                          { key: 'rate', label: 'Rate', format: 'currency' as const },
                          { key: 'gstPercent', label: 'GST %', format: 'percent' as const },
                          { key: 'finalCost', label: 'Final Cost', format: 'currency' as const },
                        ] as const
                      ).map((row) => (
                        <tr key={row.key}>
                          <td className="font-medium text-ink-secondary whitespace-nowrap">
                            {row.label}
                          </td>
                          {vendors.map((v) => {
                            const offer = item.vendorOffers?.find(
                              (o: {
                                vendorId: string;
                                rate: number;
                                gstPercent?: number;
                                gstAmount?: number;
                                finalCost?: number;
                              }) => o.vendorId === v.id
                            );
                            let value: unknown;
                            if (row.key === 'rate') value = offer?.rate ?? (v as VendorCol).rate;
                            else if (row.key === 'gstPercent')
                              value = offer?.gstPercent ?? (v as VendorCol).gstPercent;
                            else
                              value =
                                offer?.finalCost ??
                                offer?.gstAmount ??
                                (v as VendorCol).finalCost ??
                                (v as VendorCol).gstAmount;
                            return (
                              <td
                                key={v.id}
                                className={cn(
                                  v.isL1 && 'bg-emerald-50/60',
                                  row.format === 'currency' && 'tabular-nums font-semibold'
                                )}
                              >
                                {formatCell(value, row.format)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: header-level vendor comparison when itemComparisons are unavailable
  return (
    <div className={cn('space-y-3', className)}>
      <div className="procurement-landscape-scroll -mx-1">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-24" />
              {vendors.map((v, i) => (
                <th
                  key={v.id}
                  className={cn('min-w-[110px]', v.isL1 && 'bg-emerald-50 text-emerald-800')}
                >
                  <span className="block">Vendor {i + 1}</span>
                  <span className="block font-normal text-[10px] truncate max-w-[130px]">
                    {v.vendorName}
                  </span>
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
            {(
              [
                { key: 'rate' as const, label: 'Rate', format: 'currency' as const },
                { key: 'gstPercent' as const, label: 'GST %', format: 'percent' as const },
                { key: 'finalCost' as const, label: 'Final Cost', format: 'currency' as const },
              ] as const
            ).map((row) => (
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
                    {formatCell(v[row.key], row.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
