import { Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, DEFAULT_GST_PERCENT } from '@afios/shared';
import type { VendorDto } from '@afios/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchSelect } from '@/components/SearchSelect';
import { GstPercentSelect } from '@/components/GstPercentSelect';
import { computeFinalCost } from '@/lib/quotationTotals';

export interface VendorQuotationDraft {
  vendorId: string;
  vendorName?: string;
  rate: number;
  gstPercent: number;
  paymentTerms: string;
  deliveryTerms: string;
}

interface VendorQuotationEditorProps {
  quotations: VendorQuotationDraft[];
  quantity?: number;
  onChange: (rows: VendorQuotationDraft[]) => void;
  minRows?: number;
}

export function computeDraftFinalCost(row: VendorQuotationDraft, quantity = 1) {
  return computeFinalCost(row.rate, quantity, row.gstPercent);
}

export function VendorQuotationEditor({
  quotations,
  quantity = 1,
  onChange,
  minRows = 3,
}: VendorQuotationEditorProps) {
  const { data: vendors } = useQuery({
    queryKey: ['vendors-active'],
    queryFn: async () => {
      const res = await api.get<{ data: VendorDto[] }>('/vendors');
      return res.data.data ?? [];
    },
  });

  const updateRow = (index: number, patch: Partial<VendorQuotationDraft>) => {
    const next = quotations.map((q, i) => (i === index ? { ...q, ...patch } : q));
    onChange(next);
  };

  const addRow = () => {
    onChange([
      ...quotations,
      {
        vendorId: '',
        rate: 0,
        gstPercent: DEFAULT_GST_PERCENT,
        paymentTerms: '100% payment within 30 days from the date of supply',
        deliveryTerms: 'Delivery as per project schedule',
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (quotations.length <= minRows) return;
    onChange(quotations.filter((_, i) => i !== index));
  };

  const usedVendorIds = new Set(quotations.map((q) => q.vendorId).filter(Boolean));

  return (
    <div className="space-y-2">
      <div className="procurement-landscape-scroll panel overflow-hidden">
        <table className="data-table min-w-[880px]">
          <thead>
            <tr className="bg-surface-muted/40">
              <th className="w-8">#</th>
              <th className="min-w-[160px]">Vendor</th>
              <th className="w-24">Rate</th>
              <th className="w-20">GST</th>
              <th className="w-28">Total</th>
              <th className="min-w-[180px]">Payment terms</th>
              <th className="min-w-[160px]">Delivery terms</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {quotations.map((row, index) => (
              <tr key={index}>
                <td className="text-ink-muted font-medium">{index + 1}</td>
                <td>
                  <SearchSelect
                    compact
                    value={row.vendorId || null}
                    onChange={(id) => {
                      const v = vendors?.find((x) => x.id === id);
                      updateRow(index, { vendorId: id, vendorName: v?.name });
                    }}
                    options={(vendors ?? [])
                      .filter((v) => v.id === row.vendorId || !usedVendorIds.has(v.id))
                      .map((v) => ({
                        id: v.id,
                        label: v.name,
                        sublabel: v.code || v.gstNumber || undefined,
                      }))}
                    placeholder="Vendor"
                    emptyMessage="No vendors"
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    className="input-compact"
                    value={row.rate || ''}
                    onChange={(e) => updateRow(index, { rate: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <GstPercentSelect
                    compact
                    value={row.gstPercent}
                    onChange={(gstPercent) => updateRow(index, { gstPercent })}
                  />
                </td>
                <td className="tabular-nums font-semibold whitespace-nowrap">
                  {formatCurrency(computeDraftFinalCost(row, quantity))}
                </td>
                <td>
                  <Input
                    className="input-compact"
                    value={row.paymentTerms}
                    onChange={(e) => updateRow(index, { paymentTerms: e.target.value })}
                  />
                </td>
                <td>
                  <Input
                    className="input-compact"
                    value={row.deliveryTerms}
                    onChange={(e) => updateRow(index, { deliveryTerms: e.target.value })}
                  />
                </td>
                <td>
                  {quotations.length > minRows && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-ink-muted hover:text-danger p-0.5"
                      aria-label="Remove vendor"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4" />
        Add vendor
      </Button>
    </div>
  );
}
