import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Package, Building2, Users, HardHat, Truck, ArrowLeftRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { GlobalSearchDto } from '@afios/shared';
import { cn } from '@/lib/utils';

const ICONS: Record<keyof GlobalSearchDto, typeof FileText> = {
  materials: Package,
  requests: FileText,
  orders: FileText,
  workOrders: HardHat,
  vendors: Users,
  projects: Building2,
  grns: Truck,
  branchTransfers: ArrowLeftRight,
};

const GROUP_LABELS: Record<keyof GlobalSearchDto, string> = {
  materials: 'Materials',
  requests: 'Indents',
  orders: 'Purchase orders',
  workOrders: 'Work orders',
  vendors: 'Vendors',
  projects: 'Projects',
  grns: 'GRNs',
  branchTransfers: 'Branch transfers',
};

interface DashboardSearchProps {
  placeholder?: string;
  className?: string;
}

export function DashboardSearch({
  placeholder = 'Search indents, POs, materials, work orders…',
  className,
}: DashboardSearchProps) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['dashboard-search', q],
    queryFn: async () => {
      const res = await api.get<{ data: GlobalSearchDto }>('/dashboard/search', { params: { q } });
      return res.data.data;
    },
    enabled: q.trim().length >= 2,
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const groups = data
    ? (Object.entries(data) as [keyof GlobalSearchDto, GlobalSearchDto[keyof GlobalSearchDto]][]).filter(
        ([, items]) => items.length > 0
      )
    : [];

  const hasResults = groups.length > 0;
  const showPanel = open && q.trim().length >= 2;

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    navigate(href);
  };

  return (
    <div ref={wrapRef} className={cn('relative mb-6 lg:mb-8', className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-muted pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full h-11 pl-12 pr-4 rounded-lg border border-surface-border bg-white',
            'text-sm text-ink placeholder:text-ink-muted',
            'focus:outline-none focus:ring-2 focus:ring-bekem-accent/20 focus:border-bekem-accent/50 transition-colors'
          )}
          aria-label="Dashboard search"
          aria-expanded={showPanel}
        />
      </div>

      {showPanel && (
        <div className="absolute z-20 left-0 right-0 mt-2 rounded-lg border border-surface-border bg-white max-h-[360px] overflow-y-auto animate-slide-down">
          {isFetching && (
            <p className="text-sm text-ink-muted px-4 py-6 text-center">Searching…</p>
          )}
          {!isFetching && !hasResults && (
            <p className="text-sm text-ink-muted px-4 py-6 text-center">
              No results for &ldquo;{q}&rdquo;
            </p>
          )}
          {!isFetching &&
            groups.map(([key, items]) => {
              const Icon = ICONS[key];
              return (
                <div key={key} className="p-2">
                  <p className="section-label px-3 py-1">{GROUP_LABELS[key]}</p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item.href)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bekem-accent-soft/50 text-left transition-colors duration-200"
                    >
                      <Icon className="h-4 w-4 text-bekem-accent shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{item.label}</p>
                        <p className="text-xs text-ink-muted truncate">{item.sublabel}</p>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
