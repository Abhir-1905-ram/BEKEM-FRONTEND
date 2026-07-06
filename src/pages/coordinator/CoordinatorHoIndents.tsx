import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { toast } from 'sonner';

export function CoordinatorHoIndentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: indents, ...list } = useQuery({
    queryKey: ['ho-indents', 'coordinator'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests/ho-indents', {
        params: { status: 'HO_PENDING_COORDINATOR' },
      });
      return res.data.data ?? [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (indentId: string) => {
      const res = await api.post<{ data: { rfqId: string; rfqNumber: string } }>(
        `/material-requests/ho-indents/${indentId}/coordinator-approve`
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`RFQ ${data.rfqNumber} generated`);
      queryClient.invalidateQueries({ queryKey: ['ho-indents'] });
      navigate(`/rfqs/${data.rfqId}`);
    },
    onError: () => toast.error('Approval failed'),
  });

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="HO indent approvals"
        subtitle="Approve Executive indents to generate RFQs"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        retrying={list.isFetching && !list.isLoading}
        isEmpty={!indents?.length}
        skeletonRows={3}
        empty={
          <EmptyState
            celebrate
            title="No HO indents pending"
            description="Executive-generated indents awaiting your approval will appear here."
          />
        }
      >
        <div className="space-y-2">
          {(indents ?? []).map((r) => (
            <div key={r.id} className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{r.indentNumber}</p>
                <p className="text-sm text-ink-secondary mt-0.5">
                  {r.material?.name || r.items?.[0]?.material?.name} · {r.project?.code}
                </p>
                <div className="mt-2">
                  <StatusBadge status={r.status} />
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate(r.id)}
              >
                <CheckCircle className="h-4 w-4" />
                Approve &amp; generate RFQ
              </Button>
            </div>
          ))}
        </div>
      </ListQueryBoundary>

      <button
        type="button"
        onClick={() => navigate('/coordinator/material-indents')}
        className="mt-8 text-sm font-semibold text-bekem-accent hover:underline flex items-center gap-1"
      >
        View all HO indents
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
