import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@afios/shared';
import type { MaterialRequestDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'pending', label: 'Waiting' },
  { key: 'approved', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

export function MyRequestsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'pending';

  const { data: requests, isLoading } = useQuery({
    queryKey: ['material-requests', tab],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { tab },
      });
      return res.data.data;
    },
  });

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">My requests</h1>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ tab: t.key })}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : !requests?.length ? (
        <EmptyState
          title={
            tab === 'pending'
              ? 'No pending requests'
              : tab === 'approved'
              ? 'No in-progress requests'
              : tab === 'completed'
              ? 'No completed requests yet'
              : 'No rejected requests'
          }
          description="You're all caught up."
        />
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:shadow-card-hover transition-shadow"
              onClick={() => navigate(`/requests/${r.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{r.material?.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {r.quantityRequested} {r.material?.unit}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{r.indentNumber}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.purpose}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={r.status} />
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Required: {formatDate(r.requiredByDate)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
