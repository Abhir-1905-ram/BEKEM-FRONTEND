import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
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
    <div className="px-4 pt-4 pb-6 max-w-3xl">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/pm')}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-semibold text-gray-900">Purchase requests</h1>
          <p className="text-xs text-gray-500">Sent to executive for PO creation</p>
        </div>
      </header>

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
        <div className="space-y-2">
          {(requests ?? []).map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:shadow-card-hover"
              onClick={() => navigate(`/requests/${r.id}`)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{r.material?.name}</p>
                  <p className="text-xs text-gray-500">{r.indentNumber}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status} />
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
