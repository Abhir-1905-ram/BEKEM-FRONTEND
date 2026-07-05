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
import { SearchSelect } from '@/components/SearchSelect';
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
  const [pmRemark, setPmRemark] = useState('');
  const [pmRemarkError, setPmRemarkError] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showBranchTransfer, setShowBranchTransfer] = useState(false);
  const [fromProjectId, setFromProjectId] = useState('');
  const [btNote, setBtNote] = useState('');

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

  const pmLocalClose = useMutation({
    mutationFn: async (remark: string) => {
      const res = await api.post<{ data: MaterialRequestDto }>(
        `/material-requests/${id}/pm-local-close`,
        { remark }
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Indent approved and closed locally — store will proceed');
      setPmRemark('');
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['pm-approvals'] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Could not approve locally');
    },
  });

  const forwardToHo = useMutation({
    mutationFn: async (remark: string) => {
      const res = await api.post<{ data: MaterialRequestDto; message?: string; prNumber?: string }>(
        `/material-requests/${id}/forward-to-ho`,
        { remark }
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || `Forwarded to Head Office — PR ${data.prNumber || 'created'}`);
      setPmRemark('');
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['pm-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pm-dashboard'] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Could not forward to Head Office');
    },
  });

  const branchTransfer = useMutation({
    mutationFn: async () => {
      const items =
        request?.items?.map((item) => ({
          materialId: item.materialId,
          quantity: item.quantityRequested,
        })) ||
        (request?.materialId
          ? [{ materialId: request.materialId, quantity: request.quantityRequested || 1 }]
          : []);
      const res = await api.post<{ data: { id: string; transferNumber: string } }>(
        '/branch-transfers',
        {
          fromProjectId,
          materialRequestId: id,
          items,
          note: btNote.trim() || undefined,
        }
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Branch transfer ${data.transferNumber} requested — no purchase order created`);
      setShowBranchTransfer(false);
      setFromProjectId('');
      setBtNote('');
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['pm-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['branch-transfers'] });
      navigate(`/branch-transfers/${data.id}`);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Could not create branch transfer');
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
    enabled:
      !!request &&
      !isLoading &&
      !showReject &&
      !showBranchTransfer &&
      role === UserRole.PROJECT_MANAGER &&
      request.status === 'FORWARDED_TO_PM' &&
      !request.escalatedToHo,
    onReject: () => setShowReject(true),
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
            requestedQty: request.items?.[0]?.requestedQty,
            availableQty: request.items?.[0]?.availableQty,
            requiredQty: request.items?.[0]?.requiredQty,
          },
        ]
      : [];

  const canPmDecide =
    role === UserRole.PROJECT_MANAGER && request.status === 'FORWARDED_TO_PM' && !request.escalatedToHo;
  const canHoReview =
    [UserRole.EXECUTIVE, UserRole.COORDINATOR].includes(role) &&
    ['PENDING_HO', 'PENDING_EXECUTIVE_DECISION', 'EXECUTIVE_DECISION_PO', 'EXECUTIVE_DECISION_BRANCH_TRANSFER'].includes(
      request.status
    );
  const canConfirmReceipt = role === UserRole.SITE_INCHARGE && request.status === 'ISSUED';
  const destProjectId = request.projectId;

  const requirePmRemark = () => {
    if (!pmRemark.trim()) {
      setPmRemarkError('Remark is required');
      return false;
    }
    setPmRemarkError('');
    return true;
  };

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

      {canPmDecide && <PmDailyCapBanner />}

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
            <p className="text-xs text-gray-500">Reason for request</p>
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

      <h2 className="font-semibold text-gray-900 mb-3">Stock comparison (requesting site)</h2>
      <StockComparisonTable items={items} className="mb-6" />

      {canPmDecide && (
        <div className="mb-6 space-y-4 panel p-4">
          <div>
            <p className="text-sm font-semibold text-ink">PM decision</p>
            <p className="text-xs text-ink-secondary mt-1">
              Store forwarded this indent because stock is short at site. Compare availability across
              your supervised projects, then forward to Head Office for procurement, request a branch
              transfer from another project, or reject.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-ink-secondary block mb-2">
              Remark <span className="text-danger">*</span>
            </label>
            <Textarea
              value={pmRemark}
              onChange={(e) => {
                setPmRemark(e.target.value);
                if (e.target.value.trim()) setPmRemarkError('');
              }}
              placeholder="Decision rationale — visible in audit trail to all approvers…"
            />
            {pmRemarkError && <p className="text-xs text-danger mt-1">{pmRemarkError}</p>}
          </div>

          {showReject ? (
            <div className="space-y-2 rounded-xl border border-danger/20 bg-danger-light/30 p-3">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (required)…"
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
          ) : showBranchTransfer ? (
            <div className="space-y-3 rounded-xl border border-surface-border bg-surface-muted/40 p-3">
              <p className="text-sm font-medium text-ink">Request branch transfer</p>
              <p className="text-xs text-ink-secondary">
                Select the supervised project with surplus stock. No purchase order will be created.
              </p>
              <label className="text-xs font-semibold text-ink-muted block">Source project (has stock)</label>
              <SearchSelect
                placeholder="Search project code or name…"
                value={fromProjectId || null}
                onChange={(id) => setFromProjectId(id)}
                searchPath="/branch-transfers/targets/search"
                searchParams={destProjectId ? { excludeProjectId: destProjectId } : undefined}
                mapResult={(raw) => {
                  const row = raw as { id: string; code: string; name: string };
                  return { id: row.id, label: `${row.code} — ${row.name}` };
                }}
              />
              <Textarea
                value={btNote}
                onChange={(e) => setBtNote(e.target.value)}
                placeholder="Optional note for coordinator…"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="accent"
                  accentColor={accent}
                  disabled={!fromProjectId || branchTransfer.isPending}
                  onClick={() => branchTransfer.mutate()}
                >
                  Submit branch transfer request
                </Button>
                <Button variant="ghost" onClick={() => setShowBranchTransfer(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                variant="accent"
                accentColor={accent}
                disabled={pmLocalClose.isPending}
                onClick={() => {
                  if (!requirePmRemark()) return;
                  pmLocalClose.mutate(pmRemark.trim());
                }}
              >
                Approve &amp; close (within PM limit)
              </Button>
              <Button
                variant="secondary"
                disabled={forwardToHo.isPending}
                onClick={() => {
                  if (!requirePmRemark()) return;
                  forwardToHo.mutate(pmRemark.trim());
                }}
              >
                Forward to Head Office
              </Button>
              <Button
                variant="secondary"
                disabled={branchTransfer.isPending}
                onClick={() => setShowBranchTransfer(true)}
              >
                Request branch transfer
              </Button>
              <Button
                variant="ghost"
                className="text-danger"
                onClick={() => {
                  if (!requirePmRemark()) {
                    setShowReject(true);
                    setRejectReason(pmRemark);
                    return;
                  }
                  setRejectReason(pmRemark);
                  setShowReject(true);
                }}
              >
                Reject request
              </Button>
            </div>
          )}
        </div>
      )}

      {canHoReview && (
        <div className="mb-6 space-y-3 panel p-4">
          <p className="text-sm font-semibold text-ink">Head Office procurement</p>
          <p className="text-xs text-ink-secondary">
            This indent is in the procurement decision workflow. Open Procurement Decisions to select
            or review the method.
          </p>
          <Button
            variant="accent"
            accentColor={ROLE_COLORS[UserRole.EXECUTIVE].primary}
            onClick={() =>
              navigate(
                role === UserRole.COORDINATOR
                  ? `/coordinator/procurement-decisions/${request.id}`
                  : `/executive/procurement-decisions/${request.id}`
              )
            }
          >
            Open procurement decision
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
