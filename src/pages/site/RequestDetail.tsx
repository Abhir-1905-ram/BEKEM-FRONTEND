import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { forbiddenQueryOptions, isForbiddenError, useRedirectOnForbidden } from '@/lib/forbiddenRedirect';
import { useAuthStore } from '@/stores/authStore';
import {
  formatDate,
  formatCurrency,
  formatQuantity,
  ROLE_COLORS,
  UserRole,
  hideIndentPricingForRole,
  INDENT_REQUEST_TYPE_LABELS,
  canEditIndentOneLevelAhead,
} from '@afios/shared';
import { isBelowCapIndent, isOverCapIndent, needsExecutiveDecision } from '@/lib/indentCap';
import type { MaterialRequestDto, UpdateIndentDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusTimeline } from '@/components/StatusTimeline';
import { Input, Textarea } from '@/components/ui/Input';
import { StockComparisonTable } from '@/components/StockComparisonTable';
import { CrossProjectStockPanel } from '@/components/CrossProjectStockPanel';
import { applyPmDailyCap, invalidatePmDailyCap, PmDailyCapBanner } from '@/components/PmDailyCapBanner';
import { fmtInrLimit, useApprovalLimits } from '@/hooks/useApprovalLimits';
import { useApprovalShortcuts } from '@/hooks/useApprovalShortcuts';
import { DetailField, DetailFieldGrid } from '@/components/ui/DetailFields';
import { formatIndentQueueStatus } from '@/components/MaterialIndentsTable';
import { QuantityStepper } from '@/components/QuantityStepper';
import { isReadyToIssueIndent } from '@/lib/indentListFilters';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole;
  const accent = ROLE_COLORS[UserRole.PROJECT_MANAGER].primary;
  const { data: approvalLimits } = useApprovalLimits();
  const pmDailyCap = approvalLimits?.mrPmDailyMaxInr ?? 5000;
  const [pmRemark, setPmRemark] = useState('');
  const [pmRemarkError, setPmRemarkError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editPurpose, setEditPurpose] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editRequestedByName, setEditRequestedByName] = useState('');
  const [editRequiredByDate, setEditRequiredByDate] = useState('');
  const [editQty, setEditQty] = useState(0);
  const [editUnit, setEditUnit] = useState('Nos');

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

  useEffect(() => {
    if (!request) return;
    setEditPurpose(request.purpose || '');
    setEditLocation(request.location || '');
    setEditRequestedByName(request.requestedByName || request.requester?.name || '');
    setEditRequiredByDate(
      request.requiredByDate ? String(request.requiredByDate).slice(0, 10) : ''
    );
    const first = request.items?.[0];
    setEditQty(first?.quantityRequested ?? request.quantityRequested ?? 0);
    setEditUnit(first?.unit || first?.material?.unit || 'Nos');
  }, [request]);

  const saveIndent = useMutation({
    mutationFn: async (payload: UpdateIndentDto) => {
      const res = await api.patch<{ data: MaterialRequestDto }>(`/material-requests/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Indent updated');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Could not update indent');
    },
  });

  const pmLocalClose = useMutation({
    mutationFn: async (remark: string) => {
      const res = await api.post<{
        data: MaterialRequestDto;
        dailyApprovedTotal?: number;
        dailyCap?: number;
        remaining?: number;
      }>(`/material-requests/${id}/pm-local-close`, { remark });
      return res.data;
    },
    onSuccess: (body) => {
      toast.success('Indent approved and closed locally — store will proceed');
      setPmRemark('');
      applyPmDailyCap(queryClient, body);
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['pm-approvals'] });
      invalidatePmDailyCap(queryClient);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Could not approve locally');
    },
  });

  const forwardToHo = useMutation({
    mutationFn: async (remark: string) => {
      const res = await api.post<{ data: MaterialRequestDto; message?: string }>(
        `/material-requests/${id}/forward-to-ho`,
        { remark }
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Forwarded to HO for stock requisition');
      setPmRemark('');
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['pm-approvals'] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Could not forward to Head Office');
    },
  });

  const confirmReceipt = useMutation({
    mutationFn: () => api.post(`/material-requests/${id}/confirm-receipt`, {}),
    onSuccess: () => {
      toast.success('Stock verified — request completed');
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
      navigate('/incidents?tab=completed');
    },
    onError: (err: Error & { response?: { data?: { message?: string }; status?: number } }) => {
      toast.error(err.response?.data?.message || 'Could not confirm material receipt');
    },
  });

  const canPmDecide =
    !!request &&
    role === UserRole.PROJECT_MANAGER &&
    request.status === 'FORWARDED_TO_PM' &&
    !request.escalatedToHo;
  const stockAvailable = Boolean(request?.canFullyIssue || request?.storeStockVerified);
  const isBelowCap = Boolean(request && isBelowCapIndent(request));
  const isOverCap = Boolean(request && isOverCapIndent(request));
  /** Stock on hand → PM local approve (even ₹5,000+). Shortfall + over cap / not petty → HO. */
  const showForwardToHo = Boolean(canPmDecide && !stockAvailable && !isBelowCap);
  const showPmApprove = Boolean(canPmDecide && (stockAvailable || isBelowCap));

  useApprovalShortcuts({
    enabled: showPmApprove && !isLoading,
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
  if (role === UserRole.STORE_INCHARGE && isReadyToIssueIndent(request.status)) {
    return <Navigate to={`/store/issue?indentId=${request.id}`} replace />;
  }

  const items = request.items?.length
    ? request.items
    : request.materialId
      ? [
          {
            id: request.id,
            materialId: request.materialId,
            quantityRequested: request.quantityRequested || 0,
            quantityAllocated: request.quantityAllocated || 0,
            location: request.location || '',
            requiredByDate: request.requiredByDate || null,
            material: request.material,
            requestedQty: request.items?.[0]?.requestedQty,
            availableQty: request.items?.[0]?.availableQty,
            requiredQty: request.items?.[0]?.requiredQty,
          },
        ]
      : [];

  const canHoReview =
    [UserRole.EXECUTIVE, UserRole.COORDINATOR].includes(role) &&
    ['PENDING_HO', 'PENDING_EXECUTIVE_DECISION', 'EXECUTIVE_DECISION_PO', 'EXECUTIVE_DECISION_BRANCH_TRANSFER'].includes(
      request.status
    );
  const showProcurementTrace =
    [UserRole.EXECUTIVE, UserRole.COORDINATOR].includes(role) &&
    Boolean(
      request.purchaseRequestId ||
        request.rfqId ||
        request.poId ||
        canHoReview
    );
  const awaitingDecision = needsExecutiveDecision(request);
  const canConfirmReceipt = role === UserRole.SITE_INCHARGE && request.status === 'ISSUED';
  const hidePricing = hideIndentPricingForRole(role, request.indentRequestType);
  const isIndentRaiser = role === UserRole.SITE_INCHARGE;
  const showAvailableToIssue = !isIndentRaiser;
  const canEdit =
    request.canEdit === true || canEditIndentOneLevelAhead(role, request.status);

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
          <StatusBadge
            status={request.status}
            label={formatIndentQueueStatus(request.status, request.pendingWith)}
            className="mt-1"
          />
        </div>
        {canEdit && !editing && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Modify
          </Button>
        )}
      </header>

      {canEdit && (
        <p className="mb-3 text-[11px] text-ink-secondary rounded-lg border border-surface-border bg-surface-muted/40 px-3 py-2">
          You can modify this indent only while it is pending one level ahead. Once it moves further
          (e.g. Store → PM), edit will lock for your role.
        </p>
      )}

      {canPmDecide && <PmDailyCapBanner />}

      {showPmApprove && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Can locally approve and close. No need to reach out to HO level.
        </div>
      )}

      {request.escalatedToHo && !isBelowCap && (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
          This indent was sent to Head Office
          {isOverCap
            ? ` because it is ${fmtInrLimit(pmDailyCap)} or more. It is not counted on today’s approval bar.`
            : ' because it exceeds the PM daily approval limit.'}
        </div>
      )}

      {editing ? (
        <Card className="mb-3 space-y-3 p-3">
          <p className="text-sm font-semibold text-ink">Modify indent</p>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Requested by</label>
            <Input
              value={editRequestedByName}
              onChange={(e) => setEditRequestedByName(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Reason for request</label>
            <Input
              value={editPurpose}
              onChange={(e) => setEditPurpose(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Location</label>
            <Input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Required by date</label>
            <Input
              type="date"
              value={editRequiredByDate}
              onChange={(e) => setEditRequiredByDate(e.target.value)}
              className="text-sm"
            />
          </div>
          {request.items?.[0] && (
            <div className="rounded-xl border border-surface-border p-3 space-y-2">
              <p className="text-sm font-medium text-ink">
                {request.items[0].material?.name || 'Product'}
              </p>
              <div className="grid grid-cols-2 gap-2 items-end">
                <QuantityStepper
                  size="compact"
                  value={editQty}
                  onChange={setEditQty}
                  min={0}
                  unit={editUnit}
                  accentColor={accent}
                />
                <div>
                  <label className="text-xs font-semibold text-ink-muted mb-1 block">Unit</label>
                  <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="text-sm" />
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={
                saveIndent.isPending ||
                !editPurpose.trim() ||
                !editRequestedByName.trim() ||
                editQty <= 0
              }
              onClick={() => {
                const first = request.items?.[0];
                const payload: UpdateIndentDto = {
                  purpose: editPurpose.trim(),
                  requestedByName: editRequestedByName.trim(),
                  location: editLocation.trim(),
                  requiredByDate: editRequiredByDate
                    ? new Date(editRequiredByDate).toISOString()
                    : null,
                };
                if (first?.materialId || first?.material?.id) {
                  payload.items = [
                    {
                      materialId: first.materialId || first.material?.id,
                      unit: editUnit,
                      quantityRequested: editQty,
                    },
                  ];
                }
                saveIndent.mutate(payload);
              }}
            >
              {saveIndent.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </Card>
      ) : (
      <Card className="mb-3">
        <DetailFieldGrid>
          {(request.requestedByName || request.requester?.name) && (
            <DetailField label="Requested by" labelClassName="text-gray-500">
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
          {request.purpose && (
            <DetailField label="Reason for request" fullWidth labelClassName="text-gray-500" valueClassName="font-normal">
              {request.purpose}
            </DetailField>
          )}
        </DetailFieldGrid>
      </Card>
      )}

      <Card className="mb-3 overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-surface-border">
          <h2 className="font-semibold text-gray-900">Indent line items</h2>
          <p className="text-xs text-ink-secondary mt-1">
            {showAvailableToIssue
              ? 'Receipts based on GRN, available stock, and pending receipts are tracked per product line.'
              : 'Receipts based on GRN and pending receipts are tracked per product line.'}
          </p>
        </div>
        <div className="table-shell">
          <table className="data-table min-w-[56rem]">
            <thead>
              <tr>
                <th>Item</th>
                <th>Location</th>
                <th>Required by</th>
                <th className="num">Requested</th>
                <th className="num">Received based on GRN</th>
                {showAvailableToIssue && (
                  <th className="num">Available to issue</th>
                )}
                <th className="num">Pending receipt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="cell-text">{item.material?.name || 'Material'}</td>
                  <td className="cell-text">{item.location || '—'}</td>
                  <td className="whitespace-nowrap">
                    {item.requiredByDate ? formatDate(item.requiredByDate) : '—'}
                  </td>
                  <td className="num tabular-nums">
                    {item.quantityRequested} {item.unit || item.material?.unit || ''}
                  </td>
                  <td className="num tabular-nums">
                    {item.quantityReceived ?? 0} {item.unit || item.material?.unit || ''}
                  </td>
                  {showAvailableToIssue && (
                    <td className="num tabular-nums font-semibold text-emerald-700">
                      {item.availableToIssueQty ?? 0} {item.unit || item.material?.unit || ''}
                    </td>
                  )}
                  <td className="num tabular-nums">
                    {item.pendingReceiptQty ?? 0} {item.unit || item.material?.unit || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mb-3 overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-surface-border">
          <h2 className="font-semibold text-gray-900">GRN and invoice details</h2>
          <p className="text-xs text-ink-secondary mt-1">
            Complete receipt traceability for this indent.
          </p>
        </div>
        {request.grns?.length ? (
          <div className="divide-y divide-surface-border">
            {request.grns.map((grn) => (
              <div key={grn.id} className="p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="GRN number">{grn.grnNumber}</DetailField>
                  <DetailField label="Received on">{formatDate(grn.receivedAt)}</DetailField>
                  <DetailField label="GRN status">
                    {grn.status.replace(/_/g, ' ')}
                  </DetailField>
                  <DetailField label="PO number">{grn.poNumber || '—'}</DetailField>
                  <DetailField label="Vendor">{grn.vendorName || '—'}</DetailField>
                  <DetailField label="Invoice number">
                    {grn.invoiceNumber || '—'}
                  </DetailField>
                  <DetailField label="Invoice date">
                    {grn.invoiceDate ? formatDate(grn.invoiceDate) : '—'}
                  </DetailField>
                  <DetailField label="Invoice value">
                    {grn.invoiceValue != null && grn.invoiceValue > 0
                      ? formatCurrency(grn.invoiceValue)
                      : '—'}
                  </DetailField>
                  <DetailField label="Challan number">{grn.challanNo || '—'}</DetailField>
                  <DetailField label="E-Way bill">{grn.ewayBillNumber || '—'}</DetailField>
                  <DetailField label="Vehicle number">{grn.vehicleNo || '—'}</DetailField>
                  <DetailField label="Driver name">{grn.driverName || '—'}</DetailField>
                  <DetailField label="Delivery date">
                    {grn.deliveryDate ? formatDate(grn.deliveryDate) : '—'}
                  </DetailField>
                </div>
                {grn.note ? (
                  <DetailField label="Remarks">{grn.note}</DetailField>
                ) : null}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Products received</p>
                  <div className="rounded-lg border border-surface-border divide-y divide-surface-border">
                    {grn.items.map((item) => (
                      <div
                        key={`${grn.id}-${item.materialId}`}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span className="text-gray-900">{item.materialName}</span>
                        <span className="font-medium tabular-nums">
                          {formatQuantity(item.quantityReceived, item.unit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-5 text-sm text-ink-muted">
            No GRN or invoice has been recorded for this indent yet.
          </p>
        )}
      </Card>

      <h2 className="font-semibold text-gray-900 mb-3">Stock comparison (requesting site)</h2>
      <StockComparisonTable
        items={items}
        className="mb-3"
        showPricing={!hidePricing}
        showFulfillment
        showAvailableToIssue={showAvailableToIssue}
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
                {stockAvailable
                  ? 'Stock already covers this indent — Approve & close so Store can issue. Head Office is not required.'
                  : isOverCap
                  ? `This indent is ${fmtInrLimit(pmDailyCap)} or more and stock is short — forward to Head Office. It is not counted on today’s approval bar.`
                  : isBelowCap
                  ? `Within ${fmtInrLimit(pmDailyCap)}/day — Approve & close locally. Store will purchase with approved funds and allocate (no Head Office).`
                  : 'Stock is short at site. Forward to Head Office for stock requisition / procurement.'}
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
                  placeholder={
                    stockAvailable
                      ? 'Decision rationale — stock will be reserved for Store to issue…'
                      : showForwardToHo
                      ? isOverCap
                        ? `Reason for forwarding this ${fmtInrLimit(pmDailyCap)}+ indent to Head Office…`
                        : 'Reason for stock requisition to Head Office…'
                      : 'Decision rationale — visible in audit trail to all approvers…'
                  }
                />
                {pmRemarkError && <p className="text-xs text-danger mt-1">{pmRemarkError}</p>}
              </div>
            </div>

            <div className="flex flex-col justify-end gap-2">
              {showPmApprove && (
                <Button
                  variant="accent"
                  accentColor={accent}
                  disabled={pmLocalClose.isPending || forwardToHo.isPending}
                  onClick={() => {
                    if (!requirePmRemark()) return;
                    pmLocalClose.mutate(pmRemark.trim());
                  }}
                >
                  Approve & close
                </Button>
              )}
              {showForwardToHo && (
                <Button
                  variant="accent"
                  accentColor={accent}
                  disabled={forwardToHo.isPending || pmLocalClose.isPending}
                  onClick={() => {
                    if (!requirePmRemark()) return;
                    forwardToHo.mutate(pmRemark.trim());
                  }}
                >
                  {isOverCap ? 'Forward to Head Office' : 'Forward to HO for Stock Requisition'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showProcurementTrace && (
        <div className="mb-3 space-y-3 panel p-3">
          <p className="text-sm font-semibold text-ink">Procurement progress</p>
          <div className="space-y-1.5 text-sm text-ink-secondary">
            <p>
              PR:{' '}
              <span className="font-medium text-ink">
                {request.prNumber || (request.purchaseRequestId ? 'Created' : 'Not created')}
              </span>
            </p>
            <p>
              RFQ:{' '}
              <span className="font-medium text-ink">
                {request.rfqNumber
                  ? `${request.rfqNumber}${
                      request.rfqStatus
                        ? ` · ${
                            request.rfqStatus === 'OPEN'
                              ? 'awaiting quotes'
                              : request.rfqStatus === 'FINALIZED'
                                ? request.poId
                                  ? 'finalized (PO created)'
                                  : 'finalized — ready for PO'
                                : request.rfqStatus.replace(/_/g, ' ')
                          }`
                        : ''
                    }`
                  : 'Not started'}
              </span>
            </p>
            <p>
              PO:{' '}
              <span className="font-medium text-ink">
                {request.poNumber
                  ? `${request.poNumber}${
                      request.poStatus ? ` · ${request.poStatus.replace(/_/g, ' ')}` : ''
                    }`
                  : 'Not created'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {awaitingDecision && (
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
                Review & decide
              </Button>
            )}
            {!request.rfqId && request.purchaseRequestId && role === UserRole.EXECUTIVE && (
              <Button
                variant="primary"
                onClick={() =>
                  navigate(
                    `/executive/rfq/new?purchaseRequestId=${request.purchaseRequestId}`
                  )
                }
              >
                Create RFQ
              </Button>
            )}
            {request.rfqId && (
              <Button variant="secondary" onClick={() => navigate(`/rfqs/${request.rfqId}`)}>
                Open RFQ
              </Button>
            )}
            {request.rfqId &&
              request.rfqStatus === 'FINALIZED' &&
              !request.poId &&
              request.purchaseRequestId &&
              role === UserRole.EXECUTIVE && (
                <Button
                  variant="primary"
                  onClick={() =>
                    navigate(
                      `/executive/po/new?purchaseRequestId=${request.purchaseRequestId}`
                    )
                  }
                >
                  Create PO
                </Button>
              )}
            {request.poId && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/purchase-orders/${request.poId}`)}
              >
                View PO
              </Button>
            )}
            {request.status === 'EXECUTIVE_DECISION_BRANCH_TRANSFER' && (
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(
                    role === UserRole.COORDINATOR
                      ? `/coordinator/procurement-decisions/${request.id}`
                      : `/executive/procurement-decisions/${request.id}`
                  )
                }
              >
                View branch transfer
              </Button>
            )}
          </div>
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
            Collect & verify stock
          </Button>
        </div>
      )}

      <h2 className="font-semibold text-gray-900 mb-3">Status timeline</h2>
      <StatusTimeline entityType="MaterialRequest" entityId={request.id} />
    </div>
  );
}
