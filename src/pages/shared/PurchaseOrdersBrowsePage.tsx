import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@afios/shared';
import type { PurchaseOrderDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { WorkflowStatusTabs, type WorkflowStatusTab } from '@/components/WorkflowStatusTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PoEmailStatusChip } from '@/components/PoEmailStatusChip';

interface PurchaseOrdersBrowsePageProps {
  title?: string;
  subtitle?: string;
  detailPath: (id: string) => string;
}

function matchesBrowseTab(po: PurchaseOrderDto, tab: WorkflowStatusTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'pending') {
    return [
      'DRAFT',
      'PENDING_REVIEW',
      'PM_PENDING',
      'COORDINATOR_PENDING',
      'CHAIRMAN_PENDING',
      'PENDING_APPROVAL',
    ].includes(po.status);
  }
  if (tab === 'approved') return po.status === 'APPROVED';
  if (tab === 'completed') {
    return po.status === 'APPROVED' && po.fulfillmentStatus === 'closed_complete';
  }
  return true;
}

export function PurchaseOrdersBrowsePage({
  title = 'Purchase orders',
  subtitle = 'View purchase orders for your projects',
  detailPath,
}: PurchaseOrdersBrowsePageProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as WorkflowStatusTab) || 'all';

  const { data: items, list } = useListQuery({
    queryKey: ['purchase-orders-browse', tab],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[] }>('/purchase-orders');
      return normalizeListData<PurchaseOrderDto>(res.data.data);
    },
  });

  const rows = (items ?? []).filter((po) => matchesBrowseTab(po, tab));

  return (
    <div className="page-container max-w-full">
      <PageHeader title={title} subtitle={subtitle} />

      <WorkflowStatusTabs value={tab} onChange={(t) => setParams({ tab: t })} />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!rows.length}
        skeletonRows={3}
        empty={
          <EmptyState
            title="No purchase orders"
            description="POs created by Executive will appear here for visibility."
          />
        }
      >
        <div className="table-shell">
          <table className="data-table min-w-[56rem]">
            <thead>
              <tr>
                <th>PO / Ref</th>
                <th>Vendor</th>
                <th className="num">Amount</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Email</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((po) => (
                <tr
                  key={po.id}
                  className="cursor-pointer"
                  onClick={() => navigate(detailPath(po.id))}
                >
                  <td className="cell-code whitespace-nowrap">{po.draftRef || po.poNumber}</td>
                  <td className="cell-text whitespace-nowrap">{po.vendor?.name || '—'}</td>
                  <td className="num tabular-nums whitespace-nowrap">{formatCurrency(po.amount)}</td>
                  <td className="whitespace-nowrap">
                    {po.createdAt ? formatDate(po.createdAt) : '—'}
                  </td>
                  <td>
                    <StatusBadge status={po.status} />
                  </td>
                  <td>
                    <PoEmailStatusChip status={po.emailStatus} />
                  </td>
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
