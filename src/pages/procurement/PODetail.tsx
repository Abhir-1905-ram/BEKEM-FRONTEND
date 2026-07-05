import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  ROLE_COLORS,
  UserRole,
  formatCurrency,
  type PurchaseOrderDto,
  type QuotationDto,
} from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PoEmailStatusChip } from '@/components/PoEmailStatusChip';
import { StatusTimeline } from '@/components/StatusTimeline';
import { OverrideRemarkModal } from '@/components/OverrideRemarkModal';
import { Input, Textarea } from '@/components/ui/Input';
import { SuccessScreen } from '@/components/SuccessScreen';
import { forbiddenQueryOptions, isForbiddenError, useRedirectOnForbidden } from '@/lib/forbiddenRedirect';
import { getRoleHomePath } from '@/lib/rolePaths';
import { downloadExport } from '@/lib/downloadExport';
import { toast } from 'sonner';
import { PoTrackingTimeline } from '@/components/PoTrackingTimeline';
import { ProcurementRefField } from '@/components/ProcurementRefField';
import { FulfillmentStatusChip } from '@/components/FulfillmentStatusChip';
import { useApprovalShortcuts } from '@/hooks/useApprovalShortcuts';
import type { DelegationStatusDto, PoGrnsDto } from '@afios/shared';

const PO_PDF_AFTER_COORDINATOR_STATUSES = ['APPROVED'] as const;

