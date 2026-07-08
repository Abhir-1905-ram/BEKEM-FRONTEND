import { useNavigate } from 'react-router-dom';
import { ChevronRight, HardHat } from 'lucide-react';
import { formatCurrency } from '@afios/shared';
import type { WorkOrderDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { AgeingBadge, daysSince } from '@/components/ui/AgeingBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface WOQueuePageProps {
  title: string;
  subtitle: string;
  queue: 'pm' | 'executive' | 'coordinator' | 'chairman';
  detailPrefix: '/pm' | '/executive' | '/coordinator' | '/chairman' | '/work-orders';
  queryKey: string;
}

export function WOQueuePage({ title, subtitle, queue, detailPrefix, queryKey }: WOQueuePageProps) {
  const navigate = useNavigate();

  const { data: items, list } = useListQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await api.get<{ data: WorkOrderDto[] }>('/work-orders', {
        params: { queue },
      });
      return normalizeListData<WorkOrderDto>(res.data.data);
    },
  });

  const pending = items?.length ?? 0;
  const detailPath = detailPrefix === '/work-orders' ? '/work-orders' : `${detailPrefix}/wo`;

  return (
    <div className="page-container max-w-full">
      <PageHeader title={title} subtitle={subtitle} />

      <ActionCard
        title="Pending review"
        count={pending}
        subtitle={pending > 0 ? 'Awaiting your review' : 'Queue clear'}
        icon={HardHat}
        tone="info"
        className="mb-4"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!items?.length}
        empty={
          <EmptyState
            celebrate
            title="No work orders pending"
            description="Work orders will appear here when they need your sign-off."
          />
        }
      >
        <div className="table-shell">
          <table className="data-table min-w-[52rem]">
            <thead>
              <tr>
                <th>WO No</th>
                <th>Vendor</th>
                <th>Scope</th>
                <th className="num">Value</th>
                <th>Age</th>
                <th>Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((wo) => (
                <tr
                  key={wo.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`${detailPath}/${wo.id}`)}
                >
                  <td className="cell-code whitespace-nowrap">{wo.woNumber}</td>
                  <td className="cell-text">{wo.vendor?.name || '—'}</td>
                  <td className="cell-text max-w-[14rem] truncate">{wo.scope || '—'}</td>
                  <td className="num tabular-nums whitespace-nowrap">
                    {formatCurrency(wo.contractValue)}
                  </td>
                  <td>
                    <AgeingBadge days={daysSince(wo.createdAt)} />
                  </td>
                  <td>
                    <StatusBadge status={wo.status} />
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
