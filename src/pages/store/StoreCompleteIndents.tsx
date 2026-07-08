import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { MaterialIndentsTable } from '@/components/MaterialIndentsTable';

export function StoreCompleteIndentsPage() {
  const navigate = useNavigate();

  const { data: indents, list } = useListQuery({
    queryKey: ['store-completed-indents'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { tab: 'completed' },
      });
      return normalizeListData<MaterialRequestDto>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-full">
      <PageHeader
        title="Complete indents"
        subtitle="Indents fully issued and confirmed by site — closed loop complete"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!indents?.length}
        skeletonRows={3}
        empty={
          <EmptyState
            title="No completed indents yet"
            description="Indents appear here after site confirms receipt of issued materials."
          />
        }
      >
        <MaterialIndentsTable
          requests={indents ?? []}
          onRowClick={(id) => navigate(`/requests/${id}`)}
        />
      </ListQueryBoundary>
    </div>
  );
}
