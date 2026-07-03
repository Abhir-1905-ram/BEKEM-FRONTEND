import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ROLE_COLORS, UserRole, type PurchaseOrderDto, type PoLineItemDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/EmptyState';
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
  const [receiveType, setReceiveType] = useState<ReceiveType>('FULL');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachments, setAttachments] = useState<GrnAttachment[]>([]);

  const invoiceRef = useRef<HTMLInputElement>(null);
  const challanRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  const { data: orders, refetch } = useQuery({
    queryKey: ['grn-pending-pos'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[] }>(
        '/goods-receipts/pending-purchase-orders'
      );
      return res.data.data;
    },
  });

  const line = selectedPo ? primaryLine(selectedPo) : undefined;
  const lines = selectedPo?.lineItems?.length ? selectedPo.lineItems : line ? [line] : [];

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
    setReceiveType('FULL');
    setInvoiceNo('');
    setChallanNo('');
    setVehicleNo('');
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
        .map((l) => {
          const qty = receivedByLine[l.materialId!] ?? l.quantity;
          return {
            materialId: l.materialId!,
            quantityOrdered: l.quantity,
            quantityReceived: qty,
            lineStatus:
              receiveType === 'FULL' || qty >= l.quantity ? 'RECEIVED' : ('PARTIAL' as const),
          };
        });
      await api.post('/goods-receipts', {
        purchaseOrderId: selectedPo.id,
        receiveType,
        invoiceNo,
        challanNo,
        vehicleNo,
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
    po.lineItems?.forEach((l) => {
      if (l.materialId) initial[l.materialId] = l.quantity;
    });
    setReceivedByLine(initial);
    setReceiveType('FULL');
    setInvoiceNo('');
    setChallanNo('');
    setVehicleNo('');
    setDriverName('');
    setRemarks('');
    setAttachments([]);
  };

  return (
    <div className="page-container max-w-lg">
      <PageHeader
        title="Material receipt (GRN)"
        subtitle="Inventory coordinator — create GRN after store verifies physical delivery"
      />

      {!selectedPo ? (
        !orders?.length ? (
          <EmptyState
            title="No approved POs"
            description="POs appear here after the Store Manager verifies physical delivery at site (Verify delivery)."
            actionLabel="Workflow: Store → Verify delivery, then return here for GRN"
            onAction={() =>
              toast.info('Store Manager (storeincharge@bekem.com) must complete Verify delivery first.')
            }
          />
        ) : (
          <div className="space-y-2">
            {orders.map((po) => (
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
        )
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
            <div className="h-1 bg-gradient-to-r from-bekem-navy to-bekem-accent" />
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
                {lines.map((row) => (
                  <div key={row.materialId || row.description} className="border-t border-surface-border pt-3 first:border-0 first:pt-0">
                    <p className="font-medium text-ink">{row.description}</p>
                    <div className="flex flex-wrap gap-6 mt-2">
                      <div>
                        <p className="text-xs text-ink-muted">Ordered</p>
                        <p className="font-bold tabular-nums">{row.quantity}</p>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-xs text-ink-muted mb-2">Received</p>
                        <QuantityStepper
                          size="compact"
                          value={receivedByLine[row.materialId!] ?? row.quantity}
                          onChange={(v) =>
                            setReceivedByLine((prev) => ({
                              ...prev,
                              [row.materialId!]: v,
                            }))
                          }
                          min={0}
                          max={row.quantity * 2}
                          step={1}
                          accentColor={accent}
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
                    placeholder="Vehicle registration"
                    className="mt-1.5"
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
                  disabled={receive.isPending}
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
