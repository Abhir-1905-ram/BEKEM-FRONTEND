import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@afios/shared';
import type { ProcurementDecisionListItemDto } from '@afios/shared';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

interface ProcurementDecisionsListPageProps {
  basePath: string;
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function ProcurementDecisionsListPage({
  basePath,
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
}: ProcurementDecisionsListPageProps) {
  const navigate = useNavigate();

  const { data: decisions, list } = useListQuery({
    queryKey: ['procurement-decisions', basePath],
    queryFn: async () => {
      const res = await api.get<{ data: ProcurementDecisionListItemDto[] }>('/procurement-decisions');
      return normalizeListData<ProcurementDecisionListItemDto>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-2xl">
      <PageHeader
        title={title}
        subtitle={subtitle}
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
        isEmpty={!decisions?.length}
        skeletonRows={3}
        empty={<EmptyState title={emptyTitle} description={emptyDescription} />}
      >
        <div className="space-y-2">
          {(decisions ?? []).map((d) => (
            <button
              key={d.id}
              type="button"
              className="w-full text-left"
              onClick={() => navigate(`${basePath}/${d.id}`)}
            >
              <Card className="hover:border-bekem-accent/40 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{d.indentNumber}</p>
                    <p className="text-sm text-ink-secondary mt-0.5">
                      {d.projectCode} — {d.projectName}
                    </p>
                    {d.purpose && (
                      <p className="text-xs text-ink-muted mt-1 line-clamp-2">{d.purpose}</p>
                    )}
                    <p className="text-xs text-ink-muted mt-1">
                      {d.indentDate ? formatDate(d.indentDate) : '—'} ·{' '}
                      {formatCurrency(d.estimatedValue)}
                      {d.priority ? ` · ${d.priority} priority` : ''}
                    </p>
                    {d.prNumber && (
                      <p className="text-xs text-ink-muted mt-0.5">PR {d.prNumber}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={d.status} />
                    <ChevronRight className="h-4 w-4 text-ink-muted" />
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
