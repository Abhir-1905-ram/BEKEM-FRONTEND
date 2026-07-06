import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  ROLE_COLORS,
  UserRole,
  formatCurrency,
  snapGstPercent,
  type MaterialRequestDto,
  type PoLineItemDto,
  type PurchaseRequestDto,
  type QuotationDto,
  type VendorDto,
} from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { StepIndicator } from '@/components/StepIndicator';
import { SuccessScreen } from '@/components/SuccessScreen';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { PoPreviewDocument } from '@/components/PoPreviewDocument';
import { SearchSelect } from '@/components/SearchSelect';
import { computePoLineTotals } from '@/lib/poLineTotals';
import type {
  BillingAddressType,
  DeliveryAddressType,
  MaterialSearchResultDto,
  QuotationComparisonDto,
  MaterialPurchaseHistoryDto,
} from '@afios/shared';
import { QuotationComparisonTable } from '@/components/QuotationComparisonTable';
import { PurchaseHistoryPanel } from '@/components/PurchaseHistoryPanel';
import { ProcurementWorkflowBanner } from '@/components/ProcurementWorkflowBanner';
import { GstSummaryBar } from '@/components/GstSummaryBar';
import { GstPercentSelect } from '@/components/GstPercentSelect';
import { pickL1VendorId } from '@/lib/quotationTotals';

const STEPS = [
  'Choose request',
  'Assign vendors',
  'Compare quotes',
  'Line items & GST',
  'Terms & addresses',
  'Review',
  'Preview PO',
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
  return computePoLineTotals(item.quantity, item.rate, item.gstPercent ?? 18).lineTotal;
}

function grandTotalAll(lines: PoLineItemDto[]) {
  return lines.reduce(
    (s, row) => s + computePoLineTotals(row.quantity, row.rate, row.gstPercent ?? 18).grandTotal,
    0
  );
}

