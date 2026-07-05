import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { formatCurrency } from '@afios/shared';
import type { ExplorerProjectDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

function statusTone(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes('track') || lower === 'healthy' || lower === 'on track') {
    return 'bg-emerald-50 text-emerald-700';
  }
  if (lower.includes('watch') || lower.includes('progress')) {
    return 'bg-amber-50 text-amber-700';
  }
  return 'bg-rose-50 text-rose-700';
}

export function ExplorerPage() {
  const navigate = useNavigate();

  const { data: projects, list } = useListQuery({
    queryKey: ['explorer'],
    queryFn: async () => {
      const res = await api.get<{ data: ExplorerProjectDto[] }>('/dashboard/explorer');
      return normalizeListData<ExplorerProjectDto>(res.data.data);
    },
  });

  return (
    <div className="page-container">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <PageHeader
        title="Portfolio explorer"
        subtitle="Cross-project drill-down for leadership and PM"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!projects?.length}
        skeletonRows={6}
        empty={<EmptyState title="No projects" description="Active projects will appear here." />}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(projects ?? []).map((p) => (
            <div key={p.id} className="panel p-5 hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-store/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-store" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink">{p.code}</p>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-secondary">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-sm text-ink-secondary truncate">{p.name}</p>
                  <p className="mt-1 text-xs text-ink-muted truncate">
                    PM: {p.projectManager}
                    {p.storeNames?.length ? ` · ${p.storeNames.join(', ')}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(p.procurementStatus)}`}>
                  {p.procurementStatus}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(p.inventoryHealth)}`}>
                  Inventory: {p.inventoryHealth}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(p.budgetStatus)}`}>
                  Budget: {p.budgetStatus}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-ink-muted">Pending indents</p>
                  <p className="font-semibold tabular-nums">{p.pendingMaterialRequests}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Pending PRs</p>
                  <p className="font-semibold tabular-nums">{p.pendingPurchaseRequests}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Pending POs</p>
                  <p className="font-semibold tabular-nums">{p.pendingPurchaseOrders}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Pending GRNs</p>
                  <p className="font-semibold tabular-nums">{p.pendingGrns}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Branch transfers</p>
                  <p className="font-semibold tabular-nums">{p.pendingBranchTransfers}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Budget deployed</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(p.budgetSpent)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                <span>{p.deployPct}% utilised</span>
                <span>Health {p.healthScore}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-store rounded-full transition-all"
                  style={{ width: `${Math.min(100, p.deployPct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
