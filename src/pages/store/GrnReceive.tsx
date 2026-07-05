import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Upload, FileText, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ROLE_COLORS, UserRole, formatCurrency, type PurchaseOrderDto, type PoLineItemDto, type ProjectGrnCounterDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { QuantityStepper } from '@/components/QuantityStepper';
import { cn } from '@/lib/utils';

type ReceiveType = 'PARTIAL' | 'FULL';
type AttachmentCategory = 'INVOICE' | 'CHALLAN' | 'PHOTO';

interface GrnAttachment {
  name: string;
  fileType: string;
  category: AttachmentCategory;
}

function primaryLine(po: PurchaseOrderDto): PoLineItemDto | undefined {
  return po.lineItems?.[0];
}

function deliveryLabel(address?: string) {
  if (!address) return '—';
  const first = address.split('\n').find((l) => l.trim());
  return first || address;
}

export function GrnReceivePage() {
  const accent = ROLE_COLORS[UserRole.COORDINATOR].primary;
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderDto | null>(null);
  const [receivedByLine, setReceivedByLine] = useState<Record<string, number>>({});
  const [invoicePriceByLine, setInvoicePriceByLine] = useState<Record<string, number>>({});
  const [receiveType, setReceiveType] = useState<ReceiveType>('FULL');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [ewayBillNumber, setEwayBillNumber] = useState('');
  const [driverName, setDriverName] = useState('');
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

  const projectId = selectedPo?.purchaseRequest?.project?.id;

  const { data: grnPreview } = useQuery({
    queryKey: ['grn-counter', projectId],
    queryFn: async () => {
      const res = await api.get<{ data: ProjectGrnCounterDto }>(
        `/projects/${projectId}/grn-counter`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });

  const line = selectedPo ? primaryLine(selectedPo) : undefined;
  const lines = selectedPo?.lineItems?.length ? selectedPo.lineItems : line ? [line] : [];

  const invoiceValue = useMemo(() => {
    return lines.reduce((sum, row) => {
      if (!row.materialId) return sum;
      const qty = receivedByLine[row.materialId] ?? row.quantity;
      const price = invoicePriceByLine[row.materialId] ?? row.rate;
      return sum + qty * price;
    }, 0);
  }, [lines, receivedByLine, invoicePriceByLine]);

  const requiresEway = invoiceValue > 50000;
  const ewayFieldsIncomplete = requiresEway && (!vehicleNo.trim() || !ewayBillNumber.trim());

  useEffect(() => {
    if (!selectedPo?.lineItems?.length) return;
    if (receiveType === 'FULL') {
      const next: Record<string, number> = {};
      selectedPo.lineItems.forEach((l) => {
        if (l.materialId) next[l.materialId] = l.quantity;
      });
      setReceivedByLine(next);
    }
  }, [receiveType, selectedPo]);

  const resetForm = () => {
    setSelectedPo(null);
    setReceivedByLine({});
    setInvoicePriceByLine({});
    setReceiveType('FULL');
    setInvoiceNo('');
    setChallanNo('');
    setVehicleNo('');
    setEwayBillNumber('');
    setDriverName('');
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

  const receive = useMutation({
    mutationFn: async (saveDraft: boolean) => {
      if (!selectedPo) throw new Error('No PO');
      const items = lines
        .filter((l) => l.materialId)
        .map((l, idx) => {
          const qty = receivedByLine[l.materialId!] ?? l.quantity;
          const invoiceUnitPrice = invoicePriceByLine[l.materialId!] ?? l.rate;
          return {
            materialId: l.materialId!,
            quantityOrdered: l.quantity,
            quantityReceived: qty,
            invoiceUnitPrice,
            lineIndex: idx,
            lineStatus:
              receiveType === 'FULL' || qty >= l.quantity ? 'RECEIVED' : ('PARTIAL' as const),
          };
        });
      await api.post('/goods-receipts', {
        purchaseOrderId: selectedPo.id,
        receiveType,
        invoiceNo,
        invoiceValue,
        challanNo,
        vehicleNo,
        ewayBillNumber,
        driverName,
        deliveryDate: new Date().toISOString(),
        remarks,
        attachments,
        saveDraft,
        items,
      });
    },
    onSuccess: (_, saveDraft) => {
      toast.success(saveDraft ? 'GRN draft saved' : 'GRN approved — inventory updated');
      resetForm();
      refetch();
    },
    onError: () => toast.error('GRN failed'),
  });

  const openPo = (po: PurchaseOrderDto) => {
    setSelectedPo(po);
    const initial: Record<string, number> = {};
    const priceInitial: Record<string, number> = {};
    po.lineItems?.forEach((l) => {
      if (l.materialId) {
        initial[l.materialId] = l.quantity;
        priceInitial[l.materialId] = l.rate;
      }
    });
    setReceivedByLine(initial);
    setInvoicePriceByLine(priceInitial);
    setReceiveType('FULL');
    setInvoiceNo('');
    setChallanNo('');
    setVehicleNo('');
    setEwayBillNumber('');
    setDriverName('');
    setRemarks('');
    setAttachments([]);
  };

  return (
    <div className="page-container max-w-lg">
      <PageHeader
        title="Material receipt (GRN)"
        subtitle="Store Manager / Coordinator — create GRN after physical delivery is verified"
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
              description="POs appear here after the Store Manager verifies physical delivery at site (Verify delivery)."
              actionLabel="Workflow: Store → Verify delivery, then return here for GRN"
              onAction={() =>
                toast.info('Store Manager (storeincharge@bekem.com) must complete Verify delivery first.')
              }
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
                {po.purchaseRequest?.project?.code && (
                  <p className="text-xs text-ink-muted mt-1">{po.purchaseRequest.project.code}</p>
                )}
              </button>
            ))}
          </div>
        </ListQueryBoundary>
      ) : (
        <div className="space-y-5">
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
            <div className="p-5 sm:p-6 space-y-5">
              <div className="border-b border-surface-border pb-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Material Receipt (GRN)
                </p>
                <p className="text-2xl font-bold text-ink">
                  PO #{selectedPo.displayPoNumber || '—'}
                </p>
                <p className="text-sm text-ink-muted font-mono">
                  {selectedPo.procurementRef || selectedPo.poNumber}
                </p>
                <p className="text-xs text-amber-700 font-medium mt-2">Pending receipt</p>
                {grnPreview?.grnNumber && (
                  <p
                    className="text-sm font-semibold text-ink mt-2"
                    title="GRN numbers are continuous across the project and never reset"
                  >
                    This will be {grnPreview.grnNumber}
                  </p>
                )}
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Project
                  </dt>
                  <dd className="font-semibold text-ink mt-1">
                    {selectedPo.purchaseRequest?.project?.name || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Vendor
                  </dt>
                  <dd className="font-semibold text-ink mt-1">{selectedPo.vendor?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    PO Number
                  </dt>
                  <dd className="font-semibold text-ink mt-1">
                    {selectedPo.displayPoNumber || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Material supply year
                  </dt>
                  <dd className="font-semibold text-ink mt-1">
                    {selectedPo.financialYear ? `20${selectedPo.financialYear.replace('-', '-20')}` : '—'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Delivery address
                  </dt>
                  <dd className="text-sm text-ink-secondary mt-1 whitespace-pre-line">
                    {deliveryLabel(selectedPo.deliveryAddress)}
                  </dd>
                </div>
              </dl>

              <div className="rounded-2xl bg-surface-muted/50 border border-surface-border p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Ordered items
                </p>
                {lines.map((row) => {
                  const received = receivedByLine[row.materialId!] ?? row.quantity;
                  const invoicePrice = invoicePriceByLine[row.materialId!] ?? row.rate;
                  const qtyDeviation = Math.abs(received - row.quantity) > 0.0001;
                  const priceDeviation = Math.abs(invoicePrice - row.rate) > 0.0001;
                  return (
                  <div key={row.materialId || row.description} className="border-t border-surface-border pt-3 first:border-0 first:pt-0">
                    <div className="flex items-start gap-2">
                      <p className="font-medium text-ink flex-1">{row.description}</p>
                      {(qtyDeviation || priceDeviation) && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Partial variance
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-6 mt-2">
                      <div>
                        <p className="text-xs text-ink-muted">Ordered</p>
                        <p className="font-bold tabular-nums">{row.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-muted">PO rate</p>
                        <p className="font-bold tabular-nums">{formatCurrency(row.rate)}</p>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <p className={cn('text-xs mb-2', qtyDeviation ? 'text-red-600 font-semibold' : 'text-ink-muted')}>
                          Received qty
                        </p>
                        <QuantityStepper
                          size="compact"
                          value={received}
                          onChange={(v) =>
                            setReceivedByLine((prev) => ({
                              ...prev,
                              [row.materialId!]: v,
                            }))
                          }
                          min={0}
                          max={row.quantity * 2}
                          step={1}
                          accentColor={qtyDeviation ? '#dc2626' : accent}
                        />
                      </div>
                      <div className="min-w-[140px]">
                        <p className={cn('text-xs mb-2', priceDeviation ? 'text-red-600 font-semibold' : 'text-ink-muted')}>
                          Invoice unit price
                        </p>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={invoicePrice}
                          onChange={(e) =>
                            setInvoicePriceByLine((prev) => ({
                              ...prev,
                              [row.materialId!]: Number(e.target.value),
                            }))
                          }
                          className={cn(priceDeviation && 'border-red-300 text-red-700')}
                        />
                      </div>
                    </div>
                  </div>
                );})}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-ink-secondary">Invoice no.</label>
                  <Input
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="Invoice number"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-secondary">Invoice value</label>
                  <p className="mt-2 text-lg font-bold tabular-nums text-ink">
                    {formatCurrency(invoiceValue)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-secondary">Challan no.</label>
                  <Input
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    placeholder="Challan number"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-secondary">Vehicle no.</label>
                  <Input
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder={requiresEway ? 'Required above ₹50,000' : 'Optional'}
                    className={cn('mt-1.5', requiresEway && !vehicleNo.trim() && 'border-amber-300')}
                  />
                </div>
                <div
                  className={cn(
                    'sm:col-span-2 overflow-hidden transition-all duration-300 ease-out',
                    requiresEway ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <label className="text-sm font-medium text-red-700">
                    E-Way Bill no. <span className="text-xs">(required above ₹50,000)</span>
                  </label>
                  <Input
                    value={ewayBillNumber}
                    onChange={(e) => setEwayBillNumber(e.target.value)}
                    placeholder="E-Way Bill number"
                    className={cn('mt-1.5', requiresEway && !ewayBillNumber.trim() && 'border-red-300')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-secondary">Driver name</label>
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver name"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-ink-secondary">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Quality notes, shortage details, etc."
                  className="mt-1.5 w-full min-h-[88px] rounded-xl border border-border px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-ink">Attachments</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    ref={invoiceRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => pickFiles(e.target.files, 'INVOICE', invoiceRef.current)}
                  />
                  <input
                    ref={challanRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => pickFiles(e.target.files, 'CHALLAN', challanRef.current)}
                  />
                  <input
                    ref={photosRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={(e) => pickFiles(e.target.files, 'PHOTO', photosRef.current)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="justify-start gap-2"
                    onClick={() => invoiceRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload invoice
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="justify-start gap-2"
                    onClick={() => challanRef.current?.click()}
                  >
                    <FileText className="h-4 w-4" />
                    Upload challan
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="justify-start gap-2"
                    onClick={() => photosRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Upload photos
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <ul className="text-xs text-ink-secondary space-y-1">
                    {attachments.map((a, i) => (
                      <li key={`${a.name}-${i}`}>
                        {a.category}: {a.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-ink">Receipt type</legend>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      { value: 'PARTIAL', label: 'Partial receive' },
                      { value: 'FULL', label: 'Full receive' },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
                        receiveType === opt.value
                          ? 'border-bekem-accent bg-bekem-accent/5 text-bekem-accent'
                          : 'border-surface-border text-ink-secondary hover:border-bekem-accent/30'
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
                </div>
              </fieldset>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  disabled={receive.isPending}
                  onClick={() => receive.mutate(true)}
                >
                  Save draft
                </Button>
                <Button
                  variant="accent"
                  size="lg"
                  accentColor={accent}
                  className="flex-1"
                  disabled={receive.isPending || ewayFieldsIncomplete}
                  onClick={() => receive.mutate(false)}
                >
                  {receive.isPending ? 'Saving…' : 'Approve GRN'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
