import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { formatCurrency } from '@afios/shared';
import type { PurchaseOrderDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { AgeingBadge, daysSince } from '@/components/ui/AgeingBadge';
import { PoEmailStatusChip } from '@/components/PoEmailStatusChip';
import { WorkflowStatusTabs, type WorkflowStatusTab } from '@/components/WorkflowStatusTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface POQueuePageProps {
  title: string;
  subtitle: string;
  queue: 'coordinator' | 'chairman' | 'pm';
  detailPrefix: '/coordinator' | '/chairman' | '/pm';
  queryKey: string;
  mobileDetailPath?: (id: string) => string;
}

export function POQueuePage({
  title,
  subtitle,
  queue,
  detailPrefix,
  queryKey,
  mobileDetailPath,
}: POQueuePageProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as WorkflowStatusTab) || 'pending';

  const openPo = (id: string) => {
    if (mobileDetailPath && typeof window !== 'undefined' && window.innerWidth < 768) {
      navigate(mobileDetailPath(id));
      return;
    }
    navigate(`${detailPrefix}/po/${id}`);
  };

  const { data: items, list } = useListQuery({
    queryKey: [queryKey, tab],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[]; meta?: { count: number } }>(
        '/purchase-orders',
        {
          params: { queue, tab },
        }
      );
      return {
        items: normalizeListData<PurchaseOrderDto>(res.data.data),
        count: res.data.meta?.count ?? normalizeListData<PurchaseOrderDto>(res.data.data).length,
      };
    },
    select: (result) => result,
  });

  const pending = items?.count ?? items?.items?.length ?? 0;
  const rows = items?.items ?? [];

  return (
    <div className="page-container max-w-full">
      <PageHeader title={title} subtitle={subtitle} />

      {queue === 'pm' && (
        <WorkflowStatusTabs value={tab} onChange={(t) => setParams({ tab: t })} />
      )}

      <ActionCard
        title="Pending verification"
        count={pending}
        subtitle={pending > 0 ? 'Awaiting your review' : 'Queue clear'}
        icon={ClipboardCheck}
        tone="primary"
        className="mb-4"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!rows.length}
        empty={
          <EmptyState
            celebrate
            title="No purchase orders pending"
            description="New POs will appear here when they need your action."
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
                <th>Age</th>
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
                  onClick={() => openPo(po.id)}
                >
                  <td className="cell-code whitespace-nowrap">
                    <div>{po.procurementRef || po.poNumber || 'Draft PO'}</div>
                    {po.procurementRef && po.poNumber && (
                      <div className="text-xs text-ink-muted">{po.poNumber}</div>
                    )}
                    {po.approvedAsChairmanOverride && (
                      <span className="text-[10px] font-bold uppercase text-amber-700">
                        Chairman override
                      </span>
                    )}
                  </td>
                  <td className="cell-text">{po.vendor?.name || '—'}</td>
                  <td className="num tabular-nums whitespace-nowrap">{formatCurrency(po.amount)}</td>
                  <td>
                    <AgeingBadge days={daysSince(po.createdAt)} />
                  </td>
                  <td>
                    <StatusBadge status={po.status} />
                  </td>
                  <td>
                    {po.status === 'APPROVED' ? (
                      <PoEmailStatusChip status={po.emailStatus} sentAt={po.emailSentAt} />
                    ) : (
                      '—'
                    )}
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
