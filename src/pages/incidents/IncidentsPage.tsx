import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { MaterialRequestDto } from '@afios/shared';
import { UserRole, formatDate } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

export function IncidentsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const role = user.role as UserRole;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'all';
  const isSite = role === UserRole.SITE_INCHARGE;

  const { data: requests, isLoading } = useQuery({
    queryKey: ['material-requests', 'indents', tab],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: tab === 'all' ? {} : { tab },
      });
      return res.data.data;
    },
  });

  const pendingCount =
    requests?.filter((r) => ['PENDING_STORE', 'FORWARDED_TO_PM'].includes(r.status)).length ?? 0;

  return (
    <div className="page-container max-w-4xl">
      <PageHeader
        title="Material indents"
        subtitle={
          isSite
            ? 'Your material requests raised from site'
            : 'Site incharge material requests across projects'
        }
        action={
          isSite ? (
            <Button variant="primary" onClick={() => navigate('/request/new')}>
              New indent
            </Button>
          ) : undefined
        }
      />

      {!isSite && pendingCount > 0 && tab === 'all' && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning-light px-5 py-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm font-medium text-ink">
            {pendingCount} indent{pendingCount > 1 ? 's' : ''} awaiting action
          </p>
        </div>
      )}

      <div className="flex gap-1 bg-surface-muted rounded-xl p-1 mb-6 w-full sm:w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParams(t.key === 'all' ? {} : { tab: t.key })}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-all',
              tab === t.key ? 'bg-white text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-surface-muted animate-pulse" />
          ))}
        </div>
      ) : !requests?.length ? (
        <EmptyState
          title="No material indents"
          description={
            isSite
              ? 'Raise a material indent when your site needs supplies.'
              : 'Site teams have not raised any indents in this view.'
          }
        />
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate(`/requests/${r.id}`)}
              className="data-row w-full text-left"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {r.indentNumber}
                  {r.material?.name ? ` — ${r.material.name}` : ''}
                </p>
                <p className="text-sm text-ink-secondary mt-0.5 line-clamp-1">{r.purpose}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {r.project?.code}
                  {r.site?.name ? ` · ${r.site.name}` : ''} · {formatDate(r.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={r.status} />
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
