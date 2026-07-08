import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { WorkflowStatusTabs, type WorkflowStatusTab } from '@/components/WorkflowStatusTabs';
import { MaterialIndentsTable } from '@/components/MaterialIndentsTable';

export function StorePendingRequestsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as WorkflowStatusTab) || 'all';

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
      <header className="flex items-center gap-3 mb-3">
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
        <MaterialIndentsTable
          requests={pendingRequests ?? []}
          onRowClick={(id) => navigate(tab === 'pending' ? `/store/allocate/${id}` : `/requests/${id}`)}
        />
      </ListQueryBoundary>
    </div>
  );
}
