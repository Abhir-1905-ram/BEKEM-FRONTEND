import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  ROLE_COLORS,
  UserRole,
  formatCurrency,
  type PurchaseRequestDto,
  type MaterialRequestDto,
  type RfqComparisonDto,
} from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { StepIndicator } from '@/components/StepIndicator';
import { SuccessScreen } from '@/components/SuccessScreen';
import { EmptyState } from '@/components/EmptyState';
import { PoWizardStockPanel } from '@/components/PoWizardStockPanel';
import { QuotationComparisonTable } from '@/components/QuotationComparisonTable';
import { PurchaseHistoryPanel } from '@/components/PurchaseHistoryPanel';
import {
  VendorQuotationEditor,
  type VendorQuotationDraft,
  computeDraftFinalCost,
} from '@/components/VendorQuotationEditor';
import { downloadExport } from '@/lib/downloadExport';
import { pickL1VendorId } from '@/lib/quotationTotals';
import { cn } from '@/lib/utils';

const STEPS = [
  'Choose request',
  'Items & stock',
  'Vendor quotations (3+)',
  'Compare quotes',
  'Review & share',
];

function draftsFromComparison(data: RfqComparisonDto): VendorQuotationDraft[] {
  const rows = data.comparison.vendors.map((v) => ({
    vendorId: v.vendorId,
    vendorName: v.vendorName,
    rate: v.rate,
    gstPercent: v.gstPercent,
    paymentTerms: v.paymentTerms,
    deliveryTerms: v.deliveryTerms,
  }));
  while (rows.length < 3) {
    rows.push({
      vendorId: '',
      vendorName: '',
      rate: 0,
      gstPercent: 18,
      paymentTerms: '100% payment within 30 days from the date of supply',
      deliveryTerms: 'Delivery as per project schedule',
    });
  }
  return rows;
}

