import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate, ROLE_COLORS, ROLE_LABELS, UserRole } from '@afios/shared';
import type { PurchaseRequestDto } from '@afios/shared';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/Input';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { DetailField, DetailFieldGrid } from '@/components/ui/DetailFields';
import { StatusTimeline } from '@/components/StatusTimeline';

function priorityLabel(priority?: string) {
  if (priority === 'HIGH') return 'High';
  if (priority === 'MEDIUM') return 'Medium';
  return 'Normal';
}

function prStatusLabel(pr: PurchaseRequestDto) {
  if (pr.pendingWith && pr.pendingWith in ROLE_LABELS) {
    return `Pending at ${ROLE_LABELS[pr.pendingWith as UserRole]}`;
  }
  return undefined;
}

export function ExecutivePurchaseRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accent = ROLE_COLORS[UserRole.EXECUTIVE].primary;

  const [method, setMethod] = useState<'PURCHASE_ORDER' | 'BRANCH_TRANSFER'>('PURCHASE_ORDER');
  const [remark, setRemark] = useState('');

  const { data: pr, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['purchase-request', id],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseRequestDto }>(`/purchase-requests/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (pr?.executiveRecommendation) {
      setMethod(pr.executiveRecommendation);
    }
  }, [pr?.executiveRecommendation]);

  const executiveDecide = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: PurchaseRequestDto }>(
        `/purchase-requests/${id}/executive-decide`,
        { method, remark: remark.trim() }
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(
        method === 'PURCHASE_ORDER'
          ? 'Queued for RFQ — invite vendors and compare quotes'
          : 'Branch transfer recommendation sent to Coordinator'
      );
      setRemark('');
      queryClient.invalidateQueries({ queryKey: ['purchase-request', id] });
      queryClient.invalidateQueries({ queryKey: ['executive-purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      queryClient.invalidateQueries({ queryKey: ['executive-rfqs'] });
      if (method === 'PURCHASE_ORDER' && data.id) {
        navigate(`/executive/rfq/new?purchaseRequestId=${data.id}`);
      }
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Could not record decision');
    },
  });

  const canDecide = pr?.canExecutiveDecide;
  const hasRecommendation = !!pr?.executiveRecommendation;

  return (
    <div className="page-container max-w-4xl">
      <header className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={() => navigate('/executive/purchase-requests')}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-ink truncate">{pr?.prNumber || 'Purchase request'}</h1>
          {pr && (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StatusBadge status={pr.status} label={prStatusLabel(pr)} />
              {pr.priority && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                  {priorityLabel(pr.priority)}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <ListQueryBoundary
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        retrying={isFetching && !isLoading}
        skeletonRows={5}
        empty={<></>}
      >
        {pr && (
          <>
            <Card className="mb-3">
              <DetailFieldGrid>
                <DetailField label="Project">
                  {pr.project?.code} — {pr.project?.name}
                </DetailField>
                <DetailField label="Indent">
                  {pr.materialRequest?.indentNumber || '—'}
                </DetailField>
                {pr.pmName && <DetailField label="PM name">{pr.pmName}</DetailField>}
                {(pr.requestDate || pr.indentDate) && (
                  <DetailField label="Request date">
                    {formatDate(pr.requestDate || pr.indentDate)}
                  </DetailField>
                )}
                {pr.requestedBy && (
                  <DetailField label="Requested by">{pr.requestedBy}</DetailField>
                )}
                <DetailField label="Total value">
                  {formatCurrency(pr.totalValue ?? pr.amountEstimate)}
                </DetailField>
                {pr.pmRemarks && (
                  <DetailField label="PM remarks" fullWidth valueClassName="text-sm font-normal">
                    {pr.pmRemarks}
                  </DetailField>
                )}
                {hasRecommendation && (
                  <div className="w-full basis-full rounded-lg bg-surface-muted/60 px-3 py-2 text-sm">
                    <p className="text-xs text-ink-muted">Executive recommendation</p>
                    <p className="font-medium">
                      {pr.executiveRecommendation === 'BRANCH_TRANSFER'
                        ? 'Recommend branch transfer'
                        : 'Create purchase order'}
                    </p>
                    {pr.executiveRecommendationRemark && (
                      <p className="text-xs text-ink-secondary mt-1">
                        {pr.executiveRecommendationRemark}
                      </p>
                    )}
                  </div>
                )}
              </DetailFieldGrid>
            </Card>

            <h2 className="section-label mb-3">Materials requested</h2>
            <Card className="overflow-hidden p-0 mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/50">
                    <th className="text-left px-3 py-2 font-semibold text-ink-muted">Item</th>
                    <th className="text-right px-3 py-2 font-semibold text-ink-muted w-24">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(pr.items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-surface-border/60">
                      <td className="px-3 py-2">{item.materialName}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.quantityRequested} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {canDecide && (
              <Card className="space-y-3 mb-3">
                <h2 className="font-semibold text-ink">Procurement decision</h2>
                <p className="text-sm text-ink-secondary">
                  Prepare your recommendation — this does not final-approve the request.
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="flex items-start gap-3 rounded-xl border border-surface-border p-3 cursor-pointer hover:border-bekem-accent/40">
                    <input
                      type="radio"
                      name="exec-pr-method"
                      checked={method === 'PURCHASE_ORDER'}
                      onChange={() => setMethod('PURCHASE_ORDER')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-ink">Create RFQ (purchase order path)</p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        Invite vendors, compare quotes, then raise PO from the winning vendor
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-surface-border p-3 cursor-pointer hover:border-bekem-accent/40">
                    <input
                      type="radio"
                      name="exec-pr-method"
                      checked={method === 'BRANCH_TRANSFER'}
                      onChange={() => setMethod('BRANCH_TRANSFER')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-ink">Recommend branch transfer</p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        Suggest fulfilling from another project&apos;s stock
                      </p>
                    </div>
                  </label>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted mb-1 block">Remark</label>
                  <Textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Optional notes for Coordinator"
                    rows={3}
                  />
                </div>
                <Button
                  variant="accent"
                  accentColor={accent}
                  size="lg"
                  className="w-full"
                  disabled={executiveDecide.isPending}
                  onClick={() => executiveDecide.mutate()}
                >
                  {executiveDecide.isPending
                    ? 'Saving…'
                    : method === 'PURCHASE_ORDER'
                      ? 'Record & create RFQ'
                      : 'Recommend branch transfer'}
                </Button>
              </Card>
            )}

            {!canDecide &&
              pr.executiveRecommendation === 'PURCHASE_ORDER' &&
              pr.status === 'OPEN' && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    variant="accent"
                    accentColor={accent}
                    size="lg"
                    onClick={() => navigate(`/executive/rfq/new?purchaseRequestId=${pr.id}`)}
                  >
                    Create RFQ
                  </Button>
                </div>
              )}

            <h2 className="section-label mb-3">Status history</h2>
            <Card className="mb-3">
              <StatusTimeline entityType="PurchaseRequest" entityId={pr.id} />
            </Card>
            {(pr.materialRequestId || pr.materialRequest?.id) && (
              <>
                <h2 className="section-label mb-3">Indent status history</h2>
                <Card className="mb-3">
                  <StatusTimeline
                    entityType="MaterialRequest"
                    entityId={(pr.materialRequestId || pr.materialRequest?.id)!}
                  />
                </Card>
              </>
            )}
          </>
        )}
      </ListQueryBoundary>
    </div>
  );
}
