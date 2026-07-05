import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { BranchTransferDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

export function PMBranchTransferRequestsPage() {
  const navigate = useNavigate();

  const { data: transfers, list } = useListQuery({
    queryKey: ['pm-branch-transfer-requests'],
    queryFn: async () => {
      const res = await api.get<{ data: BranchTransferDto[] }>('/branch-transfers');
      return normalizeListData<BranchTransferDto>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-2xl">
      <PageHeader
        title="Branch transfer requests"
        subtitle="Track requests you submitted — approval is handled by Head Office"
        action={
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!transfers?.length}
        skeletonRows={2}
        empty={
          <EmptyState
            title="No branch transfer requests"
            description="Request a transfer from an indent when surplus stock exists in another supervised project."
          />
        }
      >
        <div className="space-y-2">
          {(transfers ?? []).map((t) => (
            <button
              key={t.id}
              type="button"
              className="w-full text-left"
              onClick={() => navigate(`/branch-transfers/${t.id}`)}
            >
              <Card className="hover:border-bekem-accent/40 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{t.transferNumber}</p>
                    <p className="text-sm text-ink-secondary mt-0.5">
                      {t.fromProjectName || t.fromProject} → {t.toProjectName || t.toProject}
                    </p>
                    {t.items?.map((item, i) => (
                      <p key={i} className="text-xs text-ink-muted mt-1">
                        {item.materialName}: {item.quantity}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={t.status} />
                    <ChevronRight className="h-4 w-4 text-ink-muted" />
                  </div>
                </div>
                <p className="text-xs font-medium text-ink-muted mt-3">View status — read only</p>
              </Card>
            </button>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}

/** @deprecated Use PMBranchTransferRequestsPage */
export const PMBranchTransferApprovalsPage = PMBranchTransferRequestsPage;
