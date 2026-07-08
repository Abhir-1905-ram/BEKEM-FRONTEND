import { ChevronDown, ChevronRight, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_GST_PERCENT } from '@afios/shared';
import type { VendorDto } from '@afios/shared';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { computeFinalCost } from '@/lib/quotationTotals';
import { cn } from '@/lib/utils';

export interface VendorQuotationDraft {
  vendorId: string;
  vendorName?: string;
  rate: number;
  gstPercent: number;
  paymentTerms: string;
  deliveryTerms: string;
  selectedMaterialIds?: string[];
  itemRates?: Array<{
    materialId: string;
    rate: number;
    gstPercent: number;
  }>;
}

interface VendorQuotationEditorProps {
  quotations: VendorQuotationDraft[];
  quantity?: number;
  items?: Array<{ materialId: string; name: string; quantity: number; unit: string }>;
  onChange: (rows: VendorQuotationDraft[]) => void;
  minRows?: number;
}

export function computeDraftFinalCost(row: VendorQuotationDraft, quantity = 1) {
  return computeFinalCost(row.rate, quantity, row.gstPercent);
}

function isAssigned(row: VendorQuotationDraft) {
  return !!row.vendorId && (row.selectedMaterialIds?.length ?? 0) > 0;
}

function dedupeQuotations(rows: VendorQuotationDraft[]): VendorQuotationDraft[] {
  const map = new Map<string, VendorQuotationDraft>();
  for (const row of rows) {
    if (!row.vendorId) continue;
    const existing = map.get(row.vendorId);
    if (!existing) {
      map.set(row.vendorId, row);
      continue;
    }
    const selected = new Set([
      ...(existing.selectedMaterialIds || []),
      ...(row.selectedMaterialIds || []),
    ]);
    const itemRateMap = new Map(
      [...(existing.itemRates || []), ...(row.itemRates || [])].map((it) => [it.materialId, it])
    );
    map.set(row.vendorId, {
      ...existing,
      ...row,
      selectedMaterialIds: Array.from(selected),
      itemRates: Array.from(itemRateMap.values()),
    });
  }
  return Array.from(map.values());
}

