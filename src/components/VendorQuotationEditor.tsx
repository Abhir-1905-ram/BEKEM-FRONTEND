import { Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@afios/shared';
import type { VendorDto } from '@afios/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchSelect } from '@/components/SearchSelect';
import { computeFinalCost } from '@/lib/quotationTotals';
import { GstSummaryBar } from '@/components/GstSummaryBar';

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
        gstPercent: 18,
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
    <div className="space-y-3">
      {quotations.map((row, index) => (
        <div key={index} className="panel p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-ink-muted">Vendor {index + 1}</p>
            {quotations.length > minRows && (
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-ink-muted hover:text-danger p-1"
                aria-label="Remove vendor"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <SearchSelect
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
            placeholder="Vendor name"
            emptyMessage="No vendors in master"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <p className="text-[11px] font-medium text-ink-muted mb-1">Rate</p>
              <Input
                type="number"
                min={0}
                step="any"
                value={row.rate || ''}
                onChange={(e) => updateRow(index, { rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <p className="text-[11px] font-medium text-ink-muted mb-1">GST %</p>
              <Input
                type="number"
                min={0}
                value={row.gstPercent ?? 18}
                onChange={(e) => updateRow(index, { gstPercent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2">
              <p className="text-[11px] font-medium text-ink-muted mb-1">Total amount</p>
              <p className="h-10 flex items-center px-3 rounded-lg bg-surface-muted text-sm font-semibold tabular-nums">
                {formatCurrency(computeDraftFinalCost(row, quantity))}
              </p>
              <GstSummaryBar
                quantity={quantity}
                rate={row.rate}
                gstPercent={row.gstPercent}
                compact
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-ink-muted mb-1">Payment terms</p>
            <Input
              value={row.paymentTerms}
              onChange={(e) => updateRow(index, { paymentTerms: e.target.value })}
            />
          </div>
          <div>
            <p className="text-[11px] font-medium text-ink-muted mb-1">Delivery terms</p>
            <Input
              value={row.deliveryTerms}
              onChange={(e) => updateRow(index, { deliveryTerms: e.target.value })}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4" />
        Add vendor
      </Button>
    </div>
  );
}
