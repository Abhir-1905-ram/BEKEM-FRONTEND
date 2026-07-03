import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, FileText, Users, ClipboardCheck, ChevronRight, HardHat } from 'lucide-react';
import { getGreeting } from '@afios/shared';
import type { PurchaseOrderDto, PurchaseRequestDto, WorkOrderDto } from '@afios/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { TodayPanel } from '@/components/layout/TodayPanel';
import { DashboardSearch } from '@/components/layout/DashboardSearch';
import { useTodayActions } from '@/hooks/useTodayActions';
import { AgeingBadge, daysSince } from '@/components/ui/AgeingBadge';
import { formatCurrency } from '@afios/shared';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function ExecutiveHomePage() {
  const navigate = useNavigate();
  const { data: today, isLoading: todayLoading } = useTodayActions();

  const { data: purchaseRequests } = useQuery({
    queryKey: ['purchase-requests'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseRequestDto[] }>('/purchase-requests');
      return res.data.data;
    },
  });

  const { data: pendingPos } = useQuery({
    queryKey: ['po-queue-executive'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[] }>('/purchase-orders', {
        params: { queue: 'executive' },
      });
      return res.data.data;
    },
  });

  const { data: allPos } = useQuery({
    queryKey: ['purchase-orders-all'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[] }>('/purchase-orders');
      return res.data.data;
    },
  });

  const { data: workOrders } = useQuery({
    queryKey: ['wo-queue-executive'],
    queryFn: async () => {
      const res = await api.get<{ data: WorkOrderDto[] }>('/work-orders', {
        params: { queue: 'executive' },
      });
      return res.data.data;
    },
  });

  const pendingApproval =
    allPos?.filter((po) =>
      ['PENDING_REVIEW', 'PENDING_APPROVAL', 'COORDINATOR_PENDING', 'CHAIRMAN_PENDING'].includes(
        po.status
      )
    ).length ?? 0;

  const openPrs = purchaseRequests?.filter((pr) => pr.status === 'OPEN').length ?? 0;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow={getGreeting()}
        title="Today's procurement"
        subtitle="What needs your attention right now"
        action={
          <Button variant="primary" size="lg" onClick={() => navigate('/executive/po/new')}>
            <ShoppingCart className="h-4 w-4" />
            Create PO
          </Button>
        }
      />

      <DashboardSearch placeholder="Search POs, vendors, work orders, materials…" />

      <TodayPanel actions={today ?? []} loading={todayLoading} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 lg:mb-10">
        <ActionCard
          title="Pending PO"
          count={pendingPos?.length ?? 0}
          subtitle="Drafts and in-progress orders"
          icon={ShoppingCart}
          tone="primary"
          onClick={() => navigate('/executive/po/new')}
        />
        <ActionCard
          title="Pending vendor"
          count={0}
          subtitle="Vendor scorecards"
          icon={Users}
          tone="neutral"
          onClick={() => navigate('/vendors')}
        />
        <ActionCard
          title="Pending RFQ"
          count={openPrs}
          subtitle="Open purchase requests"
          icon={FileText}
          tone="warning"
          onClick={() => navigate('/executive/po/new')}
        />
        <ActionCard
          title="Pending approval"
          count={pendingApproval}
          subtitle="With coordinator or chairman"
          icon={ClipboardCheck}
          tone="info"
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-8" id="work-orders">
        <Button variant="secondary" onClick={() => navigate('/executive/wo/new')}>
          <HardHat className="h-4 w-4" />
          Generate work order
        </Button>
      </div>

      {(workOrders?.length ?? 0) > 0 && (
        <section className="mb-8 lg:mb-10">
          <h2 className="section-label mb-4">Awaiting contractor acceptance</h2>
          <div className="space-y-2">
            {workOrders?.map((wo) => (
              <div
                key={wo.id}
                className="data-row"
                onClick={() => navigate(`/work-orders/${wo.id}`)}
              >
                <div>
                  <p className="font-semibold text-ink">{wo.woNumber}</p>
                  <p className="text-sm text-ink-secondary mt-0.5">
                    {wo.vendor?.name} · {wo.scope}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={wo.status} />
                  <ChevronRight className="h-4 w-4 text-ink-muted" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-label mb-4">Pending purchase orders</h2>
        {!pendingPos?.length ? (
          <EmptyState
            celebrate
            title="No pending POs"
            description="Everything is completed. Create a new PO when a request is ready."
          />
        ) : (
          <div className="space-y-2">
            {pendingPos.map((po) => (
              <div
                key={po.id}
                className="data-row"
                onClick={() => navigate(`/purchase-orders/${po.id}`)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{po.poNumber || 'Draft PO'}</p>
                    <AgeingBadge days={daysSince(po.createdAt)} />
                  </div>
                  <p className="text-sm text-ink-secondary mt-0.5">
                    {po.vendor?.name ?? 'Vendor TBD'} · {formatCurrency(po.amount)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
