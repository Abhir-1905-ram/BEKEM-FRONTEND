import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

export function StorePendingRequestsPage() {
  const navigate = useNavigate();

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['store-pending-requests'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { tab: 'pending' },
      });
      return res.data.data;
    },
  });

  return (
    <div className="px-4 pt-4 pb-6">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/store')}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-gray-900">Pending requests</h1>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : !pendingRequests?.length ? (
        <EmptyState
          title="No pending requests"
          description="New site indents will appear here for allocation."
        />
      ) : (
        <div className="space-y-2">
          {pendingRequests.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:shadow-card-hover transition-shadow"
              onClick={() => navigate(`/store/allocate/${r.id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{r.material?.name}</p>
                  <p className="text-sm text-gray-500">
                    {r.quantityRequested} {r.material?.unit} · {r.indentNumber}
                  </p>
                </div>
                <ChevronRight className={cn('h-5 w-5 text-gray-300 shrink-0')} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
