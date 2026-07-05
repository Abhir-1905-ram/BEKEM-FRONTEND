import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { formatCurrency } from '@afios/shared';
import type { PurchaseOrderDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { AgeingBadge, daysSince } from '@/components/ui/AgeingBadge';
import { PoEmailStatusChip } from '@/components/PoEmailStatusChip';

interface POQueuePageProps {
  title: string;
  subtitle: string;
  queue: 'coordinator' | 'chairman' | 'pm';
  detailPrefix: '/coordinator' | '/chairman' | '/pm';
  queryKey: string;
}

export function POQueuePage({ title, subtitle, queue, detailPrefix, queryKey }: POQueuePageProps) {
  const navigate = useNavigate();

  const { data: items, list } = useListQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[] }>('/purchase-orders', {
        params: { queue },
      });
      return normalizeListData<PurchaseOrderDto>(res.data.data);
    },
  });

  const pending = items?.length ?? 0;

  return (
    <div className="page-container max-w-4xl">
      <PageHeader title={title} subtitle={subtitle} />

      <ActionCard
        title="Pending verification"
        count={pending}
        subtitle={pending > 0 ? 'Awaiting your review' : 'Queue clear'}
        icon={ClipboardCheck}
        tone="primary"
        className="mb-8"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!items?.length}
        empty={
          <EmptyState
            celebrate
            title="No purchase orders pending"
            description="New POs will appear here when they need your action."
          />
        }
      >
        <div className="space-y-2">
          {(items ?? []).map((po) => (
            <button
              key={po.id}
              type="button"
              className="data-row w-full text-left"
              onClick={() => navigate(`${detailPrefix}/po/${po.id}`)}
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {po.procurementRef || po.poNumber || 'Draft PO'}
                </p>
                <p className="text-sm text-ink-secondary mt-0.5">
                  {po.vendor?.name} · {formatCurrency(po.amount)}
                  {po.procurementRef && po.poNumber ? ` · ${po.poNumber}` : ''}
                </p>
                {po.approvedAsChairmanOverride && (
                  <span className="text-[10px] font-bold uppercase text-amber-700 mt-1 inline-block">
                    Approved in Chairman&apos;s absence
                  </span>
                )}
                {po.status === 'APPROVED' && (
                  <div className="mt-1">
                    <PoEmailStatusChip status={po.emailStatus} sentAt={po.emailSentAt} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <AgeingBadge days={daysSince(po.createdAt)} />
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </div>
            </button>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
