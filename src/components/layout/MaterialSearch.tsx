import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { MATERIAL_CATEGORY_NAMES, type MaterialDto } from '@afios/shared';
import { cn } from '@/lib/utils';
import { groupMaterialsByCategory } from '@/lib/groupMaterialsByCategory';

type CatalogMaterial = MaterialDto & {
  stock?: {
    quantityOnHand: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    hasLedger: boolean;
  };
};

interface MaterialSearchProps {
  className?: string;
  onSelect?: (material: MaterialDto) => void;
}

function stockHint(material: CatalogMaterial) {
  const qty = material.stock?.quantityOnHand;
  if (qty == null) return null;
  if (qty > 0) {
    return material.stock?.isLowStock
      ? `Low stock: ${qty} ${material.unit}`
      : `In stock: ${qty} ${material.unit}`;
  }
  return 'Out of stock — procure or branch transfer';
}

export function MaterialSearch({ className, onSelect }: MaterialSearchProps) {
  const [q, setQ] = useState('');
  const trimmed = q.trim();
  const isFiltering = trimmed.length >= 2;

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['materials-catalog', trimmed],
    queryFn: async () => {
      const res = await api.get<{
        data: CatalogMaterial[];
        meta?: { total: number };
      }>('/materials/catalog', {
        params: isFiltering ? { search: trimmed, limit: 200 } : { limit: 100 },
      });
      return res.data;
    },
  });

  const materials = data?.data ?? [];
  const total = data?.meta?.total ?? materials.length;

  const grouped = useMemo(
    () => groupMaterialsByCategory(materials, [...MATERIAL_CATEGORY_NAMES]),
    [materials]
  );

  return (
    <section className={cn('mb-4 lg:mb-5', className)}>
      <h2 className="section-label mb-4">Material lookup</h2>
      <div className="panel p-3 lg:p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, code, grade, or category…"
            className="w-full h-10 pl-10 pr-3 rounded-xl border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-bekem-accent/20"
          />
        </div>

        <p className="text-xs text-ink-muted mt-2 px-0.5">
          {isFiltering
            ? `Filtering catalog${total ? ` · ${total} match${total === 1 ? '' : 'es'}` : ''}`
            : 'Browse catalog below or type 2+ characters to filter'}
        </p>

        <div className="mt-3 space-y-2 max-h-[min(60vh,520px)] overflow-y-auto">
          {isFetching && (
            <p className="text-sm text-ink-muted py-4 text-center">Loading materials…</p>
          )}
          {isError && (
            <div className="text-sm text-center py-4 space-y-2">
              <p className="text-red-700">Could not load materials. Is the API running?</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-bekem-accent font-medium hover:underline"
              >
                Retry
              </button>
            </div>
          )}
          {!isFetching && !isError && !materials.length && (
            <p className="text-sm text-ink-muted py-4 text-center">
              {isFiltering
                ? `No materials match "${trimmed}"`
                : 'No materials in catalog yet. Ask admin to add materials.'}
            </p>
          )}
          {grouped.map((group) => (
            <div key={group.category}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted px-1 py-1 sticky top-0 bg-white/95 backdrop-blur-sm z-[1]">
                {group.category}
              </p>
              {group.items.map((m) => {
                const hint = stockHint(m as CatalogMaterial);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelect?.(m)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border border-surface-border hover:border-bekem-accent/30 hover:bg-bekem-accent-soft/40 text-left transition-all mb-1.5"
                  >
                    <div className="h-9 w-9 rounded-lg bg-bekem-accent-soft flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-bekem-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-ink">{m.name}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        {m.pickerSubtitle ?? (
                          <>
                            {m.code}
                            {m.grade ? ` · ${m.grade}` : ''}
                            {m.category ? ` · ${m.category}` : ''}
                          </>
                        )}
                      </p>
                      {hint && (
                        <p
                          className={cn(
                            'text-[11px] mt-1 font-medium',
                            (m as CatalogMaterial).stock?.quantityOnHand
                              ? (m as CatalogMaterial).stock?.isLowStock
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                              : 'text-ink-muted'
                          )}
                        >
                          {hint}
                        </p>
                      )}
                      {m.description && (
                        <p className="text-xs text-ink-muted mt-1 line-clamp-2">{m.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
