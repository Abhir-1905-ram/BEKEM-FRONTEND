import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, FileText, Bell, ChevronRight, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { getGreeting, getFirstName } from '@afios/shared';
import type { PmDashboardDto } from '@afios/shared';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { PmDailyCapBanner } from '@/components/PmDailyCapBanner';
import { TodayPanel } from '@/components/layout/TodayPanel';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useTodayActions } from '@/hooks/useTodayActions';

export function PMHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const { data: today, isLoading: todayLoading } = useTodayActions();

  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError: dashboardError,
    refetch: refetchDashboard,
    isFetching: dashboardFetching,
  } = useQuery({
    queryKey: ['pm-dashboard'],
    queryFn: async () => {
      const res = await api.get<{ data: PmDashboardDto }>('/dashboard/pm');
      return res.data.data;
    },
  });

  const { data: poQueue } = useQuery({
    queryKey: ['wo-queue-pm', 'po-count'],
    queryFn: async () => {
      const res = await api.get<{ data: unknown[] }>('/purchase-orders', { params: { queue: 'pm' } });
      return res.data.data ?? [];
    },
  });

  const approvalCount = dashboard?.approveQueue.length ?? 0;
  const purchaseCount = dashboard?.purchaseRequests.length ?? 0;
  const poApprovalCount = poQueue?.length ?? 0;
  const pendingCount = dashboard?.pendingRequests.length ?? 0;
  const unread = dashboard?.notifications.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow={getGreeting()}
        title={getFirstName(user.name)}
        subtitle="Material requests and approvals for your project"
      />

      <TodayPanel actions={today ?? []} loading={todayLoading} />

      <PmDailyCapBanner cap={dashboard?.dailyCap} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 lg:mb-8">
        <ActionCard
          title="Pending material requests"
          count={pendingCount}
          subtitle="Raised by site, awaiting store"
          icon={FileText}
          tone="primary"
          onClick={() => navigate('/requests')}
        />
        <ActionCard
          title="Approve requests"
          count={approvalCount}
          subtitle="Forwarded from store"
          icon={ClipboardCheck}
          tone="warning"
          onClick={() => navigate('/pm/approvals')}
        />
        <ActionCard
          title="Approve POs (under ₹5k)"
          count={poApprovalCount}
          subtitle="Low-value purchase orders"
          icon={ShoppingCart}
          tone="info"
          onClick={() => navigate('/pm/approve-pos')}
        />
        <ActionCard
          title="Purchase requests"
          count={purchaseCount}
          subtitle="With executive for PO"
          icon={FileText}
          tone="success"
          onClick={() => navigate('/pm/purchase-requests')}
        />
        <ActionCard
          title="Notifications"
          count={unread}
          subtitle="Alerts and updates"
          icon={Bell}
          tone="primary"
          onClick={() => navigate('/notifications')}
        />
      </div>

      <ListQueryBoundary
        isLoading={dashboardLoading}
        isError={dashboardError}
        onRetry={() => refetchDashboard()}
        retrying={dashboardFetching && !dashboardLoading}
        skeletonRows={4}
        empty={<></>}
      >
      {approvalCount > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-label">Approve requests</h2>
            <button
              onClick={() => navigate('/pm/approvals')}
              className="text-sm font-semibold text-bekem-accent hover:underline"
            >
              View all
            </button>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Indent</th>
                  <th>Material</th>
                  <th>Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {dashboard?.approveQueue.slice(0, 5).map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/requests/${r.id}`)}
                  >
                    <td className="font-semibold">{r.indentNumber}</td>
                    <td className="text-ink-secondary">
                      {r.material?.name || r.items?.[0]?.material?.name}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="text-right">
                      <ChevronRight className="h-4 w-4 text-ink-muted inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      </ListQueryBoundary>
    </div>
  );
}
