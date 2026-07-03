import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { formatCurrency } from '@afios/shared';
import type { PurchaseOrderDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionCard } from '@/components/ui/ActionCard';
import { EmptyState } from '@/components/EmptyState';
import { AgeingBadge, daysSince } from '@/components/ui/AgeingBadge';

interface POQueuePageProps {
  title: string;
  subtitle: string;
  queue: 'coordinator' | 'chairman' | 'pm';
  detailPrefix: '/coordinator' | '/chairman' | '/pm';
  queryKey: string;
}

export function POQueuePage({ title, subtitle, queue, detailPrefix, queryKey }: POQueuePageProps) {
  const navigate = useNavigate();

  const { data: items, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[] }>('/purchase-orders', {
        params: { queue },
      });
      return res.data.data;
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

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface-muted animate-pulse" />
          ))}
        </div>
      ) : !items?.length ? (
        <EmptyState
          celebrate
          title="No purchase orders pending"
          description="New POs will appear here when they need your action."
        />
      ) : (
        <div className="space-y-2">
          {items.map((po) => (
            <button
              key={po.id}
              type="button"
              className="data-row w-full text-left"
              onClick={() => navigate(`${detailPrefix}/po/${po.id}`)}
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{po.poNumber || 'Draft PO'}</p>
                <p className="text-sm text-ink-secondary mt-0.5">
                  {po.vendor?.name} · {formatCurrency(po.amount)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <AgeingBadge days={daysSince(po.createdAt)} />
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
