import { useNavigate } from 'react-router-dom';
import { ChevronRight, Star, Plus } from 'lucide-react';
import { UserRole } from '@afios/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { VendorDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

export function VendorsListPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user)?.role as UserRole;

  const { data: vendors, list } = useListQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await api.get<{ data: VendorDto[] }>('/vendors');
      return normalizeListData<VendorDto>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="Vendors"
        subtitle="Supplier scorecards and performance history"
        action={
          role === UserRole.EXECUTIVE ? (
            <button
              type="button"
              onClick={() => navigate('/executive/vendors/new')}
              className="inline-flex items-center gap-2 rounded-xl bg-bekem-navy text-white px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Add vendor
            </button>
          ) : undefined
        }
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!vendors?.length}
        skeletonRows={6}
        empty={<EmptyState title="No vendors" description="Vendors will appear here once seeded." />}
      >
        <div className="space-y-2">
          {(vendors ?? []).map((v) => (
            <div
              key={v.id}
              className="data-row"
              onClick={() => navigate(`/vendors/${v.id}`)}
            >
              <div>
                <p className="font-medium text-sm text-ink">{v.name}</p>
                <p className="text-xs text-ink-secondary">{v.category}</p>
              </div>
              <div className="flex items-center gap-2 text-bekem-accent font-semibold text-sm">
                <Star className="h-4 w-4 fill-current" />
                {v.rating.toFixed(1)}
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </div>
            </div>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
