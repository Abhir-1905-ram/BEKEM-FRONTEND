import { useEffect, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Package, Building2, Users, X, HardHat } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GlobalSearchDto } from '@afios/shared';
import { UserRole } from '@afios/shared';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { getRoleNavShortcuts, type NavShortcut } from '@/lib/roleNav';

const ICONS = {
  materials: Package,
  requests: FileText,
  orders: FileText,
  workOrders: HardHat,
  vendors: Users,
  projects: Building2,
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined;
  const shortcuts = useMemo(
    () => (role ? getRoleNavShortcuts(role) : []),
    [role]
  );

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', q],
    queryFn: async () => {
      const res = await api.get<{ data: GlobalSearchDto }>('/dashboard/search', { params: { q } });
      return res.data.data;
    },
    enabled: open && q.trim().length >= 2,
  });

  const go = useCallback(
    (href: string) => {
      onClose();
      navigate(href);
    },
    [navigate, onClose]
  );

  const renderShortcut = (item: NavShortcut) => (
    <button
      key={item.id}
      type="button"
      onClick={() => go(item.href)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-muted text-left transition-colors"
    >
      <item.icon className="h-4 w-4 text-ink-muted shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink truncate">{item.label}</p>
        {item.sublabel && (
          <p className="text-xs text-ink-muted truncate">{item.sublabel}</p>
        )}
      </div>
    </button>
  );

  if (!open) return null;

  const groups = data
    ? (Object.entries(data) as [keyof GlobalSearchDto, GlobalSearchDto[keyof GlobalSearchDto]][])
        .filter(([, items]) => items.length > 0)
    : [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-surface-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-surface-border">
          <Search className="h-5 w-5 text-ink-muted shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search requests, POs, materials, vendors…"
            className="flex-1 h-14 bg-transparent text-sm outline-none placeholder:text-ink-muted"
            aria-label="Search query"
          />
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface-muted text-ink-muted"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {q.trim().length < 2 && shortcuts.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted px-3 py-1">
                Quick navigation
              </p>
              {shortcuts.map(renderShortcut)}
            </div>
          )}
          {q.trim().length < 2 && (
            <p className="text-sm text-ink-muted px-3 py-4 text-center">
              Type to search requests, POs, materials, and vendors
            </p>
          )}
          {isFetching && q.trim().length >= 2 && (
            <p className="text-sm text-ink-muted px-3 py-4">Searching…</p>
          )}
          {!isFetching && q.trim().length >= 2 && groups.length === 0 && (
            <p className="text-sm text-ink-muted px-3 py-4">No results for &ldquo;{q}&rdquo;</p>
          )}
          {groups.map(([key, items]) => {
            const Icon = ICONS[key] || FileText;
            return (
              <div key={key} className="mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted px-3 py-1">
                  {key}
                </p>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-muted text-left transition-colors"
                  >
                    <Icon className="h-4 w-4 text-ink-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{item.label}</p>
                      <p className="text-xs text-ink-muted truncate">{item.sublabel}</p>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-surface-border bg-surface-muted/50 text-[10px] text-ink-muted flex justify-between">
          <span>Global search across Bekem OS</span>
          <kbd className="font-mono">Esc</kbd>
        </div>
      </div>
    </div>
  );
}

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'hidden lg:flex items-center gap-2 h-9 px-3 rounded-lg border border-surface-border',
        'bg-surface-muted/50 text-sm text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors'
      )}
      aria-label="Open search (Ctrl+K)"
    >
      <Search className="h-4 w-4" />
      <span>Search…</span>
      <kbd className="ml-4 text-[10px] font-mono bg-white border border-surface-border rounded px-1.5 py-0.5">
        ⌘K
      </kbd>
    </button>
  );
}
