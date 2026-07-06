import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight, Bell, Clock, Loader, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { getGreeting, getFirstName } from '@afios/shared';
import type { MaterialRequestDto, SiteDto, NotificationDto } from '@afios/shared';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { ActionCard } from '@/components/ui/ActionCard';
import { TodayPanel } from '@/components/layout/TodayPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { useTodayActions } from '@/hooks/useTodayActions';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

export function SiteHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const { data: today, isLoading: todayLoading } = useTodayActions();

  const { data: site } = useQuery({
    queryKey: ['my-site'],
    queryFn: async () => {
      const res = await api.get<{ data: SiteDto & { project: { code: string; name: string } } }>(
        '/sites/my'
      );
      return res.data.data;
    },
  });

  const { data: requests, list: requestsList } = useListQuery({
    queryKey: ['material-requests'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests');
      return normalizeListData<MaterialRequestDto>(res.data.data);
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ data: NotificationDto[] }>('/notifications');
      return res.data.data ?? [];
    },
  });

  const pending = requests?.filter((r) => r.status === 'PENDING_STORE').length || 0;
  const approved =
    requests?.filter((r) =>
      [
        'ALLOCATED',
        'FORWARDED_TO_PM',
        'PM_APPROVED',
        'PURCHASE_REQUESTED',
        'PENDING_HO',
        'PO_CREATED',
        'COORDINATOR_VERIFIED',
        'CHAIRMAN_APPROVED',
      ].includes(r.status)
    ).length || 0;
  const completed =
    requests?.filter((r) => ['MATERIAL_RECEIVED', 'ISSUED', 'COMPLETED', 'CLOSED'].includes(r.status))
      .length || 0;
  const unread = notifications?.filter((n) => !n.isRead).length || 0;
  const recent = requests?.slice(0, 5) || [];

  return (
    <div className="page-container">
      <PageHeader
        eyebrow={getGreeting()}
        title={getFirstName(user.name)}
        subtitle={
          site
            ? `${site.project?.name} · ${site.project?.code}${site.chainageLabel ? ` · ${site.chainageLabel}` : ''}`
            : 'Site material requests and indents'
        }
      />

      <TodayPanel actions={today ?? []} loading={todayLoading} />

      <section className="mb-6 lg:mb-8">
        <ActionCard
          title="Request material"
          subtitle="Create a new indent for your site"
          icon={Package}
          tone="primary"
          featured
          onClick={() => navigate('/request/new')}
        />
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <ActionCard
            title="Pending requests"
            subtitle={pending > 0 ? 'Awaiting store verification' : 'Nothing in queue'}
            count={pending}
            icon={Clock}
            tone="warning"
            onClick={() => navigate('/requests?tab=pending')}
          />
          <ActionCard
            title="Notifications"
            subtitle={unread > 0 ? 'Unread updates' : 'All caught up'}
            count={unread}
            icon={Bell}
            tone="info"
            onClick={() => navigate('/notifications')}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 lg:mb-8">
        <ActionCard
          title="Waiting at store"
          count={pending}
          icon={Clock}
          tone="warning"
          onClick={() => navigate('/requests?tab=pending')}
        />
        <ActionCard
          title="Approved"
          count={approved}
          icon={Loader}
          tone="info"
          onClick={() => navigate('/requests?tab=approved')}
        />
        <ActionCard
          title="Completed"
          count={completed}
          icon={CheckCircle2}
          tone="success"
          onClick={() => navigate('/requests?tab=completed')}
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-label">Recent requests</h2>
          <button
            onClick={() => navigate('/requests')}
            className="text-sm font-semibold text-bekem-accent hover:underline"
          >
            View all
          </button>
        </div>

        <ListQueryBoundary
          isLoading={requestsList.isLoading}
          isError={requestsList.isError}
          onRetry={requestsList.onRetry}
          retrying={requestsList.retrying}
          isEmpty={recent.length === 0}
          skeletonRows={4}
          empty={
            <EmptyState
              celebrate
              title="No pending requests"
              description="Everything is completed. Create a new indent when you need materials."
            />
          }
        >
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Indent</th>
                  <th>Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/requests/${r.id}`)}
                  >
                    <td>
                      <p className="font-semibold">{r.material?.name || 'Material'}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        {r.quantityRequested} {r.material?.unit}
                      </p>
                    </td>
                    <td className="text-ink-secondary">{r.indentNumber}</td>
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
        </ListQueryBoundary>
      </section>
    </div>
  );
}
