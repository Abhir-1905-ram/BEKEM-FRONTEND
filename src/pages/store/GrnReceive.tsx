import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  ROLE_COLORS,
  UserRole,
  formatCurrency,
  type PurchaseOrderDto,
  type PoGrnReceiptLineDto,
  type ProjectGrnCounterDto,
} from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { cn } from '@/lib/utils';

type ReceiveType = 'PARTIAL' | 'FULL';
type AttachmentCategory = 'INVOICE' | 'CHALLAN' | 'PHOTO';

interface GrnAttachment {
  name: string;
  fileType: string;
  category: AttachmentCategory;
}

interface GrnCreateResponse {
  id: string;
  grnNumber: string;
  status: string;
  approvalStage?: string;
}

function lineKey(line: PoGrnReceiptLineDto) {
  return line.materialId || `line-${line.lineIndex}`;
}

function invoiceRateClass(invoicePrice: number, poRate: number) {
  if (Math.abs(invoicePrice - poRate) < 0.0001) return '';
  if (invoicePrice < poRate) return 'border-emerald-400 text-emerald-700 bg-emerald-50/50';
  return 'border-red-400 text-red-700 bg-red-50/50';
}

function hasAttachmentCategory(attachments: GrnAttachment[], category: AttachmentCategory) {
  return attachments.some((a) => a.category === category);
}

