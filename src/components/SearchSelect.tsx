import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { SEARCH_SELECT_DROPDOWN, SEARCH_SELECT_INPUT } from '@/lib/designTokens';

export interface SearchSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchSelectProps<T extends SearchSelectOption> {
  value: string | null;
  onChange: (id: string, option: T) => void;
  /** API path e.g. `/materials/search` */
  searchPath?: string;
  searchParams?: Record<string, string>;
  /** Static options with client-side filter (no API) */
  options?: T[];
  mapResult?: (raw: unknown) => T;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

function defaultMap(raw: unknown): SearchSelectOption {
  const r = raw as Record<string, string>;
  const label = r.name || r.description || r.code || r.itemCode || r.id;
  const sublabel = [r.code || r.itemCode, r.gstNumber, r.unit].filter(Boolean).join(' · ');
  return { id: r.id, label, sublabel };
}

export function SearchSelect<T extends SearchSelectOption = SearchSelectOption>({
  value,
  onChange,
  searchPath,
  searchParams,
  options: staticOptions,
  mapResult = defaultMap as (raw: unknown) => T,
  placeholder = 'Search…',
  emptyMessage = 'No results found',
  disabled,
  className,
  compact = false,
}: SearchSelectProps<T>) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debouncedQ = useDebounced(query, 200);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(
    null
  );

  const { data: fetched = [], isFetching } = useQuery({
    queryKey: ['search-select', searchPath, debouncedQ, searchParams],
    queryFn: async () => {
      const res = await api.get<{ data: unknown[] }>(searchPath!, {
        params: { q: debouncedQ, ...searchParams },
      });
      return res.data.data.map(mapResult);
    },
    enabled: !!searchPath && open,
    staleTime: 30_000,
  });

  const filteredStatic = staticOptions
    ? staticOptions.filter((o) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          o.label.toLowerCase().includes(q) ||
          (o.sublabel || '').toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
        );
      })
    : [];

  const apiResults = (fetched as T[]) ?? [];
  const displayResults: T[] = searchPath
    ? debouncedQ.trim()
      ? apiResults
      : ([
          ...(staticOptions ?? []).filter((o) => !apiResults.some((f) => f.id === o.id)),
          ...apiResults,
        ] as T[])
    : (filteredStatic as T[]);

  const selected =
    staticOptions?.find((o) => o.id === value) ||
    displayResults.find((o) => o.id === value) ||
    apiResults.find((o) => o.id === value);

  const updateMenuPosition = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setMenuRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 260),
    });
  }, []);

  useEffect(() => {
    if (selected) setQuery(selected.label);
  }, [selected?.id, selected?.label]);

  useEffect(() => {
    setHighlight(0);
  }, [displayResults.length, debouncedQ]);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onReflow = () => updateMenuPosition();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, updateMenuPosition, displayResults.length]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const portal = document.getElementById(listId);
      if (portal?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [listId]);

  const pick = useCallback(
    (opt: T) => {
      onChange(opt.id, opt);
      setQuery(opt.label);
      setOpen(false);
    },
    [onChange]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      updateMenuPosition();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, displayResults.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && displayResults[highlight]) {
      e.preventDefault();
      pick(displayResults[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const dropdown =
    open && menuRect
      ? createPortal(
          <ul
            id={listId}
            role="listbox"
            className={cn(SEARCH_SELECT_DROPDOWN, 'fixed')}
            style={{
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
            }}
          >
            {isFetching && searchPath && displayResults.length === 0 && (
              <li className="px-3 py-2 text-xs text-ink-muted">Loading vendors…</li>
            )}
            {!isFetching && displayResults.length === 0 && (
              <li className="px-3 py-2 text-xs text-ink-muted">
                {query.trim()
                  ? `${emptyMessage} for "${query.trim()}"`
                  : emptyMessage}
              </li>
            )}
            {displayResults.map((opt, i) => (
              <li key={opt.id} role="option" aria-selected={value === opt.id}>
                <button
                  type="button"
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-surface-muted',
                    highlight === i && 'bg-surface-muted',
                    value === opt.id && 'font-semibold text-bekem-accent'
                  )}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(opt)}
                >
                  <span className="block">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="block text-xs text-ink-muted">{opt.sublabel}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none',
            compact ? 'h-3.5 w-3.5' : 'h-4 w-4 left-3'
          )}
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            updateMenuPosition();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            updateMenuPosition();
            if (!e.target.value) onChange('', {} as T);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            SEARCH_SELECT_INPUT,
            compact && 'h-8 py-1 pl-7 pr-2 text-xs',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        />
      </div>
      {dropdown}
    </div>
  );
}

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
