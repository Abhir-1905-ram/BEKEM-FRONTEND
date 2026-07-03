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
import { StatusTimeline } from '@/components/StatusTimeline';
import { Textarea } from '@/components/ui/Input';
import { SuccessScreen } from '@/components/SuccessScreen';
import { forbiddenQueryOptions, isForbiddenError, useRedirectOnForbidden } from '@/lib/forbiddenRedirect';
import { getRoleHomePath } from '@/lib/rolePaths';
import { downloadExport } from '@/lib/downloadExport';
import { toast } from 'sonner';
import type { DelegationStatusDto } from '@afios/shared';

const PO_PDF_AFTER_COORDINATOR_STATUSES = ['APPROVED'] as const;

export function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user)!;
  const role = user.role as UserRole;
  const [note, setNote] = useState('');
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

  const verify = useMutation({
    mutationFn: (payload: {
      action: 'APPROVE' | 'RETURN' | 'CLARIFICATION';
      chairmanUnavailable?: boolean;
    }) =>
      api.post(`/purchase-orders/${id}/verify`, {
        action: payload.action,
        note,
        chairmanUnavailable: payload.chairmanUnavailable,
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
            : payload.chairmanUnavailable
              ? 'Approved in Chairman absence'
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
  const isPmApprover = role === UserRole.PROJECT_MANAGER && po.status === 'PM_PENDING';
  const canFinalApprove =
    (po.status === 'PENDING_APPROVAL' || po.status === 'CHAIRMAN_PENDING') &&
    (role === UserRole.CHAIRMAN || delegationStatus?.canActAsChairman);
  const actingOnBehalf =
    role !== UserRole.CHAIRMAN && delegationStatus?.canActAsChairman
      ? delegationStatus.asDelegate.find((d) => d.scope === 'PO_FINAL')?.principal?.name
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
          <StatusBadge status={po.status} className="mt-1" />
        </div>
        {canExportPdf && (
          <Button variant="ghost" size="sm" onClick={exportPdf} disabled={exporting}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
        )}
      </header>

      {role === UserRole.EXECUTIVE && !canExportPdf && (
        <p className="text-xs text-ink-secondary bg-surface-muted border border-surface-border rounded-lg px-3 py-2 mb-4">
          PDF download unlocks after the coordinator approves this PO.
        </p>
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
            {po.lineItems.map((item, idx) => (
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
            {data.quotations.map((q) => (
              <Card key={q.id} className="py-2 flex justify-between">
                <span className="text-sm">{q.vendor?.name}</span>
                <span className="font-medium text-sm">{formatCurrency(q.amount)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-semibold text-sm mb-3">Timeline</h2>
      <StatusTimeline entityType="PurchaseOrder" entityId={po.id} />

      {(isCoordinator || canFinalApprove || isPmApprover) && (
        <div className="mt-6 space-y-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isCoordinator && needsChairmanBand
                ? 'Note required if approving while Chairman is not on premises…'
                : canFinalApprove
                  ? 'Optional note…'
                  : 'Note or reason…'
            }
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
              {needsChairmanBand ? (
                <>
                  <Button
                    variant="accent"
                    size="lg"
                    accentColor={accent}
                    disabled={verify.isPending}
                    onClick={() => verify.mutate({ action: 'APPROVE' })}
                  >
                    Verify & send to Chairman
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={verify.isPending || note.trim().length < 8}
                    onClick={() =>
                      verify.mutate({ action: 'APPROVE', chairmanUnavailable: true })
                    }
                  >
                    Approve — Chairman not on premises
                  </Button>
                  <p className="text-xs text-ink-muted">
                    Exception approval requires a written reason (min 8 characters). Audited.
                  </p>
                </>
              ) : (
                <Button
                  variant="accent"
                  size="lg"
                  accentColor={accent}
                  disabled={verify.isPending}
                  onClick={() => verify.mutate({ action: 'APPROVE' })}
                >
                  Verify & approve PO
                </Button>
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
                disabled={verify.isPending}
                onClick={() => verify.mutate({ action: 'RETURN' })}
              >
                Return to Executive
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
    </div>
  );
}
