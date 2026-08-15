import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { PageHeader } from '@/components/layout/PageHeader';
import { PmDailyCapBanner } from '@/components/PmDailyCapBanner';
import { MaterialIndentsTable } from '@/components/MaterialIndentsTable';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

export function PMApprovalsPage() {
  const navigate = useNavigate();

  const { data: requests, list } = useListQuery({
    queryKey: ['pm-approvals'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { status: 'FORWARDED_TO_PM' },
      });
      return normalizeListData<MaterialRequestDto>(res.data.data).filter((r) => !r.escalatedToHo);
    },
  });

  return (
    <div className="page-container max-w-full">
      <PageHeader
        title="Indent approvals"
        subtitle="Review stock across your projects — forward to Head Office, request branch transfer, or reject"
      />

      <PmDailyCapBanner />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!requests?.length}
        skeletonRows={3}
        empty={<EmptyState title="No pending approvals" description="You're all caught up." />}
      >
        <MaterialIndentsTable
          requests={requests ?? []}
          onRowClick={(id) => navigate(`/requests/${id}`)}
        />
      </ListQueryBoundary>
    </div>
  );
}
