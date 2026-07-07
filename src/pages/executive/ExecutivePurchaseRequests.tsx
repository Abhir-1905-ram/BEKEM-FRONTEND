import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@afios/shared';
import type { PurchaseRequestDto } from '@afios/shared';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { WorkflowStatusTabs, type WorkflowStatusTab } from '@/components/WorkflowStatusTabs';

function priorityLabel(priority?: string) {
  if (priority === 'HIGH') return 'High';
  if (priority === 'MEDIUM') return 'Medium';
  return 'Normal';
}

export function ExecutivePurchaseRequestsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as WorkflowStatusTab) || 'pending';

  const { data: requests, list } = useListQuery({
    queryKey: ['executive-purchase-requests', tab],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseRequestDto[]; meta?: { count: number } }>(
        '/purchase-requests',
        {
          params: tab === 'pending'
            ? { queue: 'pending-po', readyForPo: 'true' }
            : { tab },
        }
      );
      return normalizeListData<PurchaseRequestDto>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="Purchase requests"
        subtitle="PM-forwarded indents — create RFQ, compare vendors, then PO"
        action={
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      />

      <WorkflowStatusTabs value={tab} onChange={(t) => setParams({ tab: t })} />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!requests?.length}
        skeletonRows={3}
        empty={
          <EmptyState
            title="No purchase requests pending"
            description="When a PM forwards an indent to Head Office and a purchase request is created, it will appear here."
          />
        }
      >
        <div className="space-y-3">
          {(requests ?? []).map((pr) => (
            <button
              key={pr.id}
              type="button"
              className="w-full text-left"
              onClick={() => {
                if (pr.executiveRecommendation === 'PURCHASE_ORDER') {
                  navigate(`/executive/rfq/new?purchaseRequestId=${pr.id}`);
                } else {
                  navigate(`/executive/purchase-requests/${pr.id}`);
                }
              }}
            >
              <Card className="hover:border-bekem-accent/40 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{pr.prNumber}</p>
                      <StatusBadge status={pr.status} />
                      {pr.priority && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                          {priorityLabel(pr.priority)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-secondary">
                      {pr.project?.code} — {pr.project?.name}
                    </p>
                    {pr.pmName && (
                      <p className="text-xs text-ink-muted">
                        <span className="font-semibold">PM:</span> {pr.pmName}
                      </p>
                    )}
                    {pr.materialsSummary && (
                      <p className="text-xs text-ink-secondary line-clamp-2">
                        <span className="font-semibold text-ink-muted">Materials:</span>{' '}
                        {pr.materialsSummary}
                      </p>
                    )}
                    {pr.pmRemarks && (
                      <p className="text-xs text-ink-secondary line-clamp-2">
                        <span className="font-semibold text-ink-muted">PM remarks:</span>{' '}
                        {pr.pmRemarks}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                      <span>
                        <span className="font-semibold">Value:</span>{' '}
                        {formatCurrency(pr.totalValue ?? pr.amountEstimate)}
                      </span>
                      {pr.requestDate && (
                        <span>
                          <span className="font-semibold">Requested:</span>{' '}
                          {formatDate(pr.requestDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-muted shrink-0 mt-1" />
                </div>
              </Card>
            </button>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
