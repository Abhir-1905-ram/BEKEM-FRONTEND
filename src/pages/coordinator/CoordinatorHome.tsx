import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, HardHat } from 'lucide-react';
import { getGreeting } from '@afios/shared';
import type { PurchaseOrderDto, WorkOrderDto } from '@afios/shared';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { TodayPanel } from '@/components/layout/TodayPanel';
import { DashboardSearch } from '@/components/layout/DashboardSearch';
import { DashboardWidgetCards } from '@/components/DashboardWidgetCards';
import { useTodayActions } from '@/hooks/useTodayActions';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

export function CoordinatorHomePage() {
  const navigate = useNavigate();
  const { data: today, isLoading: todayLoading } = useTodayActions();

  const { data: widgets, isLoading: widgetsLoading } = useQuery({
    queryKey: ['dashboard-widgets'],
    queryFn: async () => {
      const res = await api.get<{ data: import('@afios/shared').DashboardWidgetsDto }>(
        '/dashboard/widgets'
      );
      return res.data.data;
    },
  });

  const { data: queueResult, list: queueList } = useListQuery({
    queryKey: ['po-queue-coordinator'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[]; meta?: { count: number } }>(
        '/purchase-orders',
        { params: { queue: 'coordinator' } }
      );
      const items = normalizeListData<PurchaseOrderDto>(res.data.data);
      return {
        items,
        count: res.data.meta?.count ?? items.length,
      };
    },
  });

  const { data: woQueue, list: woQueueList } = useListQuery({
    queryKey: ['wo-queue-coordinator'],
    queryFn: async () => {
      const res = await api.get<{ data: WorkOrderDto[] }>('/work-orders', {
        params: { queue: 'coordinator' },
      });
      return normalizeListData<WorkOrderDto>(res.data.data);
    },
  });

  const queue = queueResult?.items;
  const pending = queueResult?.count ?? queue?.length ?? 0;
  const woPending = woQueue?.length ?? 0;
  const totalPending = pending + woPending;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow={getGreeting()}
        title="Today's approvals"
        subtitle="Final approval for purchase orders and work orders"
      />

      <TodayPanel actions={today ?? []} loading={todayLoading} />

      <DashboardSearch placeholder="Search POs, work orders, indents…" />

      <DashboardWidgetCards widgets={widgets?.widgets} loading={widgetsLoading} />

      <ListQueryBoundary
        isLoading={queueList.isLoading || woQueueList.isLoading}
        isError={queueList.isError || woQueueList.isError}
        onRetry={() => {
          queueList.onRetry();
          woQueueList.onRetry();
        }}
        retrying={queueList.retrying || woQueueList.retrying}
        skeletonRows={2}
        empty={<></>}
      >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 lg:mb-8">
        <ActionCard
          title="Pending PO approval"
          count={pending}
          subtitle={pending > 0 ? 'Awaiting your final approval' : 'Queue clear'}
          icon={ClipboardCheck}
          tone="primary"
          onClick={() => navigate('/coordinator/verify-pos')}
        />
        <ActionCard
          title="Pending work orders"
          count={woPending}
          subtitle={woPending > 0 ? 'WO verification required' : 'Queue clear'}
          icon={HardHat}
          tone="info"
          onClick={() => navigate('/coordinator/verify-wos')}
        />
      </div>

      {totalPending === 0 && (
        <EmptyState
          celebrate
          title="All quiet"
          description="No POs or work orders need verification right now."
        />
      )}
      </ListQueryBoundary>
    </div>
  );
}
