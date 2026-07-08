import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { PageHeader } from '@/components/layout/PageHeader';
import { MaterialIndentsTable } from '@/components/MaterialIndentsTable';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

/** Purchase requests created from PM-approved indents (auto-created on approval). */
export function PMPurchaseRequestsPage() {
  const navigate = useNavigate();

  const { data: requests, list } = useListQuery({
    queryKey: ['pm-purchase-requests'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { status: 'PURCHASE_REQUESTED' },
      });
      return normalizeListData<MaterialRequestDto>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-full">
      <PageHeader
        title="Purchase requests"
        subtitle="Sent to executive for PO creation"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!requests?.length}
        skeletonRows={2}
        empty={
          <EmptyState
            title="No purchase requests yet"
            description="When you approve an indent, a purchase request is created automatically for the executive."
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
