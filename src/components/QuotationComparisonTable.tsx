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

type ItemOffer = {
  vendorId: string;
  vendorName: string;
  rate: number;
  gstPercent?: number;
  gstAmount?: number;
  finalCost?: number;
  isL1?: boolean;
};

/**
 * Req 59 — expandable per-item comparison.
 * Each product only lists vendors that quoted THAT product (not all RFQ vendors).
 */
export function QuotationComparisonTable({
  comparison,
  className,
  maxVendors,
}: QuotationComparisonTableProps) {
  const materialComparisons = (comparison.itemComparisons || []).map((item) => {
    let offers = (item.offers || [])
      .filter((o) => o.rate != null && Number(o.rate) > 0)
      .map((o) => ({
        vendorId: o.vendorId,
        vendorName: o.vendorName,
        rate: Number(o.rate),
        finalCost: o.finalCost != null ? Number(o.finalCost) : undefined,
      })) as ItemOffer[];
    offers.sort((a, b) => (a.finalCost ?? a.rate) - (b.finalCost ?? b.rate));
    if (maxVendors && maxVendors > 0) offers = offers.slice(0, maxVendors);
    if (offers.length) {
      const best = offers[0];
      offers = offers.map((o) => ({
        ...o,
        isL1: o.vendorId === best.vendorId,
      }));
    }
    return {
      materialId: item.materialId,
      materialName: item.materialName,
      quantity: item.quantity,
      unit: item.unit,
      minOffer: item.minOffer,
      maxOffer: item.maxOffer,
      offers,
    };
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    materialComparisons.forEach((item, i) => {
      init[item.materialId || String(i)] = i === 0;
    });
    return init;
  });

  if (materialComparisons.length) {
    return (
      <div className={cn('space-y-2', className)}>
        {materialComparisons.map((item, idx) => {
          const key = item.materialId || String(idx);
          const open = !!expanded[key];
          const vendors = item.offers;
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
                      : vendors.length
                        ? ` · ${vendors.length} vendor quote${vendors.length > 1 ? 's' : ''}`
                        : ' · No vendor quotes for this item'}
                  </p>
                </div>
              </button>
              {open && (
                <div className="procurement-landscape-scroll border-t border-surface-border">
                  {!vendors.length ? (
                    <p className="px-3 py-3 text-sm text-ink-muted">
                      No vendors quoted this product — only vendors selected for this item appear here.
                    </p>
                  ) : (
                    <table className="data-table min-w-[640px]">
                      <thead>
                        <tr>
                          <th className="w-28">Metric</th>
                          {vendors.map((v, i) => (
                            <th
                              key={v.vendorId}
                              className={cn(
                                'min-w-[110px]',
                                v.isL1 && 'bg-emerald-50 text-emerald-800'
                              )}
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
                            { key: 'finalCost', label: 'Final Cost', format: 'currency' as const },
                          ] as const
                        ).map((row) => (
                          <tr key={row.key}>
                            <td className="font-medium text-ink-secondary whitespace-nowrap">
                              {row.label}
                            </td>
                            {vendors.map((v) => {
                              const value = row.key === 'rate' ? v.rate : v.finalCost ?? v.rate;
                              return (
                                <td
                                  key={v.vendorId}
                                  className={cn(
                                    v.isL1 && 'bg-emerald-50/60',
                                    'tabular-nums font-semibold'
                                  )}
                                >
                                  {value == null ? '—' : formatCurrency(Number(value))}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: header-level vendor comparison when itemComparisons are unavailable
  const vendors = maxVendors
    ? comparison.vendors.slice(0, maxVendors)
    : comparison.vendors;
  if (!vendors.length) {
    return <p className="text-sm text-ink-muted">No vendor quotations yet.</p>;
  }

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
                    {v[row.key] == null || v[row.key] === ''
                      ? '—'
                      : row.format === 'currency'
                        ? formatCurrency(Number(v[row.key]))
                        : row.format === 'percent'
                          ? `${v[row.key]}%`
                          : String(v[row.key])}
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
