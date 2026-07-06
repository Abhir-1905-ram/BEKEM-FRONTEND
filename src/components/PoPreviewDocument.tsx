import { formatCurrency } from '@afios/shared';
import type { PoLineItemDto, VendorDto } from '@afios/shared';
import { computePoLineTotals } from '@/lib/poLineTotals';
import { buildAllPoTerms } from '@/lib/poTerms';

export interface PoPreviewData {
  vendorName: string;
  vendorAddress?: string;
  vendorGst?: string;
  vendorEmail?: string;
  vendorContact?: string;
  vendorPhone?: string;
  paymentTerms: string;
  additionalTerms?: string;
  poAmount?: number;
  billingAddress: string;
  deliveryAddress: string;
  referenceNote?: string;
  expectedDeliveryDate?: string;
  lineItems: PoLineItemDto[];
  vendors?: VendorDto[];
}

interface PoPreviewDocumentProps {
  data: PoPreviewData;
  className?: string;
}

export function PoPreviewDocument({ data, className }: PoPreviewDocumentProps) {
  const subtotal = data.lineItems.reduce((s, row) => s + (row.amount || 0), 0);
  const tax = data.lineItems.reduce(
    (s, row) => s + computePoLineTotals(row.quantity, row.rate, row.gstPercent ?? 18).tax,
    0
  );
  const grandTotal = subtotal + tax;

  return (
    <div
      className={`bg-white border border-surface-border rounded-2xl shadow-sm overflow-hidden ${className || ''}`}
    >
      <div className="bg-bekem-accent text-white px-6 py-4 text-center">
        <p className="text-lg font-bold tracking-wide">BEKEM INFRA PROJECTS PVT. LTD.</p>
        <p className="text-sm font-semibold mt-1">PURCHASE ORDER — PREVIEW</p>
      </div>

      <div className="p-6 space-y-5 text-sm">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-bekem-accent mb-1">To</p>
            <p className="font-semibold text-ink">{data.vendorName}</p>
            {data.vendorAddress && (
              <p className="text-ink-secondary whitespace-pre-line mt-1">{data.vendorAddress}</p>
            )}
            {data.vendorGst && <p className="text-xs text-ink-muted mt-1">GST: {data.vendorGst}</p>}
            {data.vendorContact && (
              <p className="text-xs text-ink-muted mt-1">
                Attn: {data.vendorContact}
                {data.vendorPhone ? ` · ${data.vendorPhone}` : ''}
              </p>
            )}
            {data.vendorEmail && <p className="text-xs text-ink-muted">{data.vendorEmail}</p>}
          </div>
          <div className="text-right text-xs text-ink-muted space-y-1">
            {data.referenceNote && <p>Ref: {data.referenceNote}</p>}
            {data.expectedDeliveryDate && <p>Delivery: {data.expectedDeliveryDate}</p>}
          </div>
        </div>

        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-bekem-accent text-white">
              <th className="text-left px-2 py-2 font-semibold">#</th>
              <th className="text-left px-2 py-2 font-semibold">Description</th>
              <th className="text-right px-2 py-2 font-semibold">Qty</th>
              <th className="text-right px-2 py-2 font-semibold">Rate</th>
              <th className="text-right px-2 py-2 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((row, i) => (
              <tr key={i} className="border-b border-surface-border">
                <td className="px-2 py-2">{i + 1}</td>
                <td className="px-2 py-2">{row.description}</td>
                <td className="px-2 py-2 text-right tabular-nums">{row.quantity}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(row.rate)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-48 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-muted">Sub total</span>
              <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">GST</span>
              <span className="font-medium tabular-nums">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-surface-border pt-1 font-semibold">
              <span>Grand total</span>
              <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-bekem-accent mb-1">Payment terms</p>
          <p>{data.paymentTerms}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-surface-border">
          <div>
            <p className="text-xs font-semibold text-bekem-accent mb-1">Buyer&apos;s address</p>
            <p className="text-xs whitespace-pre-line text-ink-secondary">{data.billingAddress}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-bekem-accent mb-1">Consignee address</p>
            <p className="text-xs whitespace-pre-line text-ink-secondary">{data.deliveryAddress}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-bekem-accent mb-1">Terms &amp; conditions</p>
          <ol className="text-xs text-ink-secondary list-decimal list-inside space-y-0.5">
            {buildAllPoTerms({
              amount: data.poAmount ?? grandTotal,
              paymentTerms: data.paymentTerms,
              additionalTerms: data.additionalTerms,
            }).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
