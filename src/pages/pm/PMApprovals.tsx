import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';

export function PMApprovalsPage() {
  const navigate = useNavigate();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['pm-approvals'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { status: 'FORWARDED_TO_PM' },
      });
      return res.data.data;
    },
  });

  return (
    <div className="page-container max-w-2xl">
      <PageHeader
        title="Indent approvals"
        subtitle="Open an indent to review details, then approve or reject"
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

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : !requests?.length ? (
        <EmptyState title="No pending approvals" description="You're all caught up." />
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
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
      )}
    </div>
  );
}
