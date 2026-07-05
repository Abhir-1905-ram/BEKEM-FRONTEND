import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatDate, type MaterialRequestDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

function lineSummary(mr: MaterialRequestDto) {
  if (mr.items?.length) {
    const first = mr.items[0];
    const name = first.material?.name || 'Material';
    const extra = mr.items.length > 1 ? ` +${mr.items.length - 1} more` : '';
    return `${name}${extra}`;
  }
  return mr.material?.name || 'Material';
}

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
    <div className="page-container max-w-lg">
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
        <div className="space-y-2">
          {(indents ?? []).map((mr) => (
            <button
              key={mr.id}
              type="button"
              onClick={() => navigate(`/requests/${mr.id}`)}
              className="panel w-full p-4 text-left hover:border-bekem-accent/40 transition-colors"
            >
              <div className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{mr.indentNumber}</p>
                  <p className="text-sm text-ink-secondary mt-0.5 truncate">{lineSummary(mr)}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    {mr.requester?.name || 'Site'} · {formatDate(mr.updatedAt)}
                  </p>
                </div>
                <StatusBadge status={mr.status} />
              </div>
            </button>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