export function VendorQuotationEditor({
  quotations,
  quantity: _quantity = 1,
  items = [],
  onChange,
  minRows: _minRows = 3,
}: VendorQuotationEditorProps) {
  const { data: vendors } = useQuery({
    queryKey: ['vendors-active'],
    queryFn: async () => {
      const res = await api.get<{ data: VendorDto[] }>('/vendors');
      return res.data.data ?? [];
    },
  });

  const [productVendorSearch, setProductVendorSearch] = useState<Record<string, string>>({});
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(
    () => items[0]?.materialId ?? null
  );

  const setQuotations = (rows: VendorQuotationDraft[]) => onChange(dedupeQuotations(rows));

  const assignedQuotations = useMemo(
    () => quotations.filter(isAssigned),
    [quotations]
  );

  const allVendorOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code?: string; gstNumber?: string }>();
    for (const v of vendors ?? []) {
      map.set(v.id, { id: v.id, name: v.name, code: v.code, gstNumber: v.gstNumber });
    }
    for (const q of assignedQuotations) {
      if (q.vendorId && !map.has(q.vendorId)) {
        map.set(q.vendorId, { id: q.vendorId, name: q.vendorName || q.vendorId });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors, assignedQuotations]);

  const findQuotationIndex = (vendorId: string) => quotations.findIndex((q) => q.vendorId === vendorId);

  const buildVendorRow = (vendorId: string): VendorQuotationDraft => {
    const vendor = vendors?.find((v) => v.id === vendorId);
    return {
      vendorId,
      vendorName: vendor?.name,
      rate: 0,
      gstPercent: DEFAULT_GST_PERCENT,
      paymentTerms: '100% payment within 30 days from the date of supply',
      deliveryTerms: 'Delivery as per project schedule',
      selectedMaterialIds: [],
      itemRates: items.map((it) => ({
        materialId: it.materialId,
        rate: 0,
        gstPercent: DEFAULT_GST_PERCENT,
      })),
    };
  };

  const updateVendor = (vendorId: string, patch: Partial<VendorQuotationDraft>) => {
    const rowIndex = findQuotationIndex(vendorId);
    if (rowIndex < 0) return;
    const next = quotations.map((q, i) => (i === rowIndex ? { ...q, ...patch } : q));
    setQuotations(next);
  };

  const removeVendor = (vendorId: string) => {
    setQuotations(quotations.filter((q) => q.vendorId !== vendorId));
  };

  const toggleProductVendor = (materialId: string, vendorId: string, checked: boolean) => {
    if (checked) {
      const rowIndex = findQuotationIndex(vendorId);
      const base = rowIndex >= 0 ? quotations[rowIndex] : buildVendorRow(vendorId);
      const selected = new Set(base.selectedMaterialIds || []);
      selected.add(materialId);
      const next =
        rowIndex >= 0
          ? quotations.map((q, i) =>
              i === rowIndex ? { ...q, selectedMaterialIds: Array.from(selected) } : q
            )
          : [...quotations, { ...base, selectedMaterialIds: Array.from(selected) }];
      setQuotations(next);
      return;
    }

    const rowIndex = findQuotationIndex(vendorId);
    if (rowIndex < 0) return;

    const row = quotations[rowIndex];
    const selected = new Set(row.selectedMaterialIds || []);
    selected.delete(materialId);
    const remaining = Array.from(selected);

    if (remaining.length === 0) {
      setQuotations(quotations.filter((_, i) => i !== rowIndex));
      return;
    }

    setQuotations(
      quotations.map((q, i) => (i === rowIndex ? { ...q, selectedMaterialIds: remaining } : q))
    );
  };

  const assignedProductsLabel = (row: VendorQuotationDraft) => {
    const names = items
      .filter((it) => row.selectedMaterialIds?.includes(it.materialId))
      .map((it) => it.name);
    return names.length ? names.join(', ') : '—';
  };

  return (
    <div className="space-y-2">
      {!!items.length && (
        <div className="panel p-2 space-y-3">
          <div>
            <p className="text-xs font-semibold text-ink-muted">Product-wise vendor assignment</p>
            <p className="text-[11px] text-ink-secondary mt-0.5">
              Assign vendors per product below. They appear in the quotation table only after assignment.
            </p>
          </div>
          {items.map((item) => {
            const isExpanded = expandedMaterialId === item.materialId;
            const searchQuery = (productVendorSearch[item.materialId] || '').trim().toLowerCase();
            const filteredVendors = allVendorOptions.filter((vendor) => {
              if (!searchQuery) return true;
              return (
                vendor.name.toLowerCase().includes(searchQuery) ||
                (vendor.code || '').toLowerCase().includes(searchQuery) ||
                (vendor.gstNumber || '').toLowerCase().includes(searchQuery)
              );
            });
            const assignedNames = assignedQuotations
              .filter((q) => q.selectedMaterialIds?.includes(item.materialId))
              .map((q) => q.vendorName || q.vendorId);
            return (
              <div key={item.materialId} className="border border-surface-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className={cn(
                    'w-full bg-surface-muted/40 px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-surface-muted/60 transition-colors',
                    isExpanded && 'bg-bekem-accent/5 border-b border-surface-border'
                  )}
                  onClick={() =>
                    setExpandedMaterialId((prev) =>
                      prev === item.materialId ? null : item.materialId
                    )
                  }
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                    )}
                    <span className="text-xs font-semibold text-ink truncate">{item.name}</span>
                  </span>
                  <p className="text-[11px] text-ink-secondary tabular-nums">
                    Qty {item.quantity} · {item.unit}
                    {assignedNames.length ? (
                      <span className="text-bekem-accent font-medium"> · {assignedNames.join(', ')}</span>
                    ) : (
                      <span className="text-amber-700 font-medium"> · No vendor selected</span>
                    )}
                  </p>
                </button>
                {isExpanded && (
                  <>
                    <div className="px-2.5 py-2 border-b border-surface-border">
                      <div className="relative max-w-sm">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none" />
                        <Input
                          className="input-compact pl-7"
                          placeholder="Search vendors…"
                          value={productVendorSearch[item.materialId] || ''}
                          onChange={(e) =>
                            setProductVendorSearch((prev) => ({
                              ...prev,
                              [item.materialId]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <p className="text-[10px] text-ink-muted mt-1.5">
                        {filteredVendors.length} vendor{filteredVendors.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="procurement-landscape-scroll max-h-64">
                      <table className="data-table min-w-[480px]">
                        <thead>
                          <tr>
                            <th className="w-10">Assign</th>
                            <th>Vendor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVendors.length ? (
                            filteredVendors.map((vendor) => {
                              const row = quotations.find((q) => q.vendorId === vendor.id) ?? null;
                              const isSelected = row?.selectedMaterialIds?.includes(item.materialId) ?? false;
                              return (
                                <tr key={`${item.materialId}-${vendor.id}`}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) =>
                                        toggleProductVendor(item.materialId, vendor.id, e.target.checked)
                                      }
                                      aria-label={`Assign ${item.name} to ${vendor.name}`}
                                    />
                                  </td>
                                  <td className="cell-text whitespace-nowrap">
                                    <span className="block">{vendor.name}</span>
                                    {(vendor.code || vendor.gstNumber) && (
                                      <span className="block text-[10px] text-ink-muted">
                                        {[vendor.code, vendor.gstNumber].filter(Boolean).join(' · ')}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={2} className="text-center text-sm text-ink-muted py-3">
                                No vendors match your search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="procurement-landscape-scroll panel overflow-hidden">
        <div className="px-2.5 py-2 border-b border-surface-border bg-surface-muted/30">
          <p className="text-xs font-semibold text-ink-muted">Assigned vendor quotations</p>
          <p className="text-[11px] text-ink-secondary">
            {assignedQuotations.length
              ? `${assignedQuotations.length} vendor RFQ(s) — each includes only their assigned products`
              : 'Assign vendors to products above — they will appear here'}
          </p>
        </div>
        <table className="data-table min-w-[640px]">
          <thead>
            <tr className="bg-surface-muted/40">
              <th className="w-8">#</th>
              <th className="min-w-[180px]">Vendor</th>
              <th>Products</th>
              <th className="min-w-[160px]">Payment terms</th>
              <th className="min-w-[140px]">Delivery terms</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {assignedQuotations.length ? (
              assignedQuotations.map((row, index) => (
                <tr key={row.vendorId}>
                  <td className="text-ink-muted font-medium">{index + 1}</td>
                  <td className="font-medium text-sm whitespace-nowrap">{row.vendorName || row.vendorId}</td>
                  <td className="text-[11px] text-ink-secondary max-w-[160px]">{assignedProductsLabel(row)}</td>
                  <td>
                    <Input
                      className="input-compact"
                      value={row.paymentTerms}
                      onChange={(e) => updateVendor(row.vendorId, { paymentTerms: e.target.value })}
                    />
                  </td>
                  <td>
                    <Input
                      className="input-compact"
                      value={row.deliveryTerms}
                      onChange={(e) => updateVendor(row.vendorId, { deliveryTerms: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeVendor(row.vendorId)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-medium text-danger hover:text-danger/80 px-1.5 py-1 rounded border border-danger/30 hover:bg-danger/5"
                      aria-label="Remove vendor"
                      title="Remove from all products"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center text-sm text-ink-muted py-6">
                  No vendors assigned yet. Expand a product above and check vendors to assign.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
