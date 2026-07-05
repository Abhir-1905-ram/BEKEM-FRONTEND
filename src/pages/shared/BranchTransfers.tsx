import { useNavigate } from 'react-router-dom';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { ChevronRight, Truck } from 'lucide-react';
import type { BranchTransferDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function BranchTransfersPage() {
  const navigate = useNavigate();

  const { data: transfers, list } = useListQuery({
    queryKey: ['branch-transfers'],
    queryFn: async () => {
      const res = await api.get<{ data: BranchTransferDto[] }>('/branch-transfers');
      return normalizeListData<BranchTransferDto>(res.data.data).filter((t) =>
        ['PM_APPROVED', 'COORDINATOR_DECIDED'].includes(t.status)
      );
    },
  });

  const pending = transfers?.length ?? 0;

  return (
    <div className="page-container max-w-4xl">
      <PageHeader
        title="Branch transfer decisions"
        subtitle="Confirm transfer vs. raise PO — then execute stock movement"
      />

      <ActionCard
        title="Awaiting decision or execution"
        count={pending}
        subtitle={pending > 0 ? 'Review each transfer carefully' : 'Queue clear'}
        icon={Truck}
        tone="info"
        className="mb-8"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!transfers?.length}
        empty={
          <EmptyState
            celebrate
            title="No branch transfers pending"
            description="PM-approved requests appear here for your decision."
          />
        }
      >
        <div className="space-y-2">
          {(transfers ?? []).map((t) => (
            <button
              key={t.id}
              type="button"
              className="data-row w-full text-left"
              onClick={() => navigate(`/branch-transfers/${t.id}`)}
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{t.transferNumber}</p>
                <p className="text-sm text-ink-secondary mt-0.5">
                  {t.fromProjectName || t.fromProject} → {t.toProjectName || t.toProject}
                </p>
                {t.items?.map((item, i) => (
                  <p key={i} className="text-xs text-ink-muted mt-0.5">
                    {item.materialName}: {item.quantity}
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={t.status} />
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </div>
            </button>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
