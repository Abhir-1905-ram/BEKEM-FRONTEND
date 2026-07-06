import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Mail, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { RfqComparisonDto, RfqDetailDto } from '@afios/shared';
import { DEFAULT_GST_PERCENT } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { QuotationComparisonTable } from '@/components/QuotationComparisonTable';
import { PurchaseHistoryPanel } from '@/components/PurchaseHistoryPanel';
import { VendorQuotationEditor, type VendorQuotationDraft } from '@/components/VendorQuotationEditor';
import { ProcurementWorkflowBanner } from '@/components/ProcurementWorkflowBanner';
import { downloadExport } from '@/lib/downloadExport';
import { pickL1VendorId } from '@/lib/quotationTotals';
import { toast } from 'sonner';

function draftsFromComparison(data: RfqComparisonDto): VendorQuotationDraft[] {
  return data.comparison.vendors.map((v) => ({
    vendorId: v.vendorId,
    vendorName: v.vendorName,
    rate: v.rate,
    gstPercent: v.gstPercent,
    paymentTerms: v.paymentTerms,
    deliveryTerms: v.deliveryTerms,
  }));
}

export function RfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<VendorQuotationDraft[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [whyWeChoseThisVendor, setWhyWeChoseThisVendor] = useState('');
  const [vendorSelectionReason, setVendorSelectionReason] = useState('');

  const { data: rfq, ...query } = useQuery({
    queryKey: ['rfq', id],
    queryFn: async () => {
      const res = await api.get<{ data: RfqDetailDto }>(`/rfqs/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const { data: comparison } = useQuery({
    queryKey: ['rfq-comparison', id],
    queryFn: async () => {
      const res = await api.get<{ data: RfqComparisonDto }>(`/rfqs/${id}/comparison`);
      return res.data.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!comparison) return;
    setDrafts(draftsFromComparison(comparison));
    setSelectedVendorId(comparison.selectedVendorId || comparison.comparison.l1VendorId || '');
    setWhyWeChoseThisVendor(comparison.whyWeChoseThisVendor || '');
    setVendorSelectionReason(comparison.vendorSelectionReason || '');
  }, [comparison]);

  const l1VendorId = useMemo(
    () => pickL1VendorId(comparison?.comparison.vendors ?? []),
    [comparison]
  );
  const isNonL1 = selectedVendorId && l1VendorId && selectedVendorId !== l1VendorId;

  const saveQuotations = useMutation({
    mutationFn: async () => {
      await api.put(`/rfqs/${id}/quotations`, {
        quotations: drafts.filter((d) => d.vendorId),
      });
    },
    onSuccess: () => {
      toast.success('Vendor quotations saved');
      queryClient.invalidateQueries({ queryKey: ['rfq-comparison', id] });
      queryClient.invalidateQueries({ queryKey: ['rfq', id] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/rfqs/${id}/finalize`, {
        selectedVendorId,
        whyWeChoseThisVendor,
        vendorSelectionReason: isNonL1 ? vendorSelectionReason : undefined,
      });
    },
    onSuccess: () => {
      toast.success('RFQ finalized');
      queryClient.invalidateQueries({ queryKey: ['rfq-comparison', id] });
      queryClient.invalidateQueries({ queryKey: ['rfq', id] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not finalize RFQ'),
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: { sent: boolean; to?: string } }>(`/rfqs/${id}/email`, {});
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data.sent) toast.success(`RFQ emailed${data.to ? ` to ${data.to}` : ''}`);
      else toast.error('Email could not be sent');
    },
  });

  const whatsappMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get<{ data: { url: string } }>(`/rfqs/${id}/share/whatsapp`);
      return res.data.data.url;
    },
    onSuccess: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
  });

  const downloadPdf = async () => {
    if (!rfq) return;
    await downloadExport(`/rfqs/${id}/pdf`, `${rfq.rfqNumber}.pdf`);
  };

  const quantity = comparison?.quantity ?? 1;

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title={rfq?.rfqNumber || 'RFQ'}
        subtitle={rfq?.projectCode ? `${rfq.projectCode} — ${rfq.projectName || ''}` : 'Request for quotation'}
        action={
          rfq ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={downloadPdf}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="secondary" size="sm" disabled={emailMutation.isPending} onClick={() => emailMutation.mutate()}>
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button variant="secondary" size="sm" disabled={whatsappMutation.isPending} onClick={() => whatsappMutation.mutate()}>
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          ) : undefined
        }
      />

      <ProcurementWorkflowBanner className="mb-4" highlightFrom={7} defaultExpanded={false} />

      <ListQueryBoundary
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        retrying={query.isFetching && !query.isLoading}
        skeletonRows={4}
        empty={<></>}
      >
        {rfq && comparison && (
          <div className="space-y-6">
            {rfq.status === 'FINALIZED' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                RFQ finalized — proceed to Create PO when ready.
              </div>
            )}

            <PurchaseHistoryPanel history={comparison.purchaseHistory} />

            <div>
              <h2 className="section-label mb-3">Vendor quotations</h2>
              <VendorQuotationEditor
                quotations={drafts.length ? drafts : [{ vendorId: '', rate: 0, gstPercent: DEFAULT_GST_PERCENT, paymentTerms: '', deliveryTerms: '' }]}
                quantity={quantity}
                onChange={setDrafts}
              />
              <Button className="mt-3" variant="secondary" disabled={saveQuotations.isPending} onClick={() => saveQuotations.mutate()}>
                Save quotations
              </Button>
            </div>

            <div>
              <h2 className="section-label mb-3">Quotation comparison</h2>
              <QuotationComparisonTable comparison={comparison.comparison} />
            </div>

            <div className="panel p-4 space-y-3">
              <h2 className="section-label">Vendor selection</h2>
              <label className="block text-sm">
                <span className="text-ink-secondary">Selected vendor</span>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  disabled={rfq.status === 'FINALIZED'}
                >
                  <option value="">Choose vendor</option>
                  {comparison.comparison.vendors.map((v) => (
                    <option key={v.vendorId} value={v.vendorId}>
                      {v.vendorName}
                      {v.isL1 ? ' (L1)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {isNonL1 && (
                <>
                  <p className="text-[11px] font-medium text-ink-muted mb-1">Reason for selection (non-L1)</p>
                  <Textarea
                    value={vendorSelectionReason}
                    onChange={(e) => setVendorSelectionReason(e.target.value)}
                    rows={2}
                    disabled={rfq.status === 'FINALIZED'}
                    placeholder="Reason for selection (non-L1)"
                  />
                </>
              )}
              <p className="text-[11px] font-medium text-ink-muted mb-1">Why we chose this vendor</p>
              <Textarea
                value={whyWeChoseThisVendor}
                onChange={(e) => setWhyWeChoseThisVendor(e.target.value)}
                rows={3}
                disabled={rfq.status === 'FINALIZED'}
              />
              {rfq.status !== 'FINALIZED' && (
                <Button
                  variant="primary"
                  disabled={finalizeMutation.isPending || !selectedVendorId}
                  onClick={() => finalizeMutation.mutate()}
                >
                  Finalize RFQ
                </Button>
              )}
            </div>
          </div>
        )}
      </ListQueryBoundary>
    </div>
  );
}
