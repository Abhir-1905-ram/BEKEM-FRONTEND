import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { forbiddenQueryOptions, isForbiddenError, useRedirectOnForbidden } from '@/lib/forbiddenRedirect';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, ROLE_COLORS, UserRole } from '@afios/shared';
import type { MaterialRequestDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusTimeline } from '@/components/StatusTimeline';
import { Textarea } from '@/components/ui/Input';
import { StockComparisonTable } from '@/components/StockComparisonTable';
import { PmDailyCapBanner } from '@/components/PmDailyCapBanner';
import { useApprovalShortcuts } from '@/hooks/useApprovalShortcuts';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole;
  const accent = ROLE_COLORS[UserRole.PROJECT_MANAGER].primary;
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: request, isLoading, isError, error } = useQuery({
    queryKey: ['material-request', id],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto }>(`/material-requests/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    ...forbiddenQueryOptions,
  });

  useRedirectOnForbidden(error);

  const approve = useMutation({
    mutationFn: async () => {
      const res = await api.post<{
        escalated?: boolean;
        dailyApprovedTotal?: number;
        message?: string;
      }>(`/material-requests/${id}/approve`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.escalated) {
        toast.warning(data.message || 'Escalated to Head Office — daily cap exceeded');
      } else {
        toast.success('Approved — purchase request created for executive');
      }
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['pm-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pm-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pm-daily-cap'] });
    },
    onError: (err: Error & { response?: { data?: { message?: string; escalated?: boolean } } }) => {
      const msg = err.response?.data?.message;
      if (err.response?.data?.escalated) {
        toast.warning(msg || 'Escalated to Head Office');
        queryClient.invalidateQueries({ queryKey: ['material-request', id] });
        queryClient.invalidateQueries({ queryKey: ['pm-daily-cap'] });
      } else {
        toast.error(msg || 'Approval failed');
      }
    },
  });

  const reject = useMutation({
    mutationFn: (reason: string) => api.post(`/material-requests/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Indent rejected');
      setShowReject(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['pm-approvals'] });
    },
    onError: () => toast.error('Rejection failed'),
  });

  const confirmReceipt = useMutation({
    mutationFn: () => api.post(`/material-requests/${id}/confirm-receipt`, {}),
    onSuccess: () => {
      toast.success('Receipt confirmed — request completed');
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
    },
  });

  useApprovalShortcuts({
    enabled: !!request && !isLoading && !showReject,
    onApprove: () => {
      if (!request) return;
      if (
        role === UserRole.PROJECT_MANAGER &&
        request.status === 'FORWARDED_TO_PM' &&
        !request.escalatedToHo
      ) {
        approve.mutate();
      } else if (
        [UserRole.EXECUTIVE, UserRole.COORDINATOR].includes(role) &&
        request.status === 'PENDING_HO'
      ) {
        approve.mutate();
      }
    },
    onReject: () => {
      if (!request) return;
      if (
        role === UserRole.PROJECT_MANAGER &&
        request.status === 'FORWARDED_TO_PM' &&
        !request.escalatedToHo
      ) {
        setShowReject(true);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-card animate-pulse" />
      </div>
    );
  }

  if (isError && isForbiddenError(error)) {
    return null;
  }

  if (!request) return null;

  const items = request.items?.length
    ? request.items
    : request.materialId
      ? [
          {
            id: request.id,
            materialId: request.materialId,
            quantityRequested: request.quantityRequested || 0,
            material: request.material,
          },
        ]
      : [];

  const canPmApprove =
    role === UserRole.PROJECT_MANAGER && request.status === 'FORWARDED_TO_PM' && !request.escalatedToHo;
  const canHoApprove =
    [UserRole.EXECUTIVE, UserRole.COORDINATOR].includes(role) && request.status === 'PENDING_HO';
  const canConfirmReceipt = role === UserRole.SITE_INCHARGE && request.status === 'ISSUED';

  return (
    <div className="px-4 pt-4 pb-6 max-w-3xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-gray-900 truncate">{request.indentNumber}</h1>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(request.indentNumber);
                toast.success('Request ID copied');
              }}
              className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted"
              aria-label="Copy request ID"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <StatusBadge status={request.status} className="mt-1" />
        </div>
      </header>

      {(canPmApprove) && <PmDailyCapBanner />}

      {request.escalatedToHo && (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          This indent was escalated to Head Office — it exceeds the PM&apos;s ₹5,000 daily approval
          limit.
        </div>
      )}

      <Card className="space-y-3 mb-6">
        {request.project && (
          <div>
            <p className="text-xs text-gray-500">Project</p>
            <p className="font-medium">
              {request.project.code} — {request.project.name}
            </p>
          </div>
        )}
        {request.requester?.name && (
          <div>
            <p className="text-xs text-gray-500">Requested by</p>
            <p className="font-medium">{request.requester.name}</p>
          </div>
        )}
        {request.site?.chainageLabel && (
          <div>
            <p className="text-xs text-gray-500">Site</p>
            <p className="font-medium">
              {request.site.name}
              {request.site.chainageLabel ? ` · ${request.site.chainageLabel}` : ''}
            </p>
          </div>
        )}
        {request.estimatedValue != null && request.estimatedValue > 0 && (
          <div>
            <p className="text-xs text-gray-500">Estimated value</p>
            <p className="font-medium">₹{request.estimatedValue.toLocaleString('en-IN')}</p>
          </div>
        )}
        {request.purpose && (
          <div>
            <p className="text-xs text-gray-500">Purpose</p>
            <p className="font-medium">{request.purpose}</p>
          </div>
        )}
        {request.requiredByDate && (
          <div>
            <p className="text-xs text-gray-500">Required by</p>
            <p className="font-medium">{formatDate(request.requiredByDate)}</p>
          </div>
        )}
      </Card>

      <h2 className="font-semibold text-gray-900 mb-3">Stock comparison</h2>
      <StockComparisonTable items={items} className="mb-6" />

      {canPmApprove && (
        <div className="mb-6 space-y-3 panel p-4">
          <p className="text-sm font-semibold text-ink">PM decision</p>
          <p className="text-xs text-ink-secondary">
            Review stock levels above, then approve (sends purchase request to executive) or reject
            with a reason.
          </p>
          {showReject ? (
            <div className="space-y-2">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  disabled={!rejectReason.trim() || reject.isPending}
                  onClick={() => reject.mutate(rejectReason.trim())}
                >
                  Confirm reject
                </Button>
                <Button variant="ghost" onClick={() => setShowReject(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="accent"
                accentColor={accent}
                disabled={approve.isPending}
                onClick={() => approve.mutate()}
              >
                Approve & create purchase request
              </Button>
              <Button variant="secondary" onClick={() => setShowReject(true)}>
                Reject
              </Button>
            </div>
          )}
        </div>
      )}

      {canHoApprove && (
        <div className="mb-6 space-y-3 panel p-4">
          <p className="text-sm font-semibold text-ink">Head Office decision</p>
          <p className="text-xs text-ink-secondary">
            This indent exceeded the PM daily approval cap. Approve to create a purchase request.
          </p>
          <Button
            variant="accent"
            accentColor={ROLE_COLORS[UserRole.EXECUTIVE].primary}
            disabled={approve.isPending}
            onClick={() => approve.mutate()}
          >
            Approve (Head Office)
          </Button>
        </div>
      )}

      {canConfirmReceipt && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant="accent"
            accentColor={ROLE_COLORS[UserRole.SITE_INCHARGE].primary}
            disabled={confirmReceipt.isPending}
            onClick={() => confirmReceipt.mutate()}
          >
            Confirm material received
          </Button>
        </div>
      )}

      <h2 className="font-semibold text-gray-900 mb-3">Status timeline</h2>
      <StatusTimeline entityType="MaterialRequest" entityId={request.id} />
    </div>
  );
}
