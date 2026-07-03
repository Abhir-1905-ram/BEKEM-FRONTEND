import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2 } from 'lucide-react';
import { formatCurrency } from '@afios/shared';
import type { ExplorerProjectDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { EmptyState } from '@/components/EmptyState';

export function ExplorerPage() {
  const navigate = useNavigate();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['explorer'],
    queryFn: async () => {
      const res = await api.get<{ data: ExplorerProjectDto[] }>('/dashboard/explorer');
      return res.data.data;
    },
  });

  if (isLoading) return <DashboardSkeleton />;

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

      {!projects?.length ? (
        <EmptyState title="No projects" description="Active projects will appear here." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="panel p-5 hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-store/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-store" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{p.code}</p>
                  <p className="text-sm text-ink-secondary truncate">{p.name}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-ink-muted">Budget deployed</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(p.budgetSpent)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Utilisation</p>
                  <p
                    className={`font-semibold ${p.deployPct > 85 ? 'text-amber-600' : 'text-emerald-600'}`}
                  >
                    {p.deployPct}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Health</p>
                  <p className="font-semibold">{p.healthScore}%</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Sites</p>
                  <p className="font-semibold">{p.siteCount}</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-store rounded-full transition-all"
                  style={{ width: `${Math.min(100, p.deployPct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
