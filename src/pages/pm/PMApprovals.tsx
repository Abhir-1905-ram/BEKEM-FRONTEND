import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { PageHeader } from '@/components/layout/PageHeader';
import { PmDailyCapBanner } from '@/components/PmDailyCapBanner';
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
    <div className="page-container max-w-3xl">
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
        <div className="space-y-2">
          {(requests ?? []).map((r) => (
            <button
              key={r.id}
              type="button"
              className="w-full text-left"
              onClick={() => navigate(`/requests/${r.id}`)}
            >
              <Card className="hover:border-bekem-accent/40 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{r.indentNumber}</p>
                    <p className="text-sm text-ink-secondary mt-0.5">
                      {r.material?.name ||
                        (r.items?.length
                          ? `${r.items[0].material?.name || 'Material'}${
                              r.items.length > 1 ? ` +${r.items.length - 1} more` : ''
                            }`
                          : 'Material')}
                    </p>
                    <p className="text-xs text-ink-muted mt-1 line-clamp-2">{r.purpose || '—'}</p>
                    <p className="text-xs text-ink-secondary mt-1">
                      {r.quantityRequested} {r.material?.unit || r.items?.[0]?.unit || ''}
                      {r.project?.code ? ` · ${r.project.code}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.status} />
                    <ChevronRight className="h-4 w-4 text-ink-muted" />
                  </div>
                </div>
                <p className="text-xs font-medium text-bekem-accent mt-3">Open to review & approve →</p>
              </Card>
            </button>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
