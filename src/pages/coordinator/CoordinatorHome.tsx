import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, HardHat } from 'lucide-react';
import { getGreeting } from '@afios/shared';
import type { PurchaseOrderDto, WorkOrderDto } from '@afios/shared';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { TodayPanel } from '@/components/layout/TodayPanel';
import { DashboardSearch } from '@/components/layout/DashboardSearch';
import { useTodayActions } from '@/hooks/useTodayActions';

export function CoordinatorHomePage() {
  const navigate = useNavigate();
  const { data: today, isLoading: todayLoading } = useTodayActions();

  const { data: queue } = useQuery({
    queryKey: ['po-queue-coordinator'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[] }>('/purchase-orders', {
        params: { queue: 'coordinator' },
      });
      return res.data.data;
    },
  });

  const { data: woQueue } = useQuery({
    queryKey: ['wo-queue-coordinator'],
    queryFn: async () => {
      const res = await api.get<{ data: WorkOrderDto[] }>('/work-orders', {
        params: { queue: 'coordinator' },
      });
      return res.data.data;
    },
  });

  const pending = queue?.length ?? 0;
  const woPending = woQueue?.length ?? 0;
  const totalPending = pending + woPending;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow={getGreeting()}
        title="Today's approvals"
        subtitle="Final approval for purchase orders and work orders"
      />

      <DashboardSearch placeholder="Search POs, work orders, indents…" />

      <TodayPanel actions={today ?? []} loading={todayLoading} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 lg:mb-10">
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
    </div>
  );
}