export function RfqWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPrId = searchParams.get('purchaseRequestId');
  const resumeRfq = searchParams.get('resume') === '1';
  const accent = ROLE_COLORS[UserRole.EXECUTIVE].primary;

  const [step, setStep] = useState(0);
  const [selectedPr, setSelectedPr] = useState<PurchaseRequestDto | null>(null);
  const [selectedMr, setSelectedMr] = useState<MaterialRequestDto | null>(null);
  const [rfqId, setRfqId] = useState<string | null>(null);
  const [rfqNumber, setRfqNumber] = useState('');
  const [comparison, setComparison] = useState<RfqComparisonDto | null>(null);
  const [drafts, setDrafts] = useState<VendorQuotationDraft[]>([]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [whyWeChoseThisVendor, setWhyWeChoseThisVendor] = useState('');
  const [vendorSelectionReason, setVendorSelectionReason] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectingPr, setSelectingPr] = useState(false);

  const { data: purchaseRequests, isLoading: prLoading, isError: prError } = useQuery({
    queryKey: ['purchase-requests', 'ready-for-rfq'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseRequestDto[] }>('/purchase-requests', {
        params: { readyForPo: 'true' },
      });
      return res.data.data;
    },
  });

  const openPurchaseRequests = purchaseRequests ?? [];
  const quantity = comparison?.quantity ?? 1;
  const materialIds = useMemo(() => {
    if (!selectedMr) return [];
    return (
      selectedMr.items?.map((i) => i.materialId || i.material?.id).filter(Boolean) ||
      (selectedMr.materialId || selectedMr.material?.id
        ? [selectedMr.materialId || selectedMr.material?.id]
        : [])
    ) as string[];
  }, [selectedMr]);

  const previewRfq = useMutation({
    mutationFn: async (purchaseRequestId: string) => {
      const res = await api.post<{ data: RfqComparisonDto & { suggestedVendors?: { id: string; name: string }[] } }>(
        '/rfqs/wizard/preview',
        { purchaseRequestId }
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      setRfqId(data.rfqId);
      setRfqNumber(data.rfqNumber);
      setComparison(data);
      setDrafts(draftsFromComparison(data));
      setSelectedVendorId(data.selectedVendorId || data.comparison.l1VendorId || '');
      setStep(2);
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Could not start RFQ');
    },
  });

  const submitRfq = useMutation({
    mutationFn: async (finalize: boolean) => {
      const res = await api.post<{ data: { rfqNumber?: string; status?: string } }>(
        '/rfqs/wizard/submit',
        {
          rfqId,
          quotations: drafts.filter((d) => d.vendorId),
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          finalize,
          selectedVendorId: finalize ? selectedVendorId : undefined,
          whyWeChoseThisVendor: finalize ? whyWeChoseThisVendor : undefined,
          vendorSelectionReason: finalize ? vendorSelectionReason : undefined,
        }
      );
      return res.data.data;
    },
    onSuccess: (data, finalize) => {
      if (finalize) {
        setSuccess(true);
        toast.success('RFQ finalized — ready for PO creation');
      } else {
        if (data && typeof data === 'object' && 'comparison' in data) {
          setComparison(data as RfqComparisonDto);
        }
        toast.success('RFQ saved');
        setStep(3);
      }
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Could not save RFQ');
    },
  });

  const selectPurchaseRequest = async (pr: PurchaseRequestDto) => {
    setSelectingPr(true);
    setSelectedPr(pr);
    try {
      if (pr.materialRequestId) {
        const res = await api.get<{ data: MaterialRequestDto }>(
          `/material-requests/${pr.materialRequestId}`
        );
        setSelectedMr(res.data.data);
      } else {
        setSelectedMr(null);
      }
      setStep(1);
    } finally {
      setSelectingPr(false);
    }
  };

  useEffect(() => {
    if (!preselectedPrId || selectedPr || prLoading || selectingPr) return;
    const pr = openPurchaseRequests.find((p) => p.id === preselectedPrId);
    if (!pr) return;
    void (async () => {
      await selectPurchaseRequest(pr);
      if (resumeRfq) {
        previewRfq.mutate(pr.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedPrId, resumeRfq, openPurchaseRequests, prLoading, selectedPr, selectingPr]);

  const l1VendorId = useMemo(
    () => pickL1VendorId(comparison?.comparison.vendors ?? []),
    [comparison]
  );
  const isNonL1 = selectedVendorId && l1VendorId && selectedVendorId !== l1VendorId;
  const canFinalize =
    !!selectedVendorId &&
    whyWeChoseThisVendor.trim().length > 0 &&
    (!isNonL1 || vendorSelectionReason.trim().length > 0);
  const validDrafts = drafts.filter((d) => d.vendorId && d.rate > 0);

  if (success) {
    return (
      <SuccessScreen
        title="RFQ created!"
        message={`${rfqNumber} is ready. Share with vendors or proceed to Create PO when quotes are finalized.`}
        accentColor={accent}
        primaryAction={{
          label: 'View RFQ',
          onClick: () => navigate(rfqId ? `/rfqs/${rfqId}` : '/executive'),
        }}
        secondaryAction={{
          label: 'Create PO',
          onClick: () =>
            navigate(
              selectedPr
                ? `/executive/po/new?purchaseRequestId=${selectedPr.id}`
                : '/executive/po/new'
            ),
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full max-w-lg lg:max-w-6xl mx-auto bg-[#F8FAFC]">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : navigate('/executive/rfq/inbox'))}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-surface-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-ink">Create RFQ</h1>
      </header>

      <StepIndicator current={step} total={STEPS.length} accentColor={accent} labels={STEPS} />
      <p className="text-center text-xs text-ink-secondary mb-2 px-4">{STEPS[step]}</p>

      <div className="flex-1 px-4 pb-6">
        <AnimatePresence mode="sync">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-xs text-ink-muted mb-3">
                RFQ is separate from PO — invite at least 3 vendors, compare quotes, then create PO
                from the winning vendor.
              </p>
              {prLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-surface-muted animate-pulse" />
                  ))}
                </div>
              ) : prError ? (
                <EmptyState title="Could not load requests" description="Check API is running." />
              ) : !openPurchaseRequests.length ? (
                <EmptyState
                  title="No requests ready"
                  description="Approve a purchase request in Procurement Decisions first."
                />
              ) : (
                <div className="space-y-2">
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
                        {pr.materialRequest?.indentNumber ?? 'Material request'} · {pr.project?.code}
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

          {step === 1 && selectedPr && (
            <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-xs font-semibold text-bekem-accent bg-bekem-accent/10 border border-bekem-accent/20 rounded-lg px-3 py-2 mb-2">
                RFQ for {selectedPr.prNumber}
                {selectedMr?.indentNumber ? ` · Indent ${selectedMr.indentNumber}` : ''}
              </p>
              <PoWizardStockPanel
                materialIds={materialIds}
                requestingProjectId={selectedPr.projectId || selectedMr?.projectId}
                className="mb-3"
              />
              {selectedMr?.items?.length ? (
                <div className="panel overflow-x-auto mb-3">
                  <table className="data-table min-w-[480px]">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th className="text-right">Qty</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMr.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.material?.name || item.material?.description || '—'}</td>
                          <td className="text-right tabular-nums">{item.quantityRequested}</td>
                          <td>{item.unit || item.material?.unit || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-semibold text-ink-muted">Quote due date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
              <Button
                variant="accent"
                accentColor={accent}
                size="lg"
                disabled={previewRfq.isPending}
                onClick={() => previewRfq.mutate(selectedPr.id)}
              >
                {previewRfq.isPending ? 'Creating RFQ…' : 'Continue — suggest 3 vendors'}
              </Button>
            </motion.div>
          )}

          {step === 2 && comparison && (
            <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-xs text-ink-secondary mb-2">
                RFQ <span className="font-mono font-semibold">{rfqNumber}</span> — enter rates for at
                least 3 vendors. Suggested vendors are pre-filled where available.
              </p>
              <VendorQuotationEditor
                quotations={drafts}
                quantity={quantity}
                onChange={setDrafts}
                minRows={3}
              />
              <Button
                className="mt-4"
                variant="accent"
                accentColor={accent}
                size="lg"
                disabled={validDrafts.length < 1 || submitRfq.isPending}
                onClick={() => submitRfq.mutate(false)}
              >
                {submitRfq.isPending ? 'Saving…' : 'Save quotes & compare'}
              </Button>
            </motion.div>
          )}

          {step === 3 && comparison && (
            <motion.div key="s3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <QuotationComparisonTable comparison={comparison.comparison} className="mb-3" />
              {comparison.purchaseHistory?.length ? (
                <PurchaseHistoryPanel history={comparison.purchaseHistory} className="mb-3" />
              ) : null}
              <Button variant="accent" accentColor={accent} size="lg" onClick={() => setStep(4)}>
                Continue to review & share
              </Button>
            </motion.div>
          )}

          {step === 4 && rfqId && (
            <motion.div key="s4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <div className="panel p-3">
                <p className="font-semibold text-ink">{rfqNumber}</p>
                <p className="text-sm text-ink-secondary mt-1">
                  {comparison?.indentNumber ? `Indent ${comparison.indentNumber}` : ''} ·{' '}
                  {validDrafts.length} vendor quote(s)
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadExport(`/rfqs/${rfqId}/pdf`, `${rfqNumber}.pdf`)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Download RFQ
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await api.post(`/rfqs/${rfqId}/email`, {});
                      toast.success('RFQ email sent');
                    } catch {
                      toast.error('Email failed');
                    }
                  }}
                >
                  <Mail className="h-3.5 w-3.5 mr-1" /> Email
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const res = await api.get<{ data: { url: string } }>(
                      `/rfqs/${rfqId}/share/whatsapp`
                    );
                    window.open(res.data.data.url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                </Button>
              </div>

              <div className="panel p-3 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Finalize preferred vendor (optional)
                </p>
                <div>
                  <label className="text-xs font-semibold text-ink-muted">Preferred vendor</label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  >
                    <option value="">Select vendor</option>
                    {validDrafts.map((d) => (
                      <option key={d.vendorId} value={d.vendorId}>
                        {d.vendorName || d.vendorId} —{' '}
                        {formatCurrency(computeDraftFinalCost(d, quantity))}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted">
                    Why we chose this vendor *
                  </label>
                  <Textarea
                    value={whyWeChoseThisVendor}
                    onChange={(e) => setWhyWeChoseThisVendor(e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                {isNonL1 && (
                  <div>
                    <label className="text-xs font-semibold text-ink-muted">
                      Reason for non-L1 selection *
                    </label>
                    <Textarea
                      value={vendorSelectionReason}
                      onChange={(e) => setVendorSelectionReason(e.target.value)}
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/rfqs/${rfqId}`)}
                >
                  Open RFQ detail
                </Button>
                <Button
                  variant="accent"
                  accentColor={accent}
                  disabled={!canFinalize || submitRfq.isPending}
                  onClick={() => submitRfq.mutate(true)}
                >
                  Finalize RFQ
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      selectedPr
                        ? `/executive/po/new?purchaseRequestId=${selectedPr.id}`
                        : '/executive/po/new'
                    )
                  }
                >
                  Skip — Create PO
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
