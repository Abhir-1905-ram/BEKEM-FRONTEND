import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { MaterialIndentsTable } from '@/components/MaterialIndentsTable';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

export function MyRequestsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab') || 'pending';
  const tab = rawTab === 'approved' ? 'pending' : rawTab;

  const { data: requests, list } = useListQuery({
    queryKey: ['material-requests', tab],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { tab },
      });
      return normalizeListData<MaterialRequestDto>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-full px-4 pt-6">
      <h1 className="text-xl font-bold text-ink mb-4">My requests</h1>

      <div className="flex gap-1 bg-surface-muted rounded-lg p-1 mb-4 w-full sm:w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParams({ tab: t.key })}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-md whitespace-nowrap transition-colors',
              tab === t.key ? 'bg-white text-ink border border-surface-border' : 'text-ink-secondary hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!requests?.length}
        skeletonRows={3}
        empty={
          <EmptyState
            title={
              tab === 'pending'
                ? 'No pending requests'
                : tab === 'rejected'
                  ? 'No rejected requests'
                  : tab === 'completed'
                    ? 'No completed requests yet'
                    : 'No requests yet'
            }
            description="You're all caught up."
          />
        }
      >
        <MaterialIndentsTable
          requests={requests ?? []}
          onRowClick={(id) => navigate(`/requests/${id}`)}
        />
      </ListQueryBoundary>
    </div>
  );
}