export function GrnReceivePage() {
  const accent = ROLE_COLORS[UserRole.COORDINATOR].primary;
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderDto | null>(null);
  const [receiptLines, setReceiptLines] = useState<PoGrnReceiptLineDto[]>([]);
  const [receivedByLine, setReceivedByLine] = useState<Record<string, number>>({});
  const [invoicePriceByLine, setInvoicePriceByLine] = useState<Record<string, number>>({});
  const [receiveType, setReceiveType] = useState<ReceiveType>('FULL');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [challanNo, setChallanNo] = useState('');
  const [ewayBillNumber, setEwayBillNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachments, setAttachments] = useState<GrnAttachment[]>([]);

  const invoiceRef = useRef<HTMLInputElement>(null);
  const challanRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  const { data: orders, list, refetch } = useListQuery({
    queryKey: ['grn-pending-pos'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[] }>(
        '/goods-receipts/pending-purchase-orders'
      );
      return normalizeListData<PurchaseOrderDto>(res.data.data);
    },
  });

  const { data: grnContext } = useQuery({
    queryKey: ['po-grn-counter', selectedPo?.id],
    queryFn: async () => {
      const res = await api.get<{ data: ProjectGrnCounterDto }>(
        `/purchase-orders/${selectedPo!.id}/grn-counter`
      );
      return res.data.data;
    },
    enabled: !!selectedPo?.id,
  });

  const invoiceValue = useMemo(() => {
    return receiptLines.reduce((sum, row) => {
      const key = lineKey(row);
      const qty = receivedByLine[key] ?? 0;
      const price = invoicePriceByLine[key] ?? row.poRate;
      return sum + qty * price;
    }, 0);
  }, [receiptLines, receivedByLine, invoicePriceByLine]);

  const requiresEway = invoiceValue > 50000;
  const ewayIncomplete = requiresEway && !ewayBillNumber.trim();
  const hasInvoiceUpload = hasAttachmentCategory(attachments, 'INVOICE');
  const hasChallanUpload = hasAttachmentCategory(attachments, 'CHALLAN');

  useEffect(() => {
    if (!grnContext?.lines?.length) return;
    setReceiptLines(grnContext.lines);
    const received: Record<string, number> = {};
    const prices: Record<string, number> = {};
    grnContext.lines.forEach((line) => {
      const key = lineKey(line);
      received[key] = receiveType === 'FULL' ? line.remainingQty : 0;
      prices[key] = line.poRate;
    });
    setReceivedByLine(received);
    setInvoicePriceByLine(prices);
  }, [grnContext, receiveType]);

  const resetForm = () => {
    setSelectedPo(null);
    setReceiptLines([]);
    setReceivedByLine({});
    setInvoicePriceByLine({});
    setReceiveType('FULL');
    setInvoiceNo('');
    setChallanNo('');
    setEwayBillNumber('');
    setRemarks('');
    setAttachments([]);
  };

  const pickFiles = (
    files: FileList | null,
    category: AttachmentCategory,
    input: HTMLInputElement | null
  ) => {
    if (!files?.length) return;
    const added = Array.from(files).map((f) => ({
      name: f.name,
      fileType: f.type || 'application/octet-stream',
      category,
    }));
    setAttachments((prev) => [...prev, ...added]);
    if (input) input.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const validateSubmit = (saveDraft: boolean) => {
    if (saveDraft) return true;
    if (!hasInvoiceUpload || !hasChallanUpload) {
      toast.error('Invoice and Challan uploads are required');
      return false;
    }
    if (ewayIncomplete) {
      toast.message('GRN will be placed on hold until E-Way Bill is approved');
    }
    return true;
  };

  const receive = useMutation({
    mutationFn: async (saveDraft: boolean) => {
      if (!selectedPo) throw new Error('No PO');
      const items = receiptLines.map((line) => {
        const key = lineKey(line);
        const qty = receivedByLine[key] ?? 0;
        const invoiceUnitPrice = invoicePriceByLine[key] ?? line.poRate;
        return {
          materialId: line.materialId!,
          quantityOrdered: line.orderedQty,
          quantityReceived: qty,
          invoiceUnitPrice,
          lineIndex: line.lineIndex,
          lineStatus:
            receiveType === 'FULL' || line.previouslyReceived + qty >= line.orderedQty
              ? 'RECEIVED'
              : ('PARTIAL' as const),
        };
      });
      const res = await api.post<{ data: GrnCreateResponse }>('/goods-receipts', {
        purchaseOrderId: selectedPo.id,
        receiveType,
        invoiceNo,
        invoiceDate: new Date(invoiceDate).toISOString(),
        invoiceValue,
        challanNo,
        ewayBillNumber,
        deliveryDate: new Date().toISOString(),
        remarks,
        attachments,
        saveDraft,
        items,
      });
      return { ...res.data.data, saveDraft };
    },
    onSuccess: (data) => {
      if (data.saveDraft) {
        toast.success('GRN draft saved');
      } else if (data.status === 'ON_HOLD') {
        toast.success(`${data.grnNumber} submitted — on hold pending Coordinator approval`);
      } else {
        toast.success('GRN approved — inventory updated');
      }
      resetForm();
      refetch();
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'GRN failed');
    },
  });

  const submitGrn = (saveDraft: boolean) => {
    if (!validateSubmit(saveDraft)) return;
    receive.mutate(saveDraft);
  };

  const openPo = (po: PurchaseOrderDto) => {
    setSelectedPo(po);
    setReceiveType('FULL');
    setInvoiceNo('');
    setChallanNo('');
    setEwayBillNumber('');
    setRemarks('');
    setAttachments([]);
  };

  return (
    <div className="page-container max-w-6xl">
      <PageHeader
        title="Material receipt (GRN)"
        subtitle="One GRN per supplier invoice — variances go on hold for approval"
      />

      {!selectedPo ? (
        <ListQueryBoundary
          isLoading={list.isLoading}
          isError={list.isError}
          onRetry={list.onRetry}
          retrying={list.retrying}
          isEmpty={!orders?.length}
          empty={
            <EmptyState
              title="No approved POs"
              description="POs appear here after the Store Manager verifies physical delivery at site."
            />
          }
        >
          <div className="space-y-2">
            {(orders ?? []).map((po) => (
              <button
                key={po.id}
                type="button"
                onClick={() => openPo(po)}
                className="panel w-full p-4 text-left hover:border-bekem-accent/40 transition-colors"
              >
                <p className="font-semibold text-ink">PO #{po.displayPoNumber || '—'}</p>
                <p className="text-xs text-ink-muted mt-0.5">{po.procurementRef || po.poNumber}</p>
                <p className="text-sm text-ink-secondary">{po.vendor?.name}</p>
              </button>
            ))}
          </div>
        </ListQueryBoundary>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to PO list
          </button>

          <div className="panel overflow-hidden">
            <div className="h-1 bg-bekem-accent" />
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-surface-border pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    GRN — PO #{selectedPo.displayPoNumber || '—'}
                  </p>
                  {receiptLines.some((l) => l.previouslyReceived > 0) && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                      Partial PO — enter only this delivery&apos;s qty/rates. Variances over tolerance go on hold.
                    </p>
                  )}
                  <p className="text-sm text-ink-muted font-mono mt-0.5">
                    {selectedPo.procurementRef || selectedPo.poNumber}
                  </p>
                  <p className="text-sm text-ink-secondary mt-1">
                    {selectedPo.purchaseRequest?.project?.name} · {selectedPo.vendor?.name}
                  </p>
                </div>
                {grnContext?.grnNumber && (
                  <p className="text-sm font-bold text-ink bg-surface-muted px-3 py-1.5 rounded-lg">
                    Next: {grnContext.grnNumber}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-surface-border">
                <table className="data-table min-w-[760px]">
                  <thead>
                    <tr>
                      <th className="text-left">Item</th>
                      <th className="text-right w-20">Ordered</th>
                      <th className="text-right w-28">Received</th>
                      <th className="text-right w-20">Balance</th>
                      <th className="text-center w-14">Unit</th>
                      <th className="text-right w-28">PO rate</th>
                      <th className="text-right w-32">Invoice rate</th>
                      <th className="text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptLines.map((row) => {
                      const key = lineKey(row);
                      const received = receivedByLine[key] ?? 0;
                      const invoicePrice = invoicePriceByLine[key] ?? row.poRate;
                      const balance = Math.max(0, row.orderedQty - row.previouslyReceived - received);
                      const lineTotal = received * invoicePrice;
                      const qtyOver = received > row.remainingQty + 0.0001;
                      const rateClass = invoiceRateClass(invoicePrice, row.poRate);

                      return (
                        <tr key={key}>
                          <td>
                            <p className="font-medium text-ink">{row.description}</p>
                            {row.previouslyReceived > 0 && (
                              <p className="text-[11px] text-ink-muted mt-0.5">
                                Previously received: {row.previouslyReceived}
                              </p>
                            )}
                          </td>
                          <td className="text-right tabular-nums font-medium">{row.orderedQty}</td>
                          <td className="text-right">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={received}
                              onChange={(e) => {
                                const v = Math.max(0, Number(e.target.value) || 0);
                                setReceivedByLine((prev) => ({ ...prev, [key]: v }));
                              }}
                              className={cn(
                                'h-9 text-right tabular-nums w-24 ml-auto',
                                qtyOver && 'border-amber-400 text-amber-800'
                              )}
                            />
                          </td>
                          <td className="text-right tabular-nums font-semibold text-ink-muted">
                            {balance}
                          </td>
                          <td className="text-center text-ink-secondary">{row.unit || '—'}</td>
                          <td className="text-right tabular-nums">{formatCurrency(row.poRate)}</td>
                          <td className="text-right">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={invoicePrice}
                              onChange={(e) =>
                                setInvoicePriceByLine((prev) => ({
                                  ...prev,
                                  [key]: Number(e.target.value),
                                }))
                              }
                              className={cn(
                                'h-9 text-right tabular-nums w-32 ml-auto',
                                rateClass
                              )}
                            />
                          </td>
                          <td className="text-right tabular-nums font-semibold">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-muted/40">
                      <td colSpan={7} className="text-right font-semibold text-ink-secondary">
                        Invoice value
                      </td>
                      <td className="text-right font-bold tabular-nums">{formatCurrency(invoiceValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-[11px] text-ink-muted">
                Invoice rate: green = below PO rate, red = above PO rate. Qty/price variance puts GRN on hold.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <label className="text-xs font-semibold text-ink-muted">Invoice no.</label>
                  <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="mt-1 h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted">
                    Invoice date <span className="text-danger">*</span>
                  </label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="mt-1 h-9"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted">Challan no.</label>
                  <Input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} className="mt-1 h-9" />
                </div>
                {requiresEway && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-red-700">E-Way Bill no. *</label>
                    <Input
                      value={ewayBillNumber}
                      onChange={(e) => setEwayBillNumber(e.target.value)}
                      className={cn('mt-1 h-9', !ewayBillNumber.trim() && 'border-red-300')}
                    />
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-muted">Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="mt-1 w-full min-h-[64px] rounded-xl border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-ink-muted">Uploads</p>
                  <input ref={invoiceRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => pickFiles(e.target.files, 'INVOICE', invoiceRef.current)} />
                  <input ref={challanRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => pickFiles(e.target.files, 'CHALLAN', challanRef.current)} />
                  <input ref={photosRef} type="file" className="hidden" accept="image/*" multiple onChange={(e) => pickFiles(e.target.files, 'PHOTO', photosRef.current)} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => invoiceRef.current?.click()}
                      className={cn(!hasInvoiceUpload && 'border-amber-300')}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" /> Invoice *
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => challanRef.current?.click()}
                      className={cn(!hasChallanUpload && 'border-amber-300')}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" /> Challan *
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => photosRef.current?.click()}>
                      <ImageIcon className="h-3.5 w-3.5 mr-1" /> Photos
                    </Button>
                  </div>
                  {attachments.length > 0 && (
                    <ul className="text-[11px] text-ink-secondary space-y-1">
                      {attachments.map((a, i) => (
                        <li key={`${a.name}-${i}`} className="flex justify-between gap-2">
                          <span>
                            {a.category}: {a.name}
                          </span>
                          <button type="button" className="text-danger" onClick={() => removeAttachment(i)}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-border">
                <fieldset className="flex flex-wrap gap-3">
                  {(
                    [
                      { value: 'PARTIAL', label: 'Partial' },
                      { value: 'FULL', label: 'Full (remaining)' },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium',
                        receiveType === opt.value
                          ? 'border-bekem-accent bg-bekem-accent/5 text-bekem-accent'
                          : 'border-surface-border text-ink-secondary'
                      )}
                    >
                      <input
                        type="radio"
                        name="receiveType"
                        value={opt.value}
                        checked={receiveType === opt.value}
                        onChange={() => setReceiveType(opt.value)}
                        className="accent-bekem-accent"
                      />
                      {opt.label}
                    </label>
                  ))}
                </fieldset>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={receive.isPending} onClick={() => submitGrn(true)}>
                    Save draft
                  </Button>
                  <Button
                    variant="accent"
                    accentColor={accent}
                    disabled={receive.isPending}
                    onClick={() => submitGrn(false)}
                  >
                    {receive.isPending ? 'Submitting…' : 'Submit GRN'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
