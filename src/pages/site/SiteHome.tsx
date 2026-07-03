import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight, Bell, Clock, Loader, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { getGreeting, getFirstName } from '@afios/shared';
import type { MaterialRequestDto, SiteDto, NotificationDto } from '@afios/shared';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { ActionCard } from '@/components/ui/ActionCard';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { TodayPanel } from '@/components/layout/TodayPanel';
import { useTodayActions } from '@/hooks/useTodayActions';

export function SiteHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const { data: today, isLoading: todayLoading } = useTodayActions();

  const { data: site, isLoading: siteLoading } = useQuery({
    queryKey: ['my-site'],
    queryFn: async () => {
      const res = await api.get<{ data: SiteDto & { project: { code: string; name: string } } }>(
        '/sites/my'
      );
      return res.data.data;
    },
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['material-requests'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests');
      return res.data.data;
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ data: NotificationDto[] }>('/notifications');
      return res.data.data;
    },
  });

  const pending = requests?.filter((r) => r.status === 'PENDING_STORE').length || 0;
  const inProgress =
    requests?.filter((r) => ['ALLOCATED', 'FORWARDED_TO_PM', 'PM_APPROVED'].includes(r.status))
      .length || 0;
  const completed =
    requests?.filter((r) => ['COMPLETED', 'CLOSED'].includes(r.status))
      .length || 0;
  const pendingTotal = pending + inProgress;
  const unread = notifications?.filter((n) => !n.isRead).length || 0;
  const recent = requests?.slice(0, 5) || [];

  if (siteLoading || requestsLoading) return <DashboardSkeleton />;

  return (
    <div className="page-container">
      <section className="mb-8 lg:mb-10">
        <div className="rounded-3xl border border-surface-border bg-white shadow-card overflow-hidden">
          <div className="bg-gradient-to-br from-bekem-navy to-bekem-navy-light px-8 py-8 lg:py-10 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              {getGreeting()}
            </p>
            <h1 className="text-2xl lg:text-3xl font-semibold mt-2 text-white">
              {getFirstName(user.name)}
            </h1>
            {site && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
                  Project
                </p>
                <p className="text-lg font-semibold mt-1">{site.project?.name}</p>
                <p className="text-sm text-white/60 mt-0.5">
                  {site.project?.code}
                  {site.chainageLabel ? ` · ${site.chainageLabel}` : ''}
                </p>
              </div>
            )}
          </div>

          <div className="p-6 lg:p-8 space-y-4">
            <ActionCard
              title="Request material"
              subtitle="Create a new indent for your site"
              icon={Package}
              tone="success"
              featured
              onClick={() => navigate('/request/new')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ActionCard
                title="Pending requests"
                subtitle={pendingTotal > 0 ? 'Awaiting store or approval' : 'Nothing in queue'}
                count={pendingTotal}
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
          </div>
        </div>
      </section>

      <TodayPanel actions={today ?? []} loading={todayLoading} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 lg:mb-10">
        <ActionCard
          title="Waiting at store"
          count={pending}
          icon={Clock}
          tone="warning"
          onClick={() => navigate('/requests?tab=pending')}
        />
        <ActionCard
          title="In progress"
          count={inProgress}
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

        {recent.length === 0 ? (
          <EmptyState
            celebrate
            title="No pending requests"
            description="Everything is completed. Create a new indent when you need materials."
          />
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <div key={r.id} className="data-row" onClick={() => navigate(`/requests/${r.id}`)}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink truncate">{r.material?.name || 'Material'}</p>
                  <p className="text-sm text-ink-secondary mt-0.5">
                    {r.quantityRequested} {r.material?.unit} · {r.indentNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status} />
                  <ChevronRight className="h-4 w-4 text-ink-muted" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}