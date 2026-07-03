import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, FileText, HardHat, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { getGreeting, getFirstName } from '@afios/shared';
import type { ProjectDto, MaterialRequestDto, WorkOrderDto } from '@afios/shared';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { TodayPanel } from '@/components/layout/TodayPanel';
import { DashboardSearch } from '@/components/layout/DashboardSearch';
import { MaterialSearch } from '@/components/layout/MaterialSearch';
import { useTodayActions } from '@/hooks/useTodayActions';
import { cn } from '@/lib/utils';

export function PMHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const { data: today, isLoading: todayLoading } = useTodayActions();

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get<{ data: ProjectDto[] }>('/projects');
      return res.data.data;
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = projects?.find((p) => p.id === (selectedId || projects[0]?.id)) || projects?.[0];

  const { data: pendingApprovals } = useQuery({
    queryKey: ['pm-requests', selected?.id],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { status: 'FORWARDED_TO_PM', projectId: selected?.id },
      });
      return res.data.data;
    },
    enabled: !!selected,
  });

  const { data: purchaseReady } = useQuery({
    queryKey: ['pm-purchase-requests', selected?.id],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { status: 'PURCHASE_REQUESTED', projectId: selected?.id },
      });
      return res.data.data;
    },
    enabled: !!selected,
  });

  const { data: activeWorkOrders } = useQuery({
    queryKey: ['pm-work-orders', selected?.id],
    queryFn: async () => {
      const res = await api.get<{ data: WorkOrderDto[] }>('/work-orders', {
        params: { queue: 'pm', projectId: selected?.id },
      });
      return res.data.data;
    },
    enabled: !!selected,
  });

  const approvalCount = pendingApprovals?.length ?? 0;
  const purchaseCount = purchaseReady?.length ?? 0;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow={getGreeting()}
        title={getFirstName(user.name)}
        subtitle="What needs your attention on site today"
      />

      <DashboardSearch placeholder="Search indents, materials, work orders…" />

      <TodayPanel actions={today ?? []} loading={todayLoading} />

      {projects && projects.length > 1 && (
        <div className="mb-6">
          <p className="section-label mb-3">Active project</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  'shrink-0 rounded-xl px-4 py-2.5 text-left border text-sm font-medium transition-all',
                  selected?.id === p.id
                    ? 'border-pm bg-pm-light text-pm shadow-sm'
                    : 'border-surface-border bg-white text-ink-secondary hover:border-pm/30'
                )}
              >
                <span className="font-semibold">{p.code}</span>
                <span className="block text-xs opacity-70 truncate max-w-[140px]">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="mb-8 rounded-3xl border border-surface-border bg-white p-5 lg:p-6 shadow-card">
          <p className="font-semibold text-lg text-ink">{selected.name}</p>
          <p className="text-sm text-ink-secondary mt-1">
            Health {selected.healthScore}% · Budget{' '}
            {Math.round((selected.budgetSpent / selected.budgetTotal) * 100)}% deployed
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 lg:mb-10">
        <ActionCard
          title="Material approvals"
          count={approvalCount}
          subtitle="Forwarded from store"
          icon={ClipboardCheck}
          tone="warning"
          onClick={() => navigate('/pm/approvals')}
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
          title="Active work orders"
          count={activeWorkOrders?.length ?? 0}
          subtitle="Track progress & milestones"
          icon={HardHat}
          tone="primary"
          onClick={() =>
            activeWorkOrders?.[0]
              ? navigate(`/work-orders/${activeWorkOrders[0].id}`)
              : undefined
          }
        />
      </div>

      <MaterialSearch />

      {(activeWorkOrders?.length ?? 0) > 0 && (
        <div className="mb-8 lg:mb-10">
          <h2 className="section-label mb-4">Work order progress</h2>
          <div className="space-y-2">
            {activeWorkOrders?.map((wo) => (
              <div
                key={wo.id}
                className="data-row"
                onClick={() => navigate(`/work-orders/${wo.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{wo.woNumber}</p>
                  <p className="text-sm text-ink-secondary truncate mt-0.5">{wo.scope}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    {wo.completedQuantity}/{wo.totalQuantity} {wo.quantityUnit} · {wo.progressPercent}%
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {approvalCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-label">Pending approvals</h2>
            <button
              onClick={() => navigate('/pm/approvals')}
              className="text-sm font-semibold text-bekem-accent hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {pendingApprovals?.slice(0, 5).map((r) => (
              <div key={r.id} className="data-row" onClick={() => navigate(`/requests/${r.id}`)}>
                <div>
                  <p className="font-semibold text-ink">{r.material?.name}</p>
                  <p className="text-sm text-ink-secondary mt-0.5">{r.indentNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <ChevronRight className="h-4 w-4 text-ink-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
