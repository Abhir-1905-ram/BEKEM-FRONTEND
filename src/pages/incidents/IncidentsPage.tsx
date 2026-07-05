import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { MaterialRequestDto } from '@afios/shared';
import { UserRole, formatDate } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { normalizeListData } from '@/hooks/useListQuery';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

function subtitleForRole(role: UserRole): string {
  switch (role) {
    case UserRole.SITE_INCHARGE:
      return 'Your material requests raised from site';
    case UserRole.PROJECT_MANAGER:
      return 'Material indents across your assigned projects';
    case UserRole.STORE_INCHARGE:
      return 'Material indents for your store and project';
    case UserRole.EXECUTIVE:
      return 'Company-wide material indents from all sites';
    case UserRole.COORDINATOR:
      return 'All site material indents — head office view';
    case UserRole.CHAIRMAN:
      return 'Company-wide indent register';
    default:
      return 'Material indents across projects';
  }
}

export function IncidentsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const role = user.role as UserRole;
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const tab = params.get('tab') || 'all';
  const isSite = role === UserRole.SITE_INCHARGE;

  if (role === UserRole.PROJECT_MANAGER && location.pathname === '/incidents') {
    return <Navigate to="/pm/material-indents" replace />;
  }
  if (role === UserRole.EXECUTIVE && location.pathname === '/incidents') {
    return <Navigate to="/executive/material-indents" replace />;
  }
  if (role === UserRole.COORDINATOR && location.pathname === '/incidents') {
    return <Navigate to="/coordinator/material-indents" replace />;
  }

  const { data: requests, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['material-requests', 'indents', tab, role],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: tab === 'all' ? {} : { tab },
      });
      return normalizeListData<MaterialRequestDto>(res.data.data);
    },
    retry: 1,
  });

  const pendingCount =
    requests?.filter((r) => ['PENDING_STORE', 'FORWARDED_TO_PM'].includes(r.status)).length ?? 0;

  const errorMessage =
    isError && error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
      : null;

  return (
    <div className="page-container max-w-4xl">
      <PageHeader
        title="Material indents"
        subtitle={subtitleForRole(role)}
        action={
          isSite ? (
            <Button variant="primary" onClick={() => navigate('/request/new')}>
              New indent
            </Button>
          ) : undefined
        }
      />

      {!isSite && pendingCount > 0 && tab === 'all' && !isError && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning-light px-5 py-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm font-medium text-ink">
            {pendingCount} indent{pendingCount > 1 ? 's' : ''} awaiting action
          </p>
        </div>
      )}

      <div className="flex gap-1 bg-surface-muted rounded-lg p-1 mb-6 w-full sm:w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParams(t.key === 'all' ? {} : { tab: t.key })}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-md whitespace-nowrap transition-colors',
              tab === t.key ? 'bg-white text-ink border border-surface-border' : 'text-ink-secondary hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading || isFetching ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-surface-muted animate-pulse border border-surface-border" />
          ))}
        </div>
      ) : isError ? (
        <div className="panel p-8 text-center">
          <AlertCircle className="h-10 w-10 text-danger mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-ink">Could not load material indents</h2>
          <p className="text-sm text-ink-secondary mt-2 max-w-md mx-auto">
            {errorMessage || 'The server returned an error. Please retry or contact support if this persists.'}
          </p>
          <Button variant="secondary" className="mt-6" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : !requests?.length ? (
        <EmptyState
          title="No material indents"
          description={
            isSite
              ? 'Raise a material indent when your site needs supplies.'
              : 'No indents match this view for your role.'
          }
        />
      ) : (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Indent</th>
                <th>Project</th>
                <th>Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {(requests ?? []).map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/requests/${r.id}`)}
                >
                  <td>
                    <p className="font-semibold">{r.indentNumber}</p>
                    <p className="text-xs text-ink-secondary mt-0.5 line-clamp-1">
                      {r.material?.name || r.purpose || '—'}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">{formatDate(r.createdAt)}</p>
                  </td>
                  <td className="text-ink-secondary">
                    {r.project?.code}
                    {r.site?.name ? ` · ${r.site.name}` : ''}
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
      )}
    </div>
  );
}
