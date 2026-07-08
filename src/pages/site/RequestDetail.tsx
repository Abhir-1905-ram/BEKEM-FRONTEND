import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { forbiddenQueryOptions, isForbiddenError, useRedirectOnForbidden } from '@/lib/forbiddenRedirect';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatCurrency, ROLE_COLORS, UserRole, hideIndentPricingForRole, INDENT_REQUEST_TYPE_LABELS } from '@afios/shared';
import type { MaterialRequestDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusTimeline } from '@/components/StatusTimeline';
import { Textarea } from '@/components/ui/Input';
import { StockComparisonTable } from '@/components/StockComparisonTable';
import { CrossProjectStockPanel } from '@/components/CrossProjectStockPanel';
import { PmDailyCapBanner } from '@/components/PmDailyCapBanner';
import { useApprovalShortcuts } from '@/hooks/useApprovalShortcuts';
import { DetailField, DetailFieldGrid } from '@/components/ui/DetailFields';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole;
  const accent = ROLE_COLORS[UserRole.PROJECT_MANAGER].primary;
  const [pmRemark, setPmRemark] = useState('');
  const [pmRemarkError, setPmRemarkError] = useState('');

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
      role === UserRole.PROJECT_MANAGER &&
      request.status === 'FORWARDED_TO_PM' &&
      !request.escalatedToHo,
    onApprove: () => {
      if (!pmRemark.trim()) {
        setPmRemarkError('Remark is required');
        return;
      }
      pmLocalClose.mutate(pmRemark.trim());
    },
  });
  if (isLoading) {
    return (
      <div className="px-4 pt-6 space-y-3">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-card animate-pulse" />
      </div>
    );
  }

  if (isError && isForbiddenError(error)) {
    return null;
  }

  if (!request) return null;

  // Store pending actions live on AllocateFlow (Allocation Request / Stock requisition).
  if (role === UserRole.STORE_INCHARGE && request.status === 'PENDING_STORE') {
    return <Navigate to={`/store/allocate/${request.id}`} replace />;
  }

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
  const hidePricing = hideIndentPricingForRole(role, request.indentRequestType);

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
      <header className="flex items-center gap-3 mb-3">
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
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
          This indent was escalated to Head Office — it exceeds the PM&apos;s configurable daily
          approval limit (see Admin settings).
        </div>
      )}

      <Card className="mb-3">
        <DetailFieldGrid>
          {(request.requestedByName || request.requester?.name) && (
            <DetailField label="Indent raiser" labelClassName="text-gray-500">
              {request.requestedByName || request.requester?.name}
            </DetailField>
          )}
          {request.indentCategory?.name && (
            <DetailField label="Indent category" labelClassName="text-gray-500">
              {request.indentCategory.name}
            </DetailField>
          )}
          {request.site && (
            <DetailField label="Site" labelClassName="text-gray-500">
              {request.site.name}
              {request.site.chainageLabel ? ` · ${request.site.chainageLabel}` : ''}
            </DetailField>
          )}
          {request.indentRequestType && (
            <DetailField label="Indent type" labelClassName="text-gray-500">
              {INDENT_REQUEST_TYPE_LABELS[request.indentRequestType]}
            </DetailField>
          )}
          {!hidePricing && request.estimatedValue != null && request.estimatedValue > 0 && (
            <DetailField label="Estimated value" labelClassName="text-gray-500">
              {formatCurrency(request.estimatedValue)}
            </DetailField>
          )}
          {request.requiredByDate && (
            <DetailField label="Required by" labelClassName="text-gray-500">
              {formatDate(request.requiredByDate)}
            </DetailField>
          )}
          {request.purpose && (
            <DetailField label="Reason for request" fullWidth labelClassName="text-gray-500" valueClassName="font-normal">
              {request.purpose}
            </DetailField>
          )}
        </DetailFieldGrid>
      </Card>

      <h2 className="font-semibold text-gray-900 mb-3">Stock comparison (requesting site)</h2>
      <StockComparisonTable
        items={items}
        className="mb-3"
        showPricing={!hidePricing}
        totalEstimatedValue={hidePricing ? undefined : request.estimatedValue}
      />

      {role === UserRole.PROJECT_MANAGER && request.crossProjectStock?.length ? (
        <>
          <h2 className="font-semibold text-gray-900 mb-3">Stock across your projects</h2>
          <CrossProjectStockPanel
            rows={request.crossProjectStock}
            requestingProjectId={request.projectId}
            className="mb-3"
          />
        </>
      ) : null}

      {canPmDecide && (
        <div className="mb-3 panel p-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-ink">PM decision</p>
              <p className="text-xs text-ink-secondary mt-1">
                Store forwarded this indent because stock is short at site. Close it within PM limit
                after your verification.
              </p>

              <div className="mt-3">
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
            </div>

            <div className="flex flex-col justify-end gap-2">
              <Button
                variant="accent"
                accentColor={accent}
                disabled={pmLocalClose.isPending}
                onClick={() => {
                  if (!requirePmRemark()) return;
                  pmLocalClose.mutate(pmRemark.trim());
                }}
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {canHoReview && (
        <div className="mb-3 space-y-3 panel p-3">
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
        <div className="flex flex-wrap gap-2 mb-3">
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
