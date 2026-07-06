import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { cn } from '@/lib/utils';
import { WorkflowStatusTabs, type WorkflowStatusTab } from '@/components/WorkflowStatusTabs';

export function StorePendingRequestsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as WorkflowStatusTab) || 'pending';

  const { data: pendingRequests, list } = useListQuery({
    queryKey: ['store-pending-requests', tab],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { tab },
      });
      return normalizeListData<MaterialRequestDto>(res.data.data);
    },
  });

  return (
    <div className="px-4 pt-4 pb-6">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/store')}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-gray-900">Material requests</h1>
      </header>

      <WorkflowStatusTabs value={tab} onChange={(t) => setParams({ tab: t })} />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!pendingRequests?.length}
        skeletonRows={3}
        empty={
          <EmptyState
            title="No pending requests"
            description="New site indents will appear here for allocation."
          />
        }
      >
        <div className="space-y-2">
          {(pendingRequests ?? []).map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:shadow-card-hover transition-shadow"
              onClick={() => navigate(`/store/allocate/${r.id}`)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{r.indentNumber}</p>
                  {r.purpose ? (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.purpose}</p>
                  ) : null}
                </div>
                <ChevronRight className={cn('h-5 w-5 text-gray-300 shrink-0')} />
              </div>            </Card>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