export function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user)!;
  const role = user.role as UserRole;
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [editPaymentTerms, setEditPaymentTerms] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data: delegationStatus } = useQuery({
    queryKey: ['delegation-status'],
    queryFn: async () => {
      const res = await api.get<{ data: DelegationStatusDto }>('/delegations/status');
      return res.data.data;
    },
  });

  const accent =
    role === UserRole.COORDINATOR
      ? ROLE_COLORS[UserRole.COORDINATOR].primary
      : role === UserRole.PROJECT_MANAGER
        ? ROLE_COLORS[UserRole.PROJECT_MANAGER].primary
        : role === UserRole.EXECUTIVE
          ? ROLE_COLORS[UserRole.EXECUTIVE].primary
          : ROLE_COLORS[UserRole.CHAIRMAN].primary;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto; quotations: QuotationDto[] }>(
        `/purchase-orders/${id}`
      );
      return res.data;
    },
    enabled: !!id,
    ...forbiddenQueryOptions,
  });

  useRedirectOnForbidden(error);

  const { data: grnData } = useQuery({
    queryKey: ['po-grns', id],
    queryFn: async () => {
      const res = await api.get<{ data: PoGrnsDto }>(`/purchase-orders/${id}/grns`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const verify = useMutation({
    mutationFn: (payload: { action: 'APPROVE' | 'RETURN' | 'CLARIFICATION' }) =>
      api.post(`/purchase-orders/${id}/verify`, {
        action: payload.action,
        note,
      }),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['purchase-order', id] });
      const previous = queryClient.getQueryData<{ data: PurchaseOrderDto; quotations: QuotationDto[] }>([
        'purchase-order',
        id,
      ]);
      if (previous && payload.action === 'APPROVE') {
        queryClient.setQueryData(['purchase-order', id], {
          ...previous,
          data: { ...previous.data, status: 'APPROVED' },
        });
      }
      return { previous };
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }, _a, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['purchase-order', id], ctx.previous);
      toast.error(e.response?.data?.message || 'Verification failed');
    },
    onSuccess: (res, payload) => {
      const status = (res as { data?: { data?: { status?: string } } })?.data?.data?.status;
      const msg =
        payload.action === 'APPROVE'
          ? status === 'CHAIRMAN_PENDING'
            ? 'Verified — sent to Chairman for final approval'
            : 'Purchase order approved'
          : payload.action === 'RETURN'
            ? 'Returned to Executive'
            : 'Clarification requested';
      setDoneMessage(msg);
      setDone(true);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['purchase-order', id] }),
  });

  const pmApprove = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/pm-approve`, { note }),
    onSuccess: () => {
      setDoneMessage('PO approved by Project Manager (under ₹5,000)');
      setDone(true);
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'PM approval failed');
    },
  });

  const approve = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/approve`, { note }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['purchase-order', id] });
      const previous = queryClient.getQueryData<{ data: PurchaseOrderDto; quotations: QuotationDto[] }>([
        'purchase-order',
        id,
      ]);
      if (previous) {
        queryClient.setQueryData(['purchase-order', id], {
          ...previous,
          data: { ...previous.data, status: 'APPROVED' },
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['purchase-order', id], ctx.previous);
      toast.error('Approval failed');
    },
    onSuccess: () => {
      setDoneMessage('Purchase order approved');
      setDone(true);
    },
  });

  const approveOverride = useMutation({
    mutationFn: (remark: string) =>
      api.post(`/purchase-orders/${id}/approve-override`, { remark }),
    onSuccess: () => {
      setShowOverrideModal(false);
      setDoneMessage('Approved in Chairman\'s absence');
      setDone(true);
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Override approval failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['purchase-order', id] }),
  });

  const patchPo = useMutation({
    mutationFn: () =>
      api.patch(`/purchase-orders/${id}`, { paymentTerms: editPaymentTerms }),
    onSuccess: () => {
      toast.success('PO updated');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
    },
    onError: () => toast.error('Could not save changes'),
  });

  const reject = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/reject`, { note }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['purchase-order', id] });
      const previous = queryClient.getQueryData<{ data: PurchaseOrderDto; quotations: QuotationDto[] }>([
        'purchase-order',
        id,
      ]);
      if (previous) {
        queryClient.setQueryData(['purchase-order', id], {
          ...previous,
          data: { ...previous.data, status: 'REJECTED' },
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['purchase-order', id], ctx.previous);
      toast.error('Rejection failed');
    },
    onSuccess: () => {
      setDoneMessage('Purchase order rejected');
      setDone(true);
    },
  });

  useApprovalShortcuts({
    enabled: !!data && !done && !isLoading,
    onApprove: () => {
      if (!data) return;
      const po = data.data;
      if (role === UserRole.PROJECT_MANAGER && po.status === 'PM_PENDING') {
        pmApprove.mutate();
      } else if (
        role === UserRole.COORDINATOR &&
        (po.status === 'PENDING_REVIEW' || po.status === 'COORDINATOR_PENDING')
      ) {
        verify.mutate({ action: 'APPROVE' });
      } else if (
        (po.status === 'PENDING_APPROVAL' || po.status === 'CHAIRMAN_PENDING') &&
        (role === UserRole.CHAIRMAN || delegationStatus?.canActAsChairman)
      ) {
        approve.mutate();
      }
    },
    onReject: () => {
      if (!data) return;
      const po = data.data;
      if (
        role === UserRole.COORDINATOR &&
        (po.status === 'PENDING_REVIEW' || po.status === 'COORDINATOR_PENDING')
      ) {
        verify.mutate({ action: 'RETURN' });
      } else if (
        (po.status === 'PENDING_APPROVAL' || po.status === 'CHAIRMAN_PENDING') &&
        (role === UserRole.CHAIRMAN || delegationStatus?.canActAsChairman)
      ) {
        reject.mutate();
      }
    },
  });

  if (done) {
    return (
      <SuccessScreen
        title="Done!"
        message={doneMessage}
        accentColor={accent}
        primaryAction={{ label: 'Back to home', onClick: () => navigate(getRoleHomePath(role)) }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 pt-6">
        <div className="h-40 bg-gray-100 rounded-card animate-pulse" />
      </div>
    );
  }

  if (isError && isForbiddenError(error)) {
    return null;
  }

  if (!data) {
    return (
      <div className="px-4 pt-6">
        <div className="h-40 bg-gray-100 rounded-card animate-pulse" />
      </div>
    );
  }

  const po = data.data;
  const needsChairmanBand = po.amount > 10000;
  const isCoordinator =
    role === UserRole.COORDINATOR &&
    (po.status === 'PENDING_REVIEW' || po.status === 'COORDINATOR_PENDING');
  const isCoordinatorApproved = role === UserRole.COORDINATOR && po.status === 'APPROVED';
  const canEditPo =
    (role === UserRole.COORDINATOR &&
      ['PENDING_REVIEW', 'COORDINATOR_PENDING', 'CHAIRMAN_PENDING', 'APPROVED'].includes(
        po.status
      )) ||
    (role === UserRole.CHAIRMAN &&
      ['PENDING_APPROVAL', 'CHAIRMAN_PENDING', 'APPROVED'].includes(po.status));
  const canChairmanEditException =
    role === UserRole.CHAIRMAN && po.status === 'APPROVED';
  const isCoordinatorOverride =
    role === UserRole.COORDINATOR &&
    needsChairmanBand &&
    ['PENDING_REVIEW', 'COORDINATOR_PENDING', 'CHAIRMAN_PENDING'].includes(po.status);
  const isPmApprover = role === UserRole.PROJECT_MANAGER && po.status === 'PM_PENDING';
  const canFinalApprove =
    (po.status === 'PENDING_APPROVAL' || po.status === 'CHAIRMAN_PENDING') &&
    (role === UserRole.CHAIRMAN || delegationStatus?.canActAsChairman);
  const actingOnBehalf =
    role !== UserRole.CHAIRMAN && delegationStatus?.canActAsChairman
      ? delegationStatus.asDelegate.find((d: { scope: string; principal?: { name?: string } }) => d.scope === 'PO_FINAL')?.principal?.name
      : null;

  const canExportPdf =
    role !== UserRole.EXECUTIVE ||
    PO_PDF_AFTER_COORDINATOR_STATUSES.includes(
      po.status as (typeof PO_PDF_AFTER_COORDINATOR_STATUSES)[number]
    );

  const exportPdf = async () => {
    setExporting(true);
    try {
      await downloadExport(`/exports/purchase-orders/${po.id}.pdf`, `${po.poNumber}.pdf`);
      toast.success('PO exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-semibold">{po.poNumber}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <StatusBadge status={po.status} />
            {po.status === 'APPROVED' && (
              <FulfillmentStatusChip status={grnData?.fulfillmentStatus || po.fulfillmentStatus} />
            )}
            {po.approvedAsChairmanOverride && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Approved in Chairman&apos;s absence
              </span>
            )}
          </div>
        </div>
        {canExportPdf && (
          <Button variant="ghost" size="sm" onClick={exportPdf} disabled={exporting}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
        )}
      </header>

      {(po.procurementRef || po.poNumber) && (
        <ProcurementRefField value={po.procurementRef || po.poNumber || '—'} />
      )}

      {role === UserRole.EXECUTIVE && !canExportPdf && (
        <p className="text-xs text-ink-secondary bg-surface-muted border border-surface-border rounded-lg px-3 py-2 mb-4">
          PDF download unlocks after the coordinator approves this PO.
        </p>
      )}

      {po.approvedAsChairmanOverride && po.overrideRemark && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Override remark: {po.overrideRemark}
        </p>
      )}

      {po.status === 'APPROVED' && po.emailStatus && (
        <div className="mb-4">
          <PoEmailStatusChip status={po.emailStatus} sentAt={po.emailSentAt} />
        </div>
      )}

      {po.approvalRoutingNote && (
        <p className="text-xs text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 mb-4">
          {po.approvalRoutingNote}
        </p>
      )}

      {actingOnBehalf && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Acting on behalf of {actingOnBehalf}
        </p>
      )}

      <Card className="space-y-3 mb-6">
        <div>
          <p className="text-xs text-gray-500">Vendor (To)</p>
          <p className="font-medium">{po.vendor?.name}</p>
          {po.vendor?.address && (
            <p className="text-xs text-gray-600 whitespace-pre-line mt-1">{po.vendor.address}</p>
          )}
          {po.vendor?.gstNumber && (
            <p className="text-xs text-gray-500 mt-1">GST: {po.vendor.gstNumber}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500">Amount</p>
          <p className="font-medium text-lg">{formatCurrency(po.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Payment terms</p>
          <p className="font-medium">{po.paymentTerms}</p>
        </div>
        {po.billingAddress && (
          <div>
            <p className="text-xs text-gray-500">Buyer&apos;s address</p>
            <p className="text-sm whitespace-pre-line">{po.billingAddress}</p>
          </div>
        )}
        {po.deliveryAddress && (
          <div>
            <p className="text-xs text-gray-500">Consignee (store site)</p>
            <p className="text-sm whitespace-pre-line">{po.deliveryAddress}</p>
          </div>
        )}
        {po.purchaseRequest?.prNumber && (
          <div>
            <p className="text-xs text-gray-500">Purchase request</p>
            <p className="font-medium">{po.purchaseRequest.prNumber}</p>
          </div>
        )}
      </Card>

      {po.lineItems && po.lineItems.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-sm mb-2">Line items</h2>
          <div className="space-y-2">
            {(po.lineItems ?? []).map((item, idx) => (
              <Card key={item.id || idx} className="py-2">
                <p className="text-sm font-medium">{item.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {item.quantity} × {formatCurrency(item.rate)} = {formatCurrency(item.amount)}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.quotations?.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-sm mb-2">Quotation comparison</h2>
          <div className="space-y-2">
            {(data.quotations ?? []).map((q) => (
              <Card key={q.id} className="py-2 flex justify-between">
                <span className="text-sm">{q.vendor?.name}</span>
                <span className="font-medium text-sm">{formatCurrency(q.amount)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-semibold text-sm mb-3">PO tracking</h2>
      <PoTrackingTimeline poId={po.id} className="mb-6" />

      <h2 className="font-semibold text-sm mb-3">Approval history</h2>
      <StatusTimeline entityType="PurchaseOrder" entityId={po.id} />

      {po.status === 'APPROVED' && grnData && (
        <div className="mt-6 space-y-3">
          <h2 className="font-semibold text-sm">Goods receipt notes</h2>
          {grnData.paymentSummary && grnData.paymentSummary.billCount > 0 && (
            <div className="rounded-xl border border-surface-border bg-surface-muted/40 p-3 text-sm grid sm:grid-cols-2 gap-2">
              <span>
                Invoiced: {formatCurrency(grnData.paymentSummary.totalInvoiced)}
              </span>
              <span>Paid: {formatCurrency(grnData.paymentSummary.totalPaid)}</span>
              <span>
                Outstanding: {formatCurrency(grnData.paymentSummary.totalOutstanding)}
              </span>
              <span className="capitalize">
                Payment: {grnData.paymentSummary.paymentStatus.toLowerCase()}
              </span>
            </div>
          )}
          {!(grnData.grns?.length) ? (
            <p className="text-sm text-ink-muted">No GRNs recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {(grnData.grns ?? []).map((g) => (
                <Card key={g.id} className="py-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-sm">{g.grnNumber}</p>
                      <p className="text-xs text-ink-muted">
                        {g.receivedAt ? new Date(g.receivedAt).toLocaleDateString('en-IN') : '—'}
                        {g.invoiceNo ? ` · Inv ${g.invoiceNo}` : ''}
                        {g.billNumber ? ` · ${g.billNumber}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={g.status} />
                      {g.isPartialGrn && (
                        <span className="text-[10px] font-bold text-red-600 uppercase">Partial GRN</span>
                      )}
                      {g.paymentStatus && (
                        <span className="text-[10px] font-semibold uppercase text-ink-secondary">
                          {g.paymentStatus}
                          {g.outstandingAmount != null
                            ? ` · ${formatCurrency(g.outstandingAmount)} due`
                            : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {(isCoordinator || isCoordinatorOverride || canFinalApprove || isPmApprover || isCoordinatorApproved || canChairmanEditException) && (
        <div className="mt-6 space-y-3">
          {grnData?.grns?.length ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              This PO has {grnData.grns.length} recorded GRN(s). Line quantity or rate changes may
              conflict with receipts — the server will warn before saving.
            </p>
          ) : null}
          {canEditPo && !editing && (
            <div className="flex flex-wrap gap-2">
              {role === UserRole.COORDINATOR && (
                <Button
                  variant={po.status === 'APPROVED' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setEditPaymentTerms(po.paymentTerms);
                    setEditing(true);
                  }}
                >
                  {po.status === 'APPROVED' ? 'Modify / Correct PO' : 'Edit PO'}
                </Button>
              )}
              {role === UserRole.CHAIRMAN && (
                <Button
                  variant={po.status === 'APPROVED' ? 'ghost' : 'secondary'}
                  size="sm"
                  className={po.status === 'APPROVED' ? 'text-ink-muted' : undefined}
                  onClick={() => {
                    setEditPaymentTerms(po.paymentTerms);
                    setEditing(true);
                  }}
                >
                  {po.status === 'APPROVED' ? 'Edit (exception)' : 'Edit PO'}
                </Button>
              )}
            </div>
          )}
          {editing && (
            <div className="space-y-2 rounded-xl border border-surface-border p-3">
              <label className="text-xs font-semibold text-ink-muted">Payment terms</label>
              <Input
                value={editPaymentTerms}
                onChange={(e) => setEditPaymentTerms(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={patchPo.isPending}
                  onClick={() => patchPo.mutate()}
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note or reason…"
          />
          {isPmApprover && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-ink-secondary">
                Amount under ₹5,000 — you are the final approver for this PO.
              </p>
              <Button
                variant="accent"
                size="lg"
                accentColor={ROLE_COLORS[UserRole.PROJECT_MANAGER].primary}
                disabled={pmApprove.isPending}
                onClick={() => pmApprove.mutate()}
              >
                Approve PO (PM)
              </Button>
            </div>
          )}
          {isCoordinator && (
            <div className="flex flex-col gap-2">
              <Button
                variant="accent"
                size="lg"
                accentColor={accent}
                disabled={verify.isPending}
                onClick={() => verify.mutate({ action: 'APPROVE' })}
              >
                {needsChairmanBand ? 'Verify & send to Chairman' : 'Verify & approve PO'}
              </Button>
              {needsChairmanBand && (
                <>
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Chairman not on premises? Approve here with a mandatory written reason (min 30
                    characters) — permanently audited.
                  </p>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="border-amber-300 text-amber-900"
                    onClick={() => setShowOverrideModal(true)}
                  >
                    Approve (Chairman unavailable)
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                size="lg"
                disabled={verify.isPending}
                onClick={() => verify.mutate({ action: 'CLARIFICATION' })}
              >
                Request clarification
              </Button>
              <Button
                variant="ghost"
                size="lg"
                disabled={verify.isPending || !note.trim()}
                onClick={() => verify.mutate({ action: 'RETURN' })}
              >
                Return to Executive
              </Button>
            </div>
          )}
          {isCoordinatorOverride && po.status === 'CHAIRMAN_PENDING' && (
            <div className="flex flex-col gap-2 border-t border-surface-border pt-3">
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                PO is with Chairman. If Chairman is unavailable, approve with a mandatory remark
                (min 30 characters) — permanently audited.
              </p>
              <Button
                variant="secondary"
                size="lg"
                className="border-amber-300 text-amber-900"
                onClick={() => setShowOverrideModal(true)}
              >
                Approve (Chairman unavailable)
              </Button>
            </div>
          )}
          {canFinalApprove && (
            <div className="flex flex-col gap-2">
              <Button
                variant="accent"
                size="lg"
                accentColor={accent}
                disabled={approve.isPending}
                onClick={() => approve.mutate()}
              >
                Approve PO
              </Button>
              <Button
                variant="destructive"
                size="lg"
                disabled={!note.trim() || reject.isPending}
                onClick={() => reject.mutate()}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      )}

      <OverrideRemarkModal
        open={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        pending={approveOverride.isPending}
        onSubmit={(remark) => approveOverride.mutate(remark)}
      />
    </div>
  );
}
