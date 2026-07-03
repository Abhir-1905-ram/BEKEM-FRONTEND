import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  ROLE_COLORS,
  UserRole,
  formatCurrency,
  type MaterialRequestDto,
  type PoLineItemDto,
  type PurchaseRequestDto,
  type QuotationDto,
  type VendorDto,
} from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StepIndicator } from '@/components/StepIndicator';
import { SuccessScreen } from '@/components/SuccessScreen';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

const STEPS = [
  'Choose request',
  'Assign vendors',
  'Compare quotes',
  'Line items & GST',
  'Terms & addresses',
  'Review',
];

interface LineVendorRow {
  materialId: string;
  material: { id: string; code: string; name: string; unit: string } | null;
  vendors: VendorDto[];
}

interface PoAttachment {
  name: string;
  fileType: string;
  category?: string;
}

function lineTotal(item: PoLineItemDto) {
  return item.quantity * item.rate;
}

export function POWizardPage() {
  const navigate = useNavigate();
  const accent = ROLE_COLORS[UserRole.EXECUTIVE].primary;
  const [step, setStep] = useState(0);
  const [selectedMr, setSelectedMr] = useState<MaterialRequestDto | null>(null);
  const [selectedPr, setSelectedPr] = useState<PurchaseRequestDto | null>(null);
  const [lineVendorByIndex, setLineVendorByIndex] = useState<Record<number, string>>({});
  const [vendorRows, setVendorRows] = useState<LineVendorRow[]>([]);
  const [quotations, setQuotations] = useState<QuotationDto[]>([]);
  const [lineItems, setLineItems] = useState<PoLineItemDto[]>([]);
  const [billingAddress, setBillingAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [attachments, setAttachments] = useState<PoAttachment[]>([]);
  const [paymentTerms, setPaymentTerms] = useState('Net 30 days');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdPoCount, setCreatedPoCount] = useState(0);
  const [selectingPr, setSelectingPr] = useState(false);

  const { data: purchaseRequests, isLoading: prLoading, isError: prError } = useQuery({
    queryKey: ['purchase-requests'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseRequestDto[] }>('/purchase-requests');
      return res.data.data.filter((pr) => pr.status === 'OPEN');
    },
  });

  const { data: pmApprovedRequests, isLoading: mrLoading, isError: mrError } = useQuery({
    queryKey: ['exec-ready-requests'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { status: 'PURCHASE_REQUESTED' },
      });
      return res.data.data;
    },
  });

  const openPurchaseRequests = purchaseRequests ?? [];
  const requestsWithoutPr =
    pmApprovedRequests?.filter(
      (mr) => !openPurchaseRequests.some((pr) => pr.materialRequestId === mr.id)
    ) ?? [];
  const stepLoading = prLoading || mrLoading;
  const hasReadyItems = openPurchaseRequests.length > 0 || requestsWithoutPr.length > 0;

  const loadVendorRows = async (materialIds: string[]) => {
    if (!materialIds.length) {
      setVendorRows([]);
      return;
    }
    const res = await api.get<{ data: LineVendorRow[] }>('/vendors/for-materials', {
      params: { materialIds: materialIds.join(','), strict: 'true' },
    });
    setVendorRows(res.data.data);
  };

  const createPo = useMutation({
    mutationFn: async () => {
      const ordersMap = new Map<
        string,
        { vendorId: string; lineItems: Array<ReturnType<typeof mapLine>>; attachments: PoAttachment[] }
      >();
      const mapLine = (row: PoLineItemDto) => ({
        description: row.description,
        materialId: row.materialId,
        hsnCode: row.hsnCode,
        quantity: row.quantity,
        rate: row.rate,
        gstPercent: row.gstPercent ?? 18,
        amount: lineTotal(row),
      });

      lineItems.forEach((row, index) => {
        const vendorId = lineVendorByIndex[index];
        if (!vendorId) return;
        const item = mapLine(row);
        const existing = ordersMap.get(vendorId);
        if (existing) {
          existing.lineItems.push(item);
        } else {
          ordersMap.set(vendorId, { vendorId, lineItems: [item], attachments: [] });
        }
      });

      const orders = Array.from(ordersMap.values()).map((order, i) => ({
        ...order,
        attachments: i === 0 ? attachments : [],
      }));

      const res = await api.post<{ data: unknown[]; count: number }>('/purchase-orders/wizard/batch', {
        materialRequestId: selectedMr?.id,
        purchaseRequestId: selectedPr?.id,
        paymentTerms,
        billingAddress,
        deliveryAddress,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        referenceNote:
          referenceNote || (selectedMr?.indentNumber ? `Indent ${selectedMr.indentNumber}` : ''),
        orders,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setCreatedPoCount(data.count || 1);
      toast.success(
        data.count > 1 ? `${data.count} purchase orders created` : 'Purchase order created'
      );
      setSuccess(true);
    },
  });

  const loadQuotations = useMutation({
    mutationFn: async (purchaseRequestId: string) => {
      const res = await api.post<{
        data: QuotationDto[];
        lineItems?: PoLineItemDto[];
        billingAddress?: string;
        deliveryAddress?: string;
        subtotal?: number;
      }>('/purchase-orders/wizard/preview-quotations', { purchaseRequestId });
      return res.data;
    },
    onSuccess: (data) => {
      setQuotations(data.data);
      if (data.lineItems?.length) setLineItems(data.lineItems);
      if (data.billingAddress) setBillingAddress(data.billingAddress);
      if (data.deliveryAddress) setDeliveryAddress(data.deliveryAddress);
    },
  });

  const updateLineItem = (index: number, patch: Partial<PoLineItemDto>) => {
    setLineItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch, amount: lineTotal({ ...row, ...patch }) } : row))
    );
  };

  const subtotal = lineItems.reduce((s, row) => s + lineTotal(row), 0);

  if (success) {
    return (
      <SuccessScreen
        title={createdPoCount > 1 ? `${createdPoCount} POs created!` : 'PO created!'}
        message="RFQ and quotations were auto-generated. PO(s) are now pending coordinator verification."
        accentColor={accent}
        primaryAction={{ label: 'Back to home', onClick: () => navigate('/') }}
      />
    );
  }

  const pickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const added = Array.from(files).map((f) => ({
      name: f.name,
      fileType: f.type || 'application/octet-stream',
      category: 'QUOTATION',
    }));
    setAttachments((prev) => [...prev, ...added]);
  };

  const vendorsForLineIndex = (index: number) => {
    const row = lineItems[index];
    const materialId = row?.materialId;
    if (!materialId) return [];
    return vendorRows.find((r) => r.materialId === materialId)?.vendors ?? [];
  };

  const assignedVendorIds = [...new Set(Object.values(lineVendorByIndex).filter(Boolean))];
  const allLinesHaveVendor =
    lineItems.length > 0 && lineItems.every((_, i) => !!lineVendorByIndex[i]);

  const selectPurchaseRequest = async (pr: PurchaseRequestDto) => {
    setSelectingPr(true);
    setSelectedPr(pr);
    setLineVendorByIndex({});
    setQuotations([]);
    setLineItems([]);
    try {
      let mr: MaterialRequestDto | null = null;
      if (pr.materialRequestId) {
        const res = await api.get<{ data: MaterialRequestDto }>(
          `/material-requests/${pr.materialRequestId}`
        );
        mr = res.data.data;
        setSelectedMr(mr);
      } else {
        setSelectedMr(null);
      }
      const preview = await loadQuotations.mutateAsync(pr.id);
      const items = preview.lineItems?.length ? preview.lineItems : [];
      setLineItems(items);
      if (mr) {
        const ids =
          mr.items?.map((i) => i.materialId || i.material?.id).filter(Boolean) ||
          (mr.materialId || mr.material?.id ? [mr.materialId || mr.material?.id] : []);
        await loadVendorRows(ids as string[]);
      } else {
        setVendorRows([]);
      }
      setStep(1);
    } finally {
      setSelectingPr(false);
    }
  };

  const selectRequest = async (mr: MaterialRequestDto) => {
    setSelectingPr(true);
    setSelectedMr(mr);
    setLineVendorByIndex({});
    setQuotations([]);
    setLineItems([]);
    try {
      let pr = purchaseRequests?.find((p) => p.materialRequestId === mr.id);
      if (!pr) {
        const res = await api.post<{ data: PurchaseRequestDto }>('/purchase-requests', {
          materialRequestId: mr.id,
          amountEstimate: (mr.quantityRequested ?? 1) * 5000,
        });
        pr = res.data.data;
      }
      setSelectedPr(pr);
      const preview = await loadQuotations.mutateAsync(pr.id);
      setLineItems(preview.lineItems?.length ? preview.lineItems : []);
      const ids =
        mr.items?.map((i) => i.materialId || i.material?.id).filter(Boolean) ||
        (mr.materialId || mr.material?.id ? [mr.materialId || mr.material?.id] : []);
      await loadVendorRows(ids as string[]);
      setStep(1);
    } finally {
      setSelectingPr(false);
    }
  };

  const continueFromVendorAssign = () => {
    if (!allLinesHaveVendor) {
      toast.error('Select a vendor for every line item');
      return;
    }
    const firstVendorId = lineVendorByIndex[0];
    const quote = quotations.find((q) => q.vendorId === firstVendorId);
    if (quote?.terms) setPaymentTerms(quote.terms);
    setStep(2);
  };

  const lowestQuote = quotations.filter((q) => assignedVendorIds.includes(q.vendorId)).length
    ? quotations
        .filter((q) => assignedVendorIds.includes(q.vendorId))
        .reduce((a, b) => (a.amount < b.amount ? a : b))
    : null;

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#F8FAFC]">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : navigate('/'))}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-surface-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-ink">Create Purchase Order</h1>
      </header>

      <StepIndicator current={step} total={STEPS.length} accentColor={accent} labels={STEPS} />
      <p className="text-center text-xs text-ink-secondary mb-4">{STEPS[step]}</p>

      <div className="flex-1 px-4 pb-6">
        <AnimatePresence mode="sync">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              {stepLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-surface-muted animate-pulse" />
                  ))}
                </div>
              ) : prError || mrError ? (
                <EmptyState
                  title="Could not load requests"
                  description="Check that the API is running (npm run dev:api), then refresh this page."
                />
              ) : !hasReadyItems ? (
                <EmptyState
                  title="No requests ready"
                  description="PM must approve a material indent first — a purchase request is created automatically."
                />
              ) : (
                <div className="space-y-4">
                  {openPurchaseRequests.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                        Purchase requests
                      </p>
                      {openPurchaseRequests.map((pr) => (
                        <Card
                          key={pr.id}
                          className={cn(
                            'cursor-pointer hover:shadow-card-hover',
                            selectingPr && 'pointer-events-none opacity-60'
                          )}
                          onClick={() => selectPurchaseRequest(pr)}
                        >
                          <p className="font-medium">{pr.prNumber}</p>
                          <p className="text-sm text-ink-secondary">
                            {pr.materialRequest?.indentNumber ?? 'Material request'} ·{' '}
                            {pr.project?.code}
                          </p>
                          <p className="text-xs text-ink-muted mt-1">
                            Est. {formatCurrency(pr.amountEstimate)}
                          </p>
                        </Card>
                      ))}
                    </div>
                  )}
                  {requestsWithoutPr.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                        PM-approved (no PR yet)
                      </p>
                      {requestsWithoutPr.map((mr) => (
                        <Card
                          key={mr.id}
                          className={cn(
                            'cursor-pointer hover:shadow-card-hover',
                            selectingPr && 'pointer-events-none opacity-60'
                          )}
                          onClick={() => selectRequest(mr)}
                        >
                          <p className="font-medium">{mr.material?.name}</p>
                          <p className="text-sm text-ink-secondary">
                            {mr.indentNumber} · {mr.project?.code}
                          </p>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto">
              {selectedPr && (
                <p className="text-xs font-semibold text-bekem-accent bg-bekem-accent/10 border border-bekem-accent/20 rounded-lg px-3 py-2 mb-3">
                  Lines from purchase request {selectedPr.prNumber}
                  {selectedMr?.indentNumber ? ` · Indent ${selectedMr.indentNumber}` : ''}
                </p>
              )}
              <p className="text-sm text-ink-secondary mb-3">
                Assign a vendor per material line. Only vendors with that product assigned in
                Vendors admin are listed. Different lines can use different vendors.
              </p>
              <div className="space-y-3">
                {lineItems.map((row, i) => {
                  const options = vendorsForLineIndex(i);
                  const selectedId = lineVendorByIndex[i] || '';
                  return (
                    <Card key={i} className="space-y-2">
                      <p className="font-medium text-sm">{row.description}</p>
                      <p className="text-xs text-ink-muted">
                        Qty {row.quantity}
                        {options.length === 0 && (
                          <span className="text-danger ml-2">
                            No vendor assigned for this product — add in Vendors admin
                          </span>
                        )}
                      </p>
                      <select
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-white"
                        value={selectedId}
                        onChange={(e) =>
                          setLineVendorByIndex((prev) => ({ ...prev, [i]: e.target.value }))
                        }
                      >
                        <option value="">Select vendor…</option>
                        {options.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                            {v.gstNumber ? ` · GST ${v.gstNumber}` : ''}
                          </option>
                        ))}
                      </select>
                    </Card>
                  );
                })}
              </div>
              <Button
                className="mt-4"
                variant="accent"
                size="lg"
                accentColor={accent}
                disabled={!allLinesHaveVendor}
                onClick={continueFromVendorAssign}
              >
                Continue
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-sm text-ink-secondary mb-3">
                Compare quotations for assigned vendors
                {assignedVendorIds.length > 1 ? ` (${assignedVendorIds.length} vendors on this indent)` : ''}
              </p>
              {loadQuotations.isPending ? (
                <div className="h-32 bg-surface-muted rounded-xl animate-pulse" />
              ) : (
                <div className="space-y-2">
                  {quotations
                    .filter((q) => assignedVendorIds.includes(q.vendorId))
                    .map((q) => (
                    <Card
                      key={q.id}
                      className={cn(
                        q.id === lowestQuote?.id && 'border-l-4 border-l-emerald-500 bg-emerald-50',
                        assignedVendorIds.includes(q.vendorId) && 'ring-1 ring-executive/30'
                      )}
                    >
                      <div className="flex justify-between">
                        <p className="font-medium">{q.vendor?.name}</p>
                        <p className="font-bold">{formatCurrency(q.amount)}</p>
                      </div>
                      <p className="text-xs text-ink-secondary">{q.terms}</p>
                      {q.id === lowestQuote?.id && (
                        <p className="text-xs text-green-600 mt-1">Lowest quote</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
              <Button
                className="mt-4"
                variant="accent"
                size="lg"
                accentColor={accent}
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-sm text-ink-secondary mb-3">
                Edit HSN, GST%, rate and quantity per line item
              </p>
              <div className="space-y-3">
                {lineItems.map((row, i) => {
                  const vendor = vendorsForLineIndex(i).find((v) => v.id === lineVendorByIndex[i]);
                  return (
                  <Card key={i} className="space-y-2">
                    <p className="font-medium text-sm">{row.description}</p>
                    {vendor && (
                      <p className="text-xs text-ink-muted">Vendor: {vendor.name}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-ink-muted">HSN</label>
                        <Input
                          value={row.hsnCode || ''}
                          onChange={(e) => updateLineItem(i, { hsnCode: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-ink-muted">GST %</label>
                        <Input
                          type="number"
                          value={row.gstPercent ?? 18}
                          onChange={(e) =>
                            updateLineItem(i, { gstPercent: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-ink-muted">Qty</label>
                        <Input
                          type="number"
                          value={row.quantity}
                          onChange={(e) =>
                            updateLineItem(i, { quantity: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-ink-muted">Rate (₹)</label>
                        <Input
                          type="number"
                          value={row.rate}
                          onChange={(e) =>
                            updateLineItem(i, { rate: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                    <p className="text-xs text-ink-secondary">
                      Line amount: {formatCurrency(lineTotal(row))}
                    </p>
                  </Card>
                  );
                })}
              </div>
              <p className="text-sm font-semibold mt-3">Subtotal: {formatCurrency(subtotal)}</p>
              <Button
                className="mt-4"
                variant="accent"
                size="lg"
                accentColor={accent}
                disabled={!lineItems.length}
                onClick={() => setStep(4)}
              >
                Continue
              </Button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <label className="text-sm font-medium text-ink-secondary">Payment terms</label>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="mt-2"
              />

              <label className="text-sm font-medium text-ink-secondary mt-4 block">
                Buyer billing address
              </label>
              <textarea
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm min-h-[100px]"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
              />

              <label className="text-sm font-medium text-ink-secondary mt-4 block">
                Consignee / delivery address
              </label>
              <textarea
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm min-h-[100px]"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />

              <label className="text-sm font-medium text-ink-secondary mt-4 block">
                Expected delivery date
              </label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-ink-muted mt-1">
                If actual delivery is after this date, Stock Inventory shows the row in red and Store
                Manager must enter a delay reason (visible to Coordinator and Chairman).
              </p>

              <label className="text-sm font-medium text-ink-secondary mt-4 block">Reference note</label>
              <Input
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                placeholder="e.g. Indent number or site note"
                className="mt-2"
              />

              <label className="text-sm font-medium text-ink-secondary mt-4 block">
                Upload quotation / supporting documents
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="mt-2 block w-full text-sm"
                onChange={(e) => pickFiles(e.target.files)}
              />
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attachments.map((a, i) => (
                    <li key={i} className="text-xs text-ink-secondary flex justify-between gap-2">
                      <span>{a.name}</span>
                      <button
                        type="button"
                        className="text-danger"
                        onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-ink-muted mt-1">
                Document names are recorded on the PO for coordinator review.
              </p>

              <Button
                className="mt-4"
                variant="accent"
                size="lg"
                accentColor={accent}
                disabled={!paymentTerms.trim() || !expectedDeliveryDate}
                onClick={() => setStep(5)}
              >
                Continue
              </Button>
            </motion.div>
          )}

          {step === 5 && selectedMr && allLinesHaveVendor && (
            <motion.div key="s5" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="space-y-3 mb-4">
                <div>
                  <p className="text-xs text-ink-secondary">Indent</p>
                  <p className="font-medium">{selectedMr.indentNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Purchase request</p>
                  <p className="font-medium">{selectedPr?.prNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Payment terms</p>
                  <p className="font-medium">{paymentTerms}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Expected delivery date</p>
                  <p className="font-medium">{expectedDeliveryDate || '—'}</p>
                </div>
                {attachments.length > 0 && (
                  <div>
                    <p className="text-xs text-ink-secondary">Documents</p>
                    <p className="text-sm">{attachments.map((a) => a.name).join(', ')}</p>
                  </div>
                )}
              </Card>

              {assignedVendorIds.map((vendorId) => {
                const vendor =
                  vendorRows.flatMap((r) => r.vendors).find((v) => v.id === vendorId) ||
                  quotations.find((q) => q.vendorId === vendorId)?.vendor;
                const vendorLines = lineItems
                  .map((row, i) => ({ row, i }))
                  .filter(({ i }) => lineVendorByIndex[i] === vendorId);
                const vendorSubtotal = vendorLines.reduce((s, { row }) => s + lineTotal(row), 0);
                return (
                  <Card key={vendorId} className="space-y-2 mb-3">
                    <p className="text-xs text-ink-secondary">PO for vendor</p>
                    <p className="font-medium">{vendor?.name ?? 'Vendor'}</p>
                    {vendor?.address && (
                      <p className="text-xs text-ink-muted whitespace-pre-line">{vendor.address}</p>
                    )}
                    {vendorLines.map(({ row, i }) => (
                      <p key={i} className="text-sm">
                        {row.description} — {row.quantity} × {formatCurrency(row.rate)}
                      </p>
                    ))}
                    <p className="text-sm font-semibold">Subtotal: {formatCurrency(vendorSubtotal)}</p>
                  </Card>
                );
              })}

              <p className="text-sm text-ink-secondary mb-3">
                {assignedVendorIds.length > 1
                  ? `${assignedVendorIds.length} separate purchase orders will be created.`
                  : 'One purchase order will be created.'}
              </p>
              <Button
                className="mt-2"
                variant="accent"
                size="lg"
                accentColor={accent}
                disabled={createPo.isPending}
                onClick={() => createPo.mutate()}
              >
                {createPo.isPending
                  ? 'Creating…'
                  : assignedVendorIds.length > 1
                    ? `Create ${assignedVendorIds.length} purchase orders`
                    : 'Create purchase order'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
