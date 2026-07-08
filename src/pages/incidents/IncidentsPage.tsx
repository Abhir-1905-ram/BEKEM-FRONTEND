import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { MaterialRequestDto } from '@afios/shared';
import { UserRole } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/EmptyState';
import { normalizeListData } from '@/hooks/useListQuery';
import { cn } from '@/lib/utils';
import { MaterialIndentsTable } from '@/components/MaterialIndentsTable';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
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
  const rawTab = params.get('tab') || 'pending';
  const tab = rawTab === 'approved' ? 'pending' : rawTab;
  const isSite = role === UserRole.SITE_INCHARGE;

  if (rawTab === 'approved') {
    return <Navigate to={`${location.pathname}?tab=pending`} replace />;
  }

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
    <div className="page-container max-w-full">
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
      <p className="text-xs text-ink-muted -mt-2 mb-3">Material indents raised from your site</p>

      {!isSite && pendingCount > 0 && tab === 'all' && !isError && (
        <div className="mb-3 rounded-lg border border-warning/30 bg-warning-light px-3 py-2.5 flex items-center gap-3">
          <FileText className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm font-medium text-ink">
            {pendingCount} indent{pendingCount > 1 ? 's' : ''} awaiting action
          </p>
        </div>
      )}

      <div className="flex gap-1 bg-surface-muted rounded-lg p-1 mb-3 w-full sm:w-fit overflow-x-auto">
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
        <MaterialIndentsTable
          requests={requests ?? []}
          onRowClick={(id) => navigate(`/requests/${id}`)}
        />
      )}
    </div>
  );
}