export function POWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPrId = searchParams.get('purchaseRequestId');
  const accent = ROLE_COLORS[UserRole.EXECUTIVE].primary;
  const [step, setStep] = useState(0);
  const [selectedMr, setSelectedMr] = useState<MaterialRequestDto | null>(null);
  const [selectedPr, setSelectedPr] = useState<PurchaseRequestDto | null>(null);
  const [lineVendorByIndex, setLineVendorByIndex] = useState<Record<number, string>>({});
  /** Lines skipped because no vendor (custom products) — PO proceeds for the rest. */
  const [skippedLines, setSkippedLines] = useState<Record<number, boolean>>({});
  const [vendorRows, setVendorRows] = useState<LineVendorRow[]>([]);
  const [quotations, setQuotations] = useState<QuotationDto[]>([]);
  const [lineItems, setLineItems] = useState<PoLineItemDto[]>([]);
  const [registeredOfficeAddress, setRegisteredOfficeAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingAddressType, setBillingAddressType] = useState<BillingAddressType>('registered_office');
  const [hasProjectBilling, setHasProjectBilling] = useState(false);
  const [projectBillingAddress, setProjectBillingAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryAddressType, setDeliveryAddressType] = useState<DeliveryAddressType>('site');
  const [deliveryAddressOtherText, setDeliveryAddressOtherText] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [attachments, setAttachments] = useState<PoAttachment[]>([]);
  const [paymentTerms, setPaymentTerms] = useState('Net 30 days');
  const [additionalTerms, setAdditionalTerms] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [comparison, setComparison] = useState<QuotationComparisonDto | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<MaterialPurchaseHistoryDto[]>([]);
  const [whyWeChoseThisVendor, setWhyWeChoseThisVendor] = useState('');
  const [vendorSelectionReason, setVendorSelectionReason] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdPoCount, setCreatedPoCount] = useState(0);
  const [selectingPr, setSelectingPr] = useState(false);

  const { data: purchaseRequests, isLoading: prLoading, isError: prError } = useQuery({
    queryKey: ['purchase-requests', 'ready-for-po'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseRequestDto[] }>('/purchase-requests', {
        params: { readyForPo: 'true' },
      });
      return res.data.data;
    },
  });

  const openPurchaseRequests = purchaseRequests ?? [];
  const stepLoading = prLoading;
  const hasReadyItems = openPurchaseRequests.length > 0;

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

  useEffect(() => {
    if (!preselectedPrId || selectedPr || prLoading) return;
    const pr = openPurchaseRequests.find((p) => p.id === preselectedPrId);
    if (!pr) return;
    void (async () => {
      setSelectedPr(pr);
      if (pr.materialRequestId) {
        const res = await api.get<{ data: MaterialRequestDto }>(
          `/material-requests/${pr.materialRequestId}`
        );
        setSelectedMr(res.data.data);
        const materialIds = res.data.data.items?.map((i) => i.materialId) || [];
        await loadVendorRows(materialIds);
      }
      setStep(1);
    })();
  }, [preselectedPrId, openPurchaseRequests, prLoading, selectedPr]);

  const createPo = useMutation({
    mutationFn: async () => {
      const ordersMap = new Map<
        string,
        { vendorId: string; lineItems: Array<ReturnType<typeof mapLine>>; attachments: PoAttachment[] }
      >();
      const mapLine = (row: PoLineItemDto) => {
        const totals = computePoLineTotals(row.quantity, row.rate, row.gstPercent ?? 18);
        return {
          description: row.description,
          materialId: row.materialId,
          hsnCode: row.hsnCode,
          quantity: row.quantity,
          rate: row.rate,
          gstPercent: row.gstPercent ?? 18,
          amount: totals.lineTotal,
        };
      };

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
        additionalTerms,
        billingAddress,
        billingAddressType,
        deliveryAddress:
          deliveryAddressType === 'other' ? deliveryAddressOtherText : deliveryAddress,
        deliveryAddressType,
        deliveryAddressOtherText:
          deliveryAddressType === 'other' ? deliveryAddressOtherText : undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        referenceNote:
          referenceNote || (selectedMr?.indentNumber ? `Indent ${selectedMr.indentNumber}` : ''),
        whyWeChoseThisVendor,
        vendorSelectionReasons: Object.fromEntries(
          assignedVendorIds
            .filter((vid) => vid !== l1VendorId)
            .map((vid) => [vid, vendorSelectionReason])
        ),
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
        comparison?: QuotationComparisonDto;
        purchaseHistory?: MaterialPurchaseHistoryDto[];
        lineItems?: PoLineItemDto[];
        billingAddress?: string;
        deliveryAddress?: string;
        subtotal?: number;
      }>('/purchase-orders/wizard/preview-quotations', { purchaseRequestId });
      return res.data;
    },
    onSuccess: (data) => {
      setQuotations(data.data);
      if (data.comparison) setComparison(data.comparison);
      if (data.purchaseHistory) setPurchaseHistory(data.purchaseHistory);
      if (data.lineItems?.length) setLineItems(data.lineItems);
      if (data.billingAddress) {
        setRegisteredOfficeAddress(data.billingAddress);
        setBillingAddress(data.billingAddress);
        setProjectBillingAddress('');
        setHasProjectBilling(false);
        setBillingAddressType('registered_office');
      }
      if (data.deliveryAddress) setDeliveryAddress(data.deliveryAddress);
    },
  });

  const loadProjectBilling = async (projectId: string) => {
    try {
      const res = await api.get<{
        data: { hasProjectBillingAddress: boolean; billingAddress: string | null; registeredOfficeAddress: string };
      }>(`/projects/${projectId}/billing-address`);
      const { hasProjectBillingAddress, billingAddress: projAddr, registeredOfficeAddress } =
        res.data.data;
      setHasProjectBilling(hasProjectBillingAddress);
      setProjectBillingAddress(projAddr || '');
      setBillingAddress(
        billingAddressType === 'project_billing' && projAddr ? projAddr : registeredOfficeAddress
      );
      if (!billingAddress) setBillingAddress(registeredOfficeAddress);
    } catch {
      setHasProjectBilling(false);
    }
  };

  const updateLineItem = (index: number, patch: Partial<PoLineItemDto>) => {
    setLineItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch, amount: lineTotal({ ...row, ...patch }) } : row))
    );
  };

  const addLineFromMaterial = async (_id: string, material: MaterialSearchResultDto) => {
    const newLine: PoLineItemDto = {
      materialId: material.id,
      description: material.description || material.name || '',
      itemCode: material.itemCode,
      hsnCode: material.hsnCode,
      gstPercent: snapGstPercent(material.gstRate),
      quantity: 1,
      rate: 0,
      amount: 0,
    };
    const nextLines = [...lineItems, newLine];
    setLineItems(nextLines);
    const materialIds = nextLines.map((l) => l.materialId).filter(Boolean) as string[];
    await loadVendorRows(materialIds);
  };

  const removeLineItem = (index: number) => {
    setLineItems((rows) => rows.filter((_, i) => i !== index));
    setLineVendorByIndex((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k);
        if (i < index) next[i] = v;
        else if (i > index) next[i - 1] = v;
      });
      return next;
    });
    setSkippedLines((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k);
        if (i < index) next[i] = v;
        else if (i > index) next[i - 1] = v;
      });
      return next;
    });
  };

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

  const activeLineIndexes = lineItems
    .map((_, i) => i)
    .filter((i) => !skippedLines[i]);
  const assignedVendorIds = [
    ...new Set(activeLineIndexes.map((i) => lineVendorByIndex[i]).filter(Boolean)),
  ];
  const allActiveLinesHaveVendor =
    activeLineIndexes.length > 0 &&
    activeLineIndexes.every((i) => !!lineVendorByIndex[i]);

  const selectPurchaseRequest = async (pr: PurchaseRequestDto) => {
    setSelectingPr(true);
    setSelectedPr(pr);
    setLineVendorByIndex({});
    setSkippedLines({});
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
        if (mr.projectId) await loadProjectBilling(mr.projectId);
      } else {
        setVendorRows([]);
      }
      setStep(1);
    } finally {
      setSelectingPr(false);
    }
  };

  const continueFromVendorAssign = () => {
    if (!allActiveLinesHaveVendor) {
      toast.error('Select a vendor for each line you are ordering (or skip lines with no vendor)');
      return;
    }
    const firstVendorId = lineVendorByIndex[activeLineIndexes[0]];
    const quote = quotations.find((q) => q.vendorId === firstVendorId);
    if (quote?.terms) setPaymentTerms(quote.terms);
    const skipped = Object.values(skippedLines).filter(Boolean).length;
    if (skipped > 0) {
      toast.info(
        `${skipped} line(s) skipped — order the rest; add vendors in Vendors admin for skipped items`
      );
    }
    // Compact to only lines being ordered
    const keptItems = activeLineIndexes.map((i) => lineItems[i]);
    const keptVendors: Record<number, string> = {};
    activeLineIndexes.forEach((oldIdx, newIdx) => {
      keptVendors[newIdx] = lineVendorByIndex[oldIdx];
    });
    setLineItems(keptItems);
    setLineVendorByIndex(keptVendors);
    setSkippedLines({});
    setStep(2);
  };

  const l1VendorId =
    comparison?.l1VendorId ||
    pickL1VendorId(
      (comparison?.vendors ?? quotations).map((q) => ({
        vendorId: 'vendorId' in q ? q.vendorId : (q as QuotationDto).vendorId,
        finalCost: 'finalCost' in q ? (q as { finalCost: number }).finalCost : (q as QuotationDto).amount,
      }))
    );

  const hasNonL1Vendor = assignedVendorIds.some((vid) => l1VendorId && vid !== l1VendorId);

  const canSubmitPo =
    whyWeChoseThisVendor.trim().length >= 10 &&
    (!hasNonL1Vendor || vendorSelectionReason.trim().length >= 10);

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
      <p className="text-center text-xs text-ink-secondary mb-2">{STEPS[step]}</p>
      <ProcurementWorkflowBanner
        className="mb-4"
        highlightFrom={step <= 1 ? 0 : step === 2 ? 7 : step === 3 ? 9 : 10}
      />

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
              ) : prError ? (
                <EmptyState
                  title="Could not load requests"
                  description="Check that the API is running (npm run dev:api), then refresh this page."
                />
              ) : !hasReadyItems ? (
                <EmptyState
                  title="No requests ready"
                  description="Mark requests as Proceed with Purchase Order in Procurement Decisions — they will appear here for PO creation."
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Approved for PO creation
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
                  const isSkipped = !!skippedLines[i];
                  return (
                    <Card
                      key={i}
                      className={cn('space-y-2', isSkipped && 'opacity-60 border-dashed')}
                    >
                      <p className="font-medium text-sm">{row.description}</p>
                      <p className="text-xs text-ink-muted">
                        Qty {row.quantity}
                        {options.length === 0 && !isSkipped && (
                          <span className="text-danger ml-2">
                            No vendor for this product — skip this line or add in Vendors admin
                          </span>
                        )}
                        {isSkipped && (
                          <span className="text-amber-700 ml-2 font-medium">Skipped for this PO</span>
                        )}
                      </p>
                      {!isSkipped && (
                        <SearchSelect
                          value={selectedId || null}
                          onChange={(id) =>
                            setLineVendorByIndex((prev) => ({ ...prev, [i]: id }))
                          }
                          options={options.map((v) => ({
                            id: v.id,
                            label: v.name,
                            sublabel: v.gstNumber ? `GST ${v.gstNumber}` : undefined,
                          }))}
                          placeholder="Search vendor…"
                          emptyMessage="No vendors found for this material"
                        />
                      )}
                      {(options.length === 0 || isSkipped) && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSkippedLines((prev) => {
                              const next = { ...prev };
                              if (next[i]) {
                                delete next[i];
                              } else {
                                next[i] = true;
                                setLineVendorByIndex((v) => {
                                  const nv = { ...v };
                                  delete nv[i];
                                  return nv;
                                });
                              }
                              return next;
                            });
                          }}
                        >
                          {isSkipped ? 'Include this line again' : 'Skip this line / order separately'}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
              <Button
                className="mt-4"
                variant="accent"
                size="lg"
                accentColor={accent}
                disabled={!allActiveLinesHaveVendor}
                onClick={continueFromVendorAssign}
              >
                Continue
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <PurchaseHistoryPanel history={purchaseHistory} className="mb-4" />
              <p className="text-sm text-ink-secondary mb-3">
                Compare top vendor quotations (L1 highlighted)
              </p>
              {loadQuotations.isPending ? (
                <div className="h-32 bg-surface-muted rounded-xl animate-pulse" />
              ) : comparison ? (
                <QuotationComparisonTable comparison={comparison} />
              ) : (
                <p className="text-sm text-ink-muted">No comparison data yet.</p>
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
                Enter quantity and unit price. Description, HSN, and item code are from Material
                Master (read-only). Choose GST 5% or 18% per line.
              </p>
              <div className="space-y-3">
                {lineItems.map((row, i) => {
                  const vendor = vendorsForLineIndex(i).find((v) => v.id === lineVendorByIndex[i]);
                  return (
                  <Card key={i} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{row.description}</p>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-ink-muted hover:text-danger shrink-0"
                          onClick={() => removeLineItem(i)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {vendor && (
                      <p className="text-xs text-ink-muted">Vendor: {vendor.name}</p>
                    )}
                    {!lineVendorByIndex[i] && vendorsForLineIndex(i).length > 0 && (
                      <div>
                        <label className="text-xs text-ink-muted mb-1 block">Assign vendor</label>
                        <SearchSelect
                          value={null}
                          onChange={(id) =>
                            setLineVendorByIndex((prev) => ({ ...prev, [i]: id }))
                          }
                          options={vendorsForLineIndex(i).map((v) => ({
                            id: v.id,
                            label: v.name,
                            sublabel: v.gstNumber ? `GST ${v.gstNumber}` : undefined,
                          }))}
                          placeholder="Search vendor…"
                          emptyMessage="No vendors found for this material"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="field-readonly-label mb-1">Item code</p>
                        <div className="field-readonly tabular-nums">{row.itemCode || '—'}</div>
                        <p className="text-[10px] text-ink-muted mt-0.5">Auto-filled</p>
                      </div>
                      <div>
                        <p className="field-readonly-label mb-1">HSN</p>
                        <div className="field-readonly">{row.hsnCode || '—'}</div>
                        <p className="text-[10px] text-ink-muted mt-0.5">Auto-filled</p>
                      </div>
                      <div className="col-span-2">
                        <p className="field-readonly-label mb-1">Description</p>
                        <div className="field-readonly">{row.description}</div>
                      </div>
                      <div>
                        <p className="field-readonly-label mb-1">GST %</p>
                        <GstPercentSelect
                          value={row.gstPercent}
                          onChange={(gstPercent) => updateLineItem(i, { gstPercent })}
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
                        <label className="text-xs text-ink-muted">Unit price (₹)</label>
                        <Input
                          type="number"
                          value={row.rate}
                          onChange={(e) =>
                            updateLineItem(i, { rate: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                    <GstSummaryBar
                      quantity={row.quantity}
                      rate={row.rate}
                      gstPercent={row.gstPercent ?? 18}
                    />
                  </Card>
                  );
                })}
              </div>
              <div className="mt-4 border border-dashed border-surface-border rounded-xl p-3">
                <p className="text-xs font-semibold text-ink-muted mb-2">Add line from Material Master</p>
                <SearchSelect<MaterialSearchResultDto & { id: string; label: string }>
                  value={null}
                  onChange={(id, option) => addLineFromMaterial(id, option as MaterialSearchResultDto)}
                  searchPath="/materials/search"
                  mapResult={(raw) => {
                    const m = raw as MaterialSearchResultDto;
                    return {
                      ...m,
                      id: m.id,
                      label: m.description || m.name || m.itemCode,
                      sublabel: [m.itemCode, m.hsnCode ? `HSN ${m.hsnCode}` : '', `${m.gstRate ?? 18}% GST`]
                        .filter(Boolean)
                        .join(' · '),
                    };
                  }}
                  placeholder="Search material by code, name, or HSN…"
                  emptyMessage="No materials found — check spelling or ask Coordinator to add it to Material Master"
                />
              </div>
              <div className="mt-3 panel p-3 text-xs space-y-1">
                <p className="font-semibold text-ink">Order GST summary</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
                  <span>
                    Subtotal{' '}
                    <strong>
                      {formatCurrency(
                        lineItems.reduce(
                          (s, row) =>
                            s + computePoLineTotals(row.quantity, row.rate, row.gstPercent ?? 18).lineTotal,
                          0
                        )
                      )}
                    </strong>
                  </span>
                  <span>
                    GST amount{' '}
                    <strong>
                      {formatCurrency(
                        lineItems.reduce(
                          (s, row) =>
                            s + computePoLineTotals(row.quantity, row.rate, row.gstPercent ?? 18).tax,
                          0
                        )
                      )}
                    </strong>
                  </span>
                  <span>
                    Final amount{' '}
                    <strong className="text-bekem-navy">{formatCurrency(grandTotalAll(lineItems))}</strong>
                  </span>
                </div>
              </div>
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
                Additional terms <span className="text-ink-muted font-normal">(optional)</span>
              </label>
              <Textarea
                value={additionalTerms}
                onChange={(e) => setAdditionalTerms(e.target.value)}
                className="mt-2 min-h-[96px]"
                placeholder="Add project-specific clauses without changing the standard terms…"
              />

              <label className="text-sm font-medium text-ink-secondary mt-4 block">
                Billing address
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm border',
                    billingAddressType === 'registered_office'
                      ? 'border-bekem-accent bg-bekem-accent/10 font-semibold'
                      : 'border-surface-border'
                  )}
                  onClick={() => {
                    setBillingAddressType('registered_office');
                    setBillingAddress(registeredOfficeAddress || billingAddress);
                  }}
                >
                  Registered Office
                </button>
                <button
                  type="button"
                  disabled={!hasProjectBilling}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm border',
                    billingAddressType === 'project_billing'
                      ? 'border-bekem-accent bg-bekem-accent/10 font-semibold'
                      : 'border-surface-border',
                    !hasProjectBilling && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => {
                    if (projectBillingAddress) {
                      setBillingAddressType('project_billing');
                      setBillingAddress(projectBillingAddress);
                    }
                  }}
                >
                  Project billing address
                </button>
              </div>
              {!hasProjectBilling && (
                <p className="text-xs text-ink-muted mt-1">
                  Project billing address not configured — using Registered Office only.
                </p>
              )}
              <div className="field-readonly mt-2 min-h-[80px] whitespace-pre-wrap text-xs">
                {billingAddress}
              </div>

              <label className="text-sm font-medium text-ink-secondary mt-4 block">
                Delivery address
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(['site', 'workshop', 'global', 'other'] as DeliveryAddressType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={cn(
                      'rounded-xl px-3 py-2 text-sm border capitalize',
                      deliveryAddressType === t
                        ? 'border-bekem-accent bg-bekem-accent/10 font-semibold'
                        : 'border-surface-border'
                    )}
                    onClick={() => setDeliveryAddressType(t)}
                  >
                    {t === 'site' ? 'Site' : t === 'other' ? 'Other' : t}
                  </button>
                ))}
              </div>
              {deliveryAddressType === 'other' ? (
                <textarea
                  className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm min-h-[80px]"
                  value={deliveryAddressOtherText}
                  onChange={(e) => setDeliveryAddressOtherText(e.target.value)}
                  placeholder="Enter delivery location…"
                />
              ) : (
                <p className="text-xs text-ink-muted mt-2">
                  {deliveryAddressType === 'site' && (deliveryAddress || 'Site address from indent')}
                  {deliveryAddressType === 'workshop' && 'Central workshop (auto-filled on save)'}
                  {deliveryAddressType === 'global' && 'Global warehouse (auto-filled on save)'}
                </p>
              )}

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

          {step === 5 && selectedMr && allActiveLinesHaveVendor && (
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
                onClick={() => setStep(6)}
              >
                Continue to preview
              </Button>
            </motion.div>
          )}

          {step === 6 && selectedMr && allActiveLinesHaveVendor && (
            <motion.div key="s6" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-sm text-ink-secondary mb-3">
                Review the purchase order exactly as the vendor will receive it. Confirm only when
                every line, address, and total is correct.
              </p>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {assignedVendorIds.map((vendorId) => {
                  const vendor =
                    vendorRows.flatMap((r) => r.vendors).find((v) => v.id === vendorId) ||
                    quotations.find((q) => q.vendorId === vendorId)?.vendor;
                  const vendorLines = lineItems
                    .map((row, i) => ({ row, i }))
                    .filter(({ i }) => lineVendorByIndex[i] === vendorId)
                    .map(({ row }) => row);
                  return (
                    <PoPreviewDocument
                      key={vendorId}
                      data={{
                        vendorName: vendor?.name || 'Vendor',
                        vendorAddress: vendor?.address,
                        vendorGst: vendor?.gstNumber,
                        vendorEmail: vendor?.email,
                        vendorContact: vendor?.contactPerson,
                        vendorPhone: vendor?.phone,
                        paymentTerms,
                        additionalTerms,
                        poAmount: vendorLines.reduce((s, row) => s + (row.amount || 0), 0),
                        billingAddress,
                        deliveryAddress:
                          deliveryAddressType === 'other'
                            ? deliveryAddressOtherText
                            : deliveryAddress,
                        referenceNote: referenceNote || selectedMr.indentNumber,
                        expectedDeliveryDate,
                        lineItems: vendorLines,
                      }}
                    />
                  );
                })}
              </div>
              <Card className="mt-4 space-y-3">
                <Textarea
                  value={whyWeChoseThisVendor}
                  onChange={(e) => setWhyWeChoseThisVendor(e.target.value)}
                  rows={3}
                  placeholder="Why we chose this vendor (required)"
                />
                {hasNonL1Vendor && (
                  <Textarea
                    value={vendorSelectionReason}
                    onChange={(e) => setVendorSelectionReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for selection — non-L1 vendor (required)"
                  />
                )}
              </Card>
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button variant="secondary" size="lg" onClick={() => setStep(4)}>
                  Back to edit
                </Button>
                <Button
                  variant="accent"
                  size="lg"
                  accentColor={accent}
                  disabled={createPo.isPending || !canSubmitPo}
                  onClick={() => createPo.mutate()}
                >
                  {createPo.isPending
                    ? 'Forwarding…'
                    : assignedVendorIds.length > 1
                      ? `Forward ${assignedVendorIds.length} POs for approval`
                      : 'Forward for approval'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
