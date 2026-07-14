import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate, ROLE_LABELS, type UserRole } from '@afios/shared';
import type { PurchaseRequestDto } from '@afios/shared';
import { api } from '@/lib/api';
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

function prStatusLabel(pr: PurchaseRequestDto) {
  if (pr.pendingWith && pr.pendingWith in ROLE_LABELS) {
    return `Pending at ${ROLE_LABELS[pr.pendingWith as UserRole]}`;
  }
  return undefined;
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
    <div className="page-container max-w-full">
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
        <div className="table-shell">
          <table className="data-table min-w-[72rem]">
            <thead>
              <tr>
                <th>PR No</th>
                <th>Project</th>
                <th>PM</th>
                <th className="num">Value</th>
                <th>Requested</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Materials</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {(requests ?? []).map((pr) => (
                <tr
                  key={pr.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/executive/purchase-requests/${pr.id}`)}
                >
                  <td className="cell-code whitespace-nowrap">{pr.prNumber}</td>
                  <td className="cell-text whitespace-nowrap">{pr.project?.code} — {pr.project?.name}</td>
                  <td className="cell-text whitespace-nowrap">{pr.pmName || '—'}</td>
                  <td className="num tabular-nums whitespace-nowrap">{formatCurrency(pr.totalValue ?? pr.amountEstimate)}</td>
                  <td className="whitespace-nowrap">{pr.requestDate ? formatDate(pr.requestDate) : '—'}</td>
                  <td className="whitespace-nowrap">{priorityLabel(pr.priority)}</td>
                  <td><StatusBadge status={pr.status} label={prStatusLabel(pr)} /></td>
                  <td className="cell-text">{pr.materialsSummary || pr.pmRemarks || '—'}</td>
                  <td className="text-right">
                    <ChevronRight className="h-4 w-4 text-ink-muted inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListQueryBoundary>
    </div>
  );
}
