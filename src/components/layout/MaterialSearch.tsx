import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Package } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialDto } from '@afios/shared';
import { cn } from '@/lib/utils';

interface MaterialSearchProps {
  className?: string;
  onSelect?: (material: MaterialDto) => void;
}

export function MaterialSearch({ className, onSelect }: MaterialSearchProps) {
  const [q, setQ] = useState('');

  const { data: materials, isFetching } = useQuery({
    queryKey: ['materials-search', q],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialDto[] }>('/materials', { params: { search: q } });
      return res.data.data;
    },
    enabled: q.trim().length >= 2,
  });

  return (
    <section className={cn('mb-8 lg:mb-10', className)}>
      <h2 className="section-label mb-4">Material lookup</h2>
      <div className="panel p-4 lg:p-5">
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

        {q.trim().length >= 2 && (
          <div className="mt-3 space-y-2">
            {isFetching && (
              <p className="text-sm text-ink-muted py-4 text-center">Searching materials…</p>
            )}
            {!isFetching && !materials?.length && (
              <p className="text-sm text-ink-muted py-4 text-center">No materials match &ldquo;{q}&rdquo;</p>
            )}
            {materials?.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect?.(m)}
                className="w-full flex items-start gap-3 p-3 rounded-xl border border-surface-border hover:border-bekem-accent/30 hover:bg-bekem-accent-soft/40 text-left transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-bekem-accent-soft flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-bekem-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-ink">{m.name}</p>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    {m.code}
                    {m.grade ? ` · ${m.grade}` : ''}
                    {m.category ? ` · ${m.category}` : ''}
                  </p>
                  {m.description && (
                    <p className="text-xs text-ink-muted mt-1 line-clamp-2">{m.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
