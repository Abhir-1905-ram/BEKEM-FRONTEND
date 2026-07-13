import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto } from '@afios/shared';
import { UserRole } from '@afios/shared';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { WorkflowStatusTabs, type WorkflowStatusTab } from '@/components/WorkflowStatusTabs';
import { MaterialIndentsTable } from '@/components/MaterialIndentsTable';
import { IndentListFilters, IndentQueueQuickButtons } from '@/components/IndentListFilters';
import {
  filterMaterialIndents,
  getIndentQueueFiltersForRole,
  isIndentQueueFilterId,
  uniqueIndentCategories,
  type IndentDaysFilter,
  type IndentQueueQuickFilter,
} from '@/lib/indentListFilters';

export function StorePendingRequestsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as WorkflowStatusTab) || 'all';
  const queueOptions = useMemo(() => getIndentQueueFiltersForRole(UserRole.STORE_INCHARGE), []);

  const search = params.get('q') || '';
  const rawQueue = params.get('queue') || '';
  const queue: IndentQueueQuickFilter | '' =
    rawQueue && isIndentQueueFilterId(rawQueue) ? rawQueue : '';
  const category = params.get('category') || '';
  const days = (params.get('days') as IndentDaysFilter) || '';

  const [localSearch, setLocalSearch] = useState(search);
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const patchParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  };

  const { data: pendingRequests, list } = useListQuery({
    queryKey: ['store-pending-requests', tab],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { tab },
      });
      return normalizeListData<MaterialRequestDto>(res.data.data);
    },
  });

  const categories = useMemo(
    () => uniqueIndentCategories(pendingRequests ?? []),
    [pendingRequests]
  );
  const filtered = useMemo(
    () =>
      filterMaterialIndents(pendingRequests ?? [], {
        search,
        queue,
        category,
        days,
      }),
    [pendingRequests, search, queue, category, days]
  );

  const setSearch = (value: string) => {
    setLocalSearch(value);
    patchParams({ q: value.trim() || undefined });
  };

  return (
    <div className="px-4 pt-4 pb-6">
      <header className="flex flex-col gap-2 mb-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/store')}
            className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100 shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-2">
              <h1 className="font-semibold text-gray-900 shrink-0">Pending indents</h1>
              <IndentQueueQuickButtons
                value={queue}
                options={queueOptions}
                onChange={(next) => {
                  patchParams({
                    queue: next || undefined,
                    tab: next ? 'pending' : tab,
                  });
                }}
              />
            </div>
            <p className="text-xs text-ink-secondary mt-0.5">
              Material requests awaiting store / project / HO action
            </p>
          </div>
        </div>
      </header>

      <WorkflowStatusTabs
        value={tab}
        onChange={(t) =>
          patchParams({
            tab: t,
          })
        }
      />

      {!list.isLoading && !list.isError && (
        <IndentListFilters
          search={localSearch}
          onSearchChange={setSearch}
          queue={queue}
          onQueueChange={(next) => patchParams({ queue: next || undefined })}
          queueOptions={queueOptions}
          category={category}
          onCategoryChange={(next) => patchParams({ category: next || undefined })}
          categories={categories}
          days={days}
          onDaysChange={(next) => patchParams({ days: next || undefined })}
          resultCount={filtered.length}
          totalCount={pendingRequests?.length ?? 0}
        />
      )}

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!pendingRequests?.length}
        skeletonRows={3}
        empty={
          <EmptyState
            title="No pending requests"
            description="New site indents will appear here for allocation."
          />
        }
      >
        {!filtered.length ? (
          <EmptyState
            title="No matching indents"
            description="Try another search, clear filters, or pick a different status chip."
          />
        ) : (
          <MaterialIndentsTable
            requests={filtered}
            onRowClick={(id) => {
              const row = filtered.find((r) => r.id === id);
              navigate(
                row?.status === 'PENDING_STORE' ? `/store/allocate/${id}` : `/requests/${id}`
              );
            }}
          />
        )}
      </ListQueryBoundary>
    </div>
  );
}
