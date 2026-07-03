import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight, AlertTriangle, Warehouse, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { getGreeting, getFirstName } from '@afios/shared';
import type { MaterialRequestDto, SiteDto } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { TodayPanel } from '@/components/layout/TodayPanel';
import { useTodayActions } from '@/hooks/useTodayActions';
import { AgeingBadge, daysSince } from '@/components/ui/AgeingBadge';
import { Input } from '@/components/ui/Input';

export function StoreHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const [stockSearch, setStockSearch] = useState('');
  const { data: today, isLoading: todayLoading } = useTodayActions();

  const { data: site } = useQuery({
    queryKey: ['my-site'],
    queryFn: async () => {
      const res = await api.get<{ data: SiteDto }>('/sites/my');
      return res.data.data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: async () => {
      const res = await api.get<{
        data: { waiting: number; stockItems: number; lowStock: number; incoming: number };
      }>(`/stock/site/${site?.id}/summary`);
      return res.data.data;
    },
    enabled: !!site?.id,
  });

  const { data: pendingRequests } = useQuery({
    queryKey: ['store-pending-requests'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests', {
        params: { tab: 'pending' },
      });
      return res.data.data;
    },
  });

  const { data: stock } = useQuery({
    queryKey: ['stock', site?.id],
    queryFn: async () => {
      const res = await api.get<{
        data: Array<{
          id: string;
          materialId: string;
          quantityOnHand: number;
          quantityReserved: number;
          availableQty: number;
          lowStockThreshold: number;
          isLowStock: boolean;
          material: { name: string; unit: string; code: string; description?: string; grade?: string };
        }>;
      }>(`/stock/site/${site?.id}`);
      return res.data.data;
    },
    enabled: !!site?.id,
  });

  const filteredStock = stock?.filter((s) => {
    if (!stockSearch.trim()) return true;
    const q = stockSearch.toLowerCase();
    return (
      s.material.name.toLowerCase().includes(q) ||
      s.material.code.toLowerCase().includes(q) ||
      (s.material.grade || '').toLowerCase().includes(q) ||
      (s.material.description || '').toLowerCase().includes(q)
    );
  });

  const waiting = summary?.waiting || pendingRequests?.length || 0;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow={getGreeting()}
        title={getFirstName(user.name)}
        subtitle={`Inventory coordinator · ${site?.chainageLabel || 'Loading site…'}`}
        action={
          waiting > 0 ? (
            <Button onClick={() => navigate('/store/requests')}>
              <Package className="h-4 w-4" />
              Review {waiting} request{waiting !== 1 ? 's' : ''}
            </Button>
          ) : undefined
        }
      />

      <TodayPanel actions={today ?? []} loading={todayLoading} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Waiting" value={summary?.waiting ?? '—'} hint="Needs allocation" tone="amber" />
        <StatCard
          label="Stock items"
          value={summary?.stockItems ?? '—'}
          tone="store"
          icon={<Warehouse className="h-5 w-5" />}
          onClick={() => navigate('/store/stock')}
        />
        <StatCard
          label="Low stock"
          value={summary?.lowStock ?? '—'}
          hint="Below threshold"
          tone="rose"
        />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider">Existing stock</h2>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
            placeholder="Search item code, description, grade…"
            className="pl-10"
          />
        </div>
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted/50">
                <th className="text-left px-3 py-2 font-semibold text-ink-muted">Code</th>
                <th className="text-left px-3 py-2 font-semibold text-ink-muted">Description</th>
                <th className="text-right px-3 py-2 font-semibold text-ink-muted">Available</th>
                <th className="text-right px-3 py-2 font-semibold text-ink-muted">Reserved</th>
              </tr>
            </thead>
            <tbody>
              {filteredStock?.slice(0, 8).map((s) => (
                <tr key={s.id} className="border-b border-surface-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{s.material.code}</td>
                  <td className="px-3 py-2">{s.material.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {s.availableQty ?? s.quantityOnHand} {s.material.unit}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-muted">
                    {s.quantityReserved || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">Pending indents</h2>
          <button
            onClick={() => navigate('/store/stock')}
            className="text-sm font-medium text-bekem-navy hover:underline"
          >
            View stock
          </button>
        </div>

        {!pendingRequests?.length ? (
          <EmptyState
            title="You're all caught up"
            description="No requests waiting for store action right now."
          />
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((r) => {
              const itemCount = r.itemCount || r.items?.length || 1;
              const firstLabel =
                r.items?.[0]?.material?.name || r.material?.name || '';

              return (
                <div
                  key={r.id}
                  className="data-row"
                  onClick={() => navigate(`/store/allocate/${r.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{r.indentNumber}</p>
                    <p className="text-sm text-ink-secondary">
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                      {firstLabel ? ` · ${firstLabel}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <AgeingBadge days={daysSince(r.createdAt)} />
                    <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(summary?.lowStock ?? 0) > 0 && (
        <div className="mt-6 rounded-card border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900 font-medium">
            {summary?.lowStock} material{summary?.lowStock !== 1 ? 's' : ''} below threshold
          </p>
        </div>
      )}
    </div>
  );
}
