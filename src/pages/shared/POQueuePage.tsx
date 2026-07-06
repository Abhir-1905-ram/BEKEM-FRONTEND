import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, ClipboardCheck } from 'lucide-react';import { formatCurrency } from '@afios/shared';
import type { PurchaseOrderDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { AgeingBadge, daysSince } from '@/components/ui/AgeingBadge';
import { PoEmailStatusChip } from '@/components/PoEmailStatusChip';
import { WorkflowStatusTabs, type WorkflowStatusTab } from '@/components/WorkflowStatusTabs';

interface POQueuePageProps {
  title: string;
  subtitle: string;
  queue: 'coordinator' | 'chairman' | 'pm';
  detailPrefix: '/coordinator' | '/chairman' | '/pm';
  queryKey: string;
  mobileDetailPath?: (id: string) => string;
}

export function POQueuePage({
  title,
  subtitle,
  queue,
  detailPrefix,
  queryKey,
  mobileDetailPath,
}: POQueuePageProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as WorkflowStatusTab) || 'pending';

  const openPo = (id: string) => {
    if (mobileDetailPath && typeof window !== 'undefined' && window.innerWidth < 768) {
      navigate(mobileDetailPath(id));
      return;
    }
    navigate(`${detailPrefix}/po/${id}`);
  };

  const { data: items, list } = useListQuery({
    queryKey: [queryKey, tab],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[]; meta?: { count: number } }>(
        '/purchase-orders',
        {
          params: { queue, tab },
        }
      );
      return {
        items: normalizeListData<PurchaseOrderDto>(res.data.data),
        count: res.data.meta?.count ?? normalizeListData<PurchaseOrderDto>(res.data.data).length,
      };
    },
    select: (result) => result,
  });

  const pending = items?.count ?? items?.items?.length ?? 0;
  const rows = items?.items ?? [];

  return (
    <div className="page-container max-w-4xl">
      <PageHeader title={title} subtitle={subtitle} />

      {queue === 'pm' && (
        <WorkflowStatusTabs value={tab} onChange={(t) => setParams({ tab: t })} />
      )}

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
        isEmpty={!rows.length}
        empty={
          <EmptyState
            celebrate
            title="No purchase orders pending"
            description="New POs will appear here when they need your action."
          />
        }
      >
        <div className="space-y-2">
          {(rows ?? []).map((po) => (
            <button
              key={po.id}
              type="button"
              className="data-row w-full text-left"
              onClick={() => openPo(po.id)}
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
