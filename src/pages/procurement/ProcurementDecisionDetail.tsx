import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatCurrency,
  formatDate,
  ROLE_COLORS,
  UserRole,
  computeRequiredQty,
} from '@afios/shared';
import type { IndentLineItemDto, ProcurementDecisionDto, ProjectDto } from '@afios/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/Input';
import { SearchSelect } from '@/components/SearchSelect';
import { StockComparisonTable } from '@/components/StockComparisonTable';
import { StatusTimeline } from '@/components/StatusTimeline';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';

interface ProcurementDecisionDetailPageProps {
  listPath: string;
}

export function ProcurementDecisionDetailPage({ listPath }: ProcurementDecisionDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole;

  const [method, setMethod] = useState<'PURCHASE_ORDER' | 'BRANCH_TRANSFER'>('PURCHASE_ORDER');
  const [remark, setRemark] = useState('');
  const [fromProjectId, setFromProjectId] = useState('');
  const [showReject, setShowReject] = useState(false);

  const { data: decision, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['procurement-decision', id],
    queryFn: async () => {
      const res = await api.get<{ data: ProcurementDecisionDto }>(`/procurement-decisions/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (decision?.executiveProcurementMethod) {
      setMethod(decision.executiveProcurementMethod);
    }
  }, [decision?.executiveProcurementMethod]);

  const { data: projects } = useQuery({
    queryKey: ['projects-active'],
    queryFn: async () => {
      const res = await api.get<{ data: ProjectDto[] }>('/projects', { params: { status: 'ACTIVE' } });
      return res.data.data ?? [];
    },
    enabled: role === UserRole.COORDINATOR && !!decision?.canCoordinatorReview,
  });

  const executiveDecide = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: ProcurementDecisionDto }>(
        `/procurement-decisions/${id}/executive-decide`,
        { method, remark: remark.trim() }
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Procurement method recorded — sent to Coordinator for approval');
      setRemark('');
      queryClient.invalidateQueries({ queryKey: ['procurement-decision', id] });
      queryClient.invalidateQueries({ queryKey: ['procurement-decisions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Could not record decision');
    },
  });

  const coordinatorReview = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      const res = await api.post<{ data: ProcurementDecisionDto }>(
        `/procurement-decisions/${id}/coordinator-review`,
        {
          action,
          method: action === 'approve' ? method : undefined,
          remark: remark.trim(),
          fromProjectId: action === 'approve' && method === 'BRANCH_TRANSFER' ? fromProjectId : undefined,
        }
      );
      return res.data.data;
    },
    onSuccess: (_, action) => {
      toast.success(action === 'approve' ? 'Procurement decision approved' : 'Procurement decision rejected');
      setRemark('');
      setShowReject(false);
      queryClient.invalidateQueries({ queryKey: ['procurement-decision', id] });
      queryClient.invalidateQueries({ queryKey: ['procurement-decisions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Review failed');
    },
  });

  const stockItems: IndentLineItemDto[] =
    decision?.items.map((item) => ({
      id: item.id,
      materialId: item.materialId,
      quantityRequested: item.requestedQty,
      requestedQty: item.requestedQty,
      availableQty: item.availableQty,
      requiredQty: item.requiredQty,
      material: { id: item.materialId, code: '', name: item.materialName, unit: item.unit },
      unit: item.unit,
    })) ?? [];

  const projectOptions =
    projects
      ?.filter((p) => p.id !== decision?.projectId)
      .map((p) => ({ id: p.id, label: `${p.code} — ${p.name}` })) ?? [];

  const accent =
    role === UserRole.COORDINATOR
      ? ROLE_COLORS[UserRole.COORDINATOR].primary
      : ROLE_COLORS[UserRole.EXECUTIVE].primary;

  return (
    <div className="page-container max-w-3xl">
      <header className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(listPath)}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-ink truncate">
            {decision?.indentNumber || 'Procurement decision'}
          </h1>
          {decision && <StatusBadge status={decision.status} className="mt-1" />}
        </div>
      </header>

      <ListQueryBoundary
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        retrying={isFetching && !isLoading}
        skeletonRows={6}
        empty={<></>}
      >
        {decision && (
          <>
            <Card className="space-y-3 mb-6">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-ink-muted">Project</p>
                  <p className="font-medium">
                    {decision.projectCode} — {decision.projectName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Indent date</p>
                  <p className="font-medium">
                    {decision.indentDate ? formatDate(decision.indentDate) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Requested by</p>
                  <p className="font-medium">{decision.requestedBy || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Estimated value</p>
                  <p className="font-medium">{formatCurrency(decision.estimatedValue)}</p>
                </div>
              </div>
              {decision.pmRemarks && (
                <div>
                  <p className="text-xs text-ink-muted">PM remarks</p>
                  <p className="text-sm mt-0.5">{decision.pmRemarks}</p>
                </div>
              )}
            </Card>

            <h2 className="section-label mb-3">Material list (this project)</h2>
            <StockComparisonTable items={stockItems} className="mb-6" />

            <h2 className="section-label mb-3">Stock across all projects</h2>
            <div className="space-y-4 mb-6">
              {decision.items.map((item) => (
                <Card key={item.id} className="overflow-hidden p-0">
                  <div className="px-3 py-2 bg-surface-muted/50 border-b border-surface-border">
                    <p className="font-medium text-sm">{item.materialName}</p>
                    <p className="text-xs text-ink-muted">
                      Required: {computeRequiredQty(item.requestedQty, item.availableQty)} {item.unit}
                    </p>
                  </div>
                  {item.enterpriseStock.length ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border">
                          <th className="text-left px-3 py-2 font-semibold text-ink-muted">Project</th>
                          <th className="text-left px-3 py-2 font-semibold text-ink-muted">Site</th>
                          <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">
                            Available
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.enterpriseStock.map((row) => (
                          <tr key={`${item.id}-${row.projectId}`} className="border-b border-surface-border/60">
                            <td className="px-3 py-2">
                              {row.projectCode} — {row.projectName}
                            </td>
                            <td className="px-3 py-2 text-ink-secondary">{row.siteName || '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.availableQty} {item.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="px-3 py-3 text-sm text-ink-muted">No stock recorded in other projects.</p>
                  )}
                </Card>
              ))}
            </div>

            {decision.executiveProcurementMethod && (
              <Card className="mb-6 border-review/30 bg-review-light/20">
                <p className="text-sm font-semibold text-ink">Executive recommendation</p>
                <p className="text-sm mt-1">
                  {decision.executiveProcurementMethod === 'BRANCH_TRANSFER'
                    ? 'Request branch transfer'
                    : 'Create purchase order'}
                </p>
                {decision.executiveDecisionRemark && (
                  <p className="text-xs text-ink-secondary mt-2">{decision.executiveDecisionRemark}</p>
                )}
                {decision.executiveDecidedBy && (
                  <p className="text-xs text-ink-muted mt-1">
                    {decision.executiveDecidedBy}
                    {decision.executiveDecidedAt
                      ? ` · ${formatDate(decision.executiveDecidedAt)}`
                      : ''}
                  </p>
                )}
              </Card>
            )}

            {decision.canExecutiveDecide && role === UserRole.EXECUTIVE && (
              <div className="panel p-4 mb-6 space-y-4">
                <p className="text-sm font-semibold text-ink">Select procurement method</p>
                <p className="text-xs text-ink-secondary">
                  You are choosing how to procure — not approving the indent.
                </p>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-surface-border p-3 hover:border-bekem-accent/40">
                    <input
                      type="radio"
                      name="proc-method"
                      checked={method === 'PURCHASE_ORDER'}
                      onChange={() => setMethod('PURCHASE_ORDER')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-sm">Create purchase order</p>
                      <p className="text-xs text-ink-muted">Use when no surplus stock exists anywhere.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-surface-border p-3 hover:border-bekem-accent/40">
                    <input
                      type="radio"
                      name="proc-method"
                      checked={method === 'BRANCH_TRANSFER'}
                      onChange={() => setMethod('BRANCH_TRANSFER')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-sm">Request branch transfer</p>
                      <p className="text-xs text-ink-muted">
                        Use when another project has sufficient surplus stock.
                      </p>
                    </div>
                  </label>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-muted">Remarks (required)</label>
                  <Textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Reason for this procurement method…"
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="accent"
                  accentColor={accent}
                  disabled={!remark.trim() || executiveDecide.isPending}
                  onClick={() => executiveDecide.mutate()}
                >
                  Submit procurement decision
                </Button>
              </div>
            )}

            {decision.canCoordinatorReview && role === UserRole.COORDINATOR && (
              <div className="panel p-4 mb-6 space-y-4">
                <p className="text-sm font-semibold text-ink">Coordinator review</p>
                <p className="text-xs text-ink-secondary">
                  Approve, reject, or modify the executive&apos;s recommended procurement method.
                </p>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-surface-border p-3">
                    <input
                      type="radio"
                      name="coord-method"
                      checked={method === 'PURCHASE_ORDER'}
                      onChange={() => setMethod('PURCHASE_ORDER')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-sm">Purchase order</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-surface-border p-3">
                    <input
                      type="radio"
                      name="coord-method"
                      checked={method === 'BRANCH_TRANSFER'}
                      onChange={() => setMethod('BRANCH_TRANSFER')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-sm">Branch transfer</p>
                    </div>
                  </label>
                </div>
                {method === 'BRANCH_TRANSFER' && (
                  <div>
                    <label className="text-xs font-semibold text-ink-muted block mb-1">
                      Source project (has stock)
                    </label>
                    <SearchSelect
                      placeholder="Select project with surplus stock…"
                      options={projectOptions}
                      value={fromProjectId || null}
                      onChange={(id) => setFromProjectId(id)}
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-ink-muted">Remarks (required)</label>
                  <Textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Approval notes or reason for modification…"
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="accent"
                    accentColor={accent}
                    disabled={
                      !remark.trim() ||
                      coordinatorReview.isPending ||
                      (method === 'BRANCH_TRANSFER' && !fromProjectId)
                    }
                    onClick={() => coordinatorReview.mutate('approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-danger"
                    disabled={coordinatorReview.isPending}
                    onClick={() => setShowReject(true)}
                  >
                    Reject
                  </Button>
                </div>
                {showReject && (
                  <div className="rounded-lg border border-danger/20 bg-danger-light/30 p-3 space-y-2">
                    <p className="text-sm font-medium text-danger-dark">Confirm rejection</p>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!remark.trim() || coordinatorReview.isPending}
                      onClick={() => coordinatorReview.mutate('reject')}
                    >
                      Reject procurement decision
                    </Button>
                  </div>
                )}
              </div>
            )}

            <h2 className="font-semibold text-ink mb-3">Audit trail</h2>
            <StatusTimeline entityType="MaterialRequest" entityId={decision.id} />
          </>
        )}
      </ListQueryBoundary>
    </div>
  );
}
