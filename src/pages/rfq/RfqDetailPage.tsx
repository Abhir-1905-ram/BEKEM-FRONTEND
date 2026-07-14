import { useEffect, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Download, Mail, MessageCircle } from 'lucide-react';

import { api } from '@/lib/api';

import type { RfqComparisonDto, RfqDetailDto } from '@afios/shared';

import { Button } from '@/components/ui/Button';

import { Textarea } from '@/components/ui/Input';

import { PageHeader } from '@/components/layout/PageHeader';

import { ListQueryBoundary } from '@/components/ListQueryBoundary';

import { QuotationComparisonTable } from '@/components/QuotationComparisonTable';

import { PurchaseHistoryPanel } from '@/components/PurchaseHistoryPanel';

import { VendorQuotationEditor, type VendorQuotationDraft } from '@/components/VendorQuotationEditor';

import { downloadExport } from '@/lib/downloadExport';

import { pickL1VendorId } from '@/lib/quotationTotals';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';



import { draftsFromComparison, onlyAssignedDrafts } from '@/lib/rfqVendorAssignments';

export function RfqDetailPage() {
  const { id } = useParams<{ id: string }>();

  const queryClient = useQueryClient();

  const [drafts, setDrafts] = useState<VendorQuotationDraft[]>([]);

  const [selectedVendorId, setSelectedVendorId] = useState('');

  const [whyWeChoseThisVendor, setWhyWeChoseThisVendor] = useState('');
  const [vendorSelectionReason, setVendorSelectionReason] = useState('');
  const [vendorChoiceKind, setVendorChoiceKind] = useState<'L1' | 'NON_L1' | ''>('');

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

    const assigned = onlyAssignedDrafts(draftsFromComparison(comparison));
    setSelectedVendorId(
      comparison.selectedVendorId ||
        comparison.comparison.l1VendorId ||
        assigned[0]?.vendorId ||
        ''
    );

    setWhyWeChoseThisVendor(comparison.whyWeChoseThisVendor || '');

    setVendorSelectionReason(comparison.vendorSelectionReason || '');

  }, [comparison]);



  const l1VendorId = useMemo(
    () => {
      const fromComp = comparison?.comparison?.l1VendorId
        ? String(comparison.comparison.l1VendorId)
        : '';
      if (fromComp) return fromComp;
      return pickL1VendorId(
        (comparison?.comparison.vendors ?? []).map((v) => ({
          vendorId: String(v.vendorId),
          finalCost: Number(v.finalCost || 0),
        }))
      );
    },
    [comparison]
  );

  const isNonL1 = Boolean(
    selectedVendorId && l1VendorId && String(selectedVendorId) !== String(l1VendorId)
  );

  useEffect(() => {
    if (!selectedVendorId) {
      setVendorChoiceKind('');
      return;
    }
    if (!l1VendorId) {
      setVendorChoiceKind('L1');
      return;
    }
    setVendorChoiceKind(isNonL1 ? 'NON_L1' : 'L1');
  }, [selectedVendorId, isNonL1, l1VendorId]);

  const canFinalize =
    !!selectedVendorId &&
    !!vendorChoiceKind &&
    (vendorChoiceKind === 'L1'
      ? !isNonL1 && whyWeChoseThisVendor.trim().length > 0
      : isNonL1 && vendorSelectionReason.trim().length > 0);



  const saveQuotations = useMutation({

    mutationFn: async () => {

      await api.put(`/rfqs/${id}/quotations`, {

        quotations: onlyAssignedDrafts(drafts),

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
        whyWeChoseThisVendor:
          vendorChoiceKind === 'NON_L1' ? vendorSelectionReason.trim() : whyWeChoseThisVendor.trim(),
        vendorSelectionReason:
          vendorChoiceKind === 'NON_L1' ? vendorSelectionReason.trim() : undefined,
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

    <div className="page-container max-w-6xl">

      <PageHeader

        title={rfq?.rfqNumber || 'RFQ'}

        subtitle={rfq?.projectCode ? `${rfq.projectCode} — ${rfq.projectName || ''}` : 'Request for quotation'}

        action={

          rfq ? (

            <div className="flex flex-wrap gap-1.5">

              <Button variant="secondary" size="sm" onClick={downloadPdf}>

                <Download className="h-4 w-4" />

                PDF

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



      <ListQueryBoundary

        isLoading={query.isLoading}

        isError={query.isError}

        onRetry={() => query.refetch()}

        retrying={query.isFetching && !query.isLoading}

        skeletonRows={4}

        empty={<></>}

      >

        {rfq && comparison && (

          <div className="space-y-3">

            {rfq.status === 'FINALIZED' && (

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">

                RFQ finalized — proceed to Create PO when ready.

              </div>

            )}



            <PurchaseHistoryPanel history={comparison.purchaseHistory} />



            <div className="grid xl:grid-cols-2 gap-3 items-start">

              <div>

                <div className="flex items-center justify-between gap-2 mb-2">

                  <h2 className="section-label">Vendor quotations</h2>

                  <Button

                    variant="secondary"

                    size="sm"

                    disabled={saveQuotations.isPending}

                    onClick={() => saveQuotations.mutate()}

                  >

                    Save quotations

                  </Button>

                </div>

                <VendorQuotationEditor

                  quotations={drafts}

                  quantity={quantity}

                  items={comparison.items}

                  onChange={(rows) => setDrafts(onlyAssignedDrafts(rows))}

                />

              </div>



              <div>

                <h2 className="section-label mb-2">Quotation comparison</h2>

                <QuotationComparisonTable comparison={comparison.comparison} />

              </div>

            </div>



            <div className="panel p-3">
              <h2 className="section-label mb-2">Vendor selection</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="block text-sm md:col-span-2">
                  <span className="text-xs text-ink-secondary">Selected vendor</span>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-surface-border px-2 py-1.5 text-sm h-8"
                    disabled={rfq.status === 'FINALIZED'}
                  >
                    <option value="">Choose vendor</option>
                    {onlyAssignedDrafts(drafts).map((v) => (
                      <option key={v.vendorId} value={v.vendorId}>
                        {v.vendorName || v.vendorId}
                      </option>
                    ))}
                  </select>
                </label>

                {rfq.status !== 'FINALIZED' && (
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-[11px] text-ink-muted">
                      {l1VendorId
                        ? isNonL1
                          ? 'Selected vendor is not L1 — Non-L1 reason is required.'
                          : 'Selected vendor matches L1 — confirm with an L1 remark.'
                        : 'Confirm why this vendor was selected.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isNonL1}
                        onClick={() => {
                          setVendorChoiceKind('L1');
                          setVendorSelectionReason('');
                        }}
                        className={cn(
                          'px-3 py-2 rounded-lg border text-sm font-semibold transition-colors',
                          vendorChoiceKind === 'L1'
                            ? 'border-bekem-accent bg-bekem-accent/10 text-bekem-accent'
                            : 'border-surface-border bg-white text-ink-secondary hover:text-ink',
                          isNonL1 && 'opacity-40 cursor-not-allowed hover:text-ink-secondary'
                        )}
                      >
                        Chose L1
                      </button>
                      <button
                        type="button"
                        disabled={!!l1VendorId && !isNonL1}
                        onClick={() => {
                          setVendorChoiceKind('NON_L1');
                          setWhyWeChoseThisVendor('');
                        }}
                        className={cn(
                          'px-3 py-2 rounded-lg border text-sm font-semibold transition-colors',
                          vendorChoiceKind === 'NON_L1'
                            ? 'border-amber-500 bg-amber-50 text-amber-900'
                            : 'border-surface-border bg-white text-ink-secondary hover:text-ink',
                          !!l1VendorId &&
                            !isNonL1 &&
                            'opacity-40 cursor-not-allowed hover:text-ink-secondary'
                        )}
                      >
                        Chose Non-L1
                      </button>
                    </div>
                  </div>
                )}

                {vendorChoiceKind === 'NON_L1' && (
                  <div className="md:col-span-2">
                    <p className="text-[11px] font-medium text-ink-muted mb-1">
                      Reason for selecting Non-L1 vendor (required)
                    </p>
                    <Textarea
                      value={vendorSelectionReason}
                      onChange={(e) => setVendorSelectionReason(e.target.value)}
                      rows={2}
                      className="min-h-[56px]"
                      disabled={rfq.status === 'FINALIZED'}
                      placeholder="e.g. Better delivery / preferred brand / site urgency"
                    />
                  </div>
                )}

                {vendorChoiceKind === 'L1' && (
                  <div className="md:col-span-2">
                    <p className="text-[11px] font-medium text-ink-muted mb-1">
                      Why we chose this L1 vendor (required)
                    </p>
                    <Textarea
                      value={whyWeChoseThisVendor}
                      onChange={(e) => setWhyWeChoseThisVendor(e.target.value)}
                      rows={2}
                      className="min-h-[56px]"
                      disabled={rfq.status === 'FINALIZED'}
                      placeholder="e.g. Lowest quote and acceptable delivery"
                    />
                  </div>
                )}
              </div>

              {rfq.status !== 'FINALIZED' && (

                <Button

                  className="mt-3"

                  variant="primary"

                  size="sm"

                  disabled={finalizeMutation.isPending || !canFinalize}

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

