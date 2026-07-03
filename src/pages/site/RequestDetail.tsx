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
    mutationFn: () => api.post(`/material-requests/${id}/approve`),
    onSuccess: () => {
      toast.success('Approved — purchase request created for executive');
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['pm-approvals'] });
    },
    onError: () => toast.error('Approval failed'),
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

  const canPmApprove = role === UserRole.PROJECT_MANAGER && request.status === 'FORWARDED_TO_PM';
  const canConfirmReceipt =
    role === UserRole.SITE_INCHARGE && request.status === 'ISSUED';

  return (
    <div className="px-4 pt-4 pb-6">
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

      <Card className="space-y-3 mb-6">
        {request.project && (
          <div>
            <p className="text-xs text-gray-500">Project</p>
            <p className="font-medium">
              {request.project.code} — {request.project.name}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500">Material</p>
          <p className="font-medium">{request.material?.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Quantity</p>
          <p className="font-medium">
            {request.quantityRequested} {request.material?.unit || request.items?.[0]?.unit}
          </p>
        </div>
        {request.items && request.items.length > 1 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Line items</p>
            <ul className="space-y-1">
              {request.items.map((item) => (
                <li key={item.id} className="text-sm">
                  {item.material?.name || 'Material'} — {item.quantityRequested}{' '}
                  {item.unit || item.material?.unit}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500">Required by</p>
          <p className="font-medium">{formatDate(request.requiredByDate)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Purpose</p>
          <p className="font-medium">{request.purpose}</p>
        </div>
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
      </Card>

      {canPmApprove && (
        <div className="mb-6 space-y-3 panel p-4">
          <p className="text-sm font-semibold text-ink">PM decision</p>
          <p className="text-xs text-ink-secondary">
            Review the indent details above, then approve (sends purchase request to executive) or
            reject with a reason.
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
