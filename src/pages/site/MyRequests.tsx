import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'pending', label: 'Waiting' },
  { key: 'approved', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

export function MyRequestsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'pending';

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
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">My requests</h1>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ tab: t.key })}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
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
                : tab === 'approved'
                ? 'No in-progress requests'
                : tab === 'completed'
                ? 'No completed requests yet'
                : 'No rejected requests'
            }
            description="You're all caught up."
          />
        }
      >
        <div className="space-y-2">
          {(requests ?? []).map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:shadow-card-hover transition-shadow"
              onClick={() => navigate(`/requests/${r.id}`)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{r.indentNumber}</p>
                  {r.purpose ? (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.purpose}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status} />
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>            </Card>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
