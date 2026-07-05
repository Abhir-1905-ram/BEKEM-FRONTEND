import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
}: SearchSelectProps<T>) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debouncedQ = useDebounced(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: fetched = [], isFetching } = useQuery({
    queryKey: ['search-select', searchPath, debouncedQ, searchParams],
    queryFn: async () => {
      const res = await api.get<{ data: unknown[] }>(searchPath!, {
        params: { q: debouncedQ, ...searchParams },
      });
      return res.data.data.map(mapResult);
    },
    enabled: !!searchPath && open && debouncedQ.length >= 0,
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

  const results: T[] = searchPath ? (fetched as T[]) : (filteredStatic as T[]);
  const selected = staticOptions?.find((o) => o.id === value) || results.find((o) => o.id === value);

  useEffect(() => {
    if (selected) setQuery(selected.label);
  }, [selected?.id]);

  useEffect(() => {
    setHighlight(0);
  }, [results.length, debouncedQ]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

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
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange('', {} as T);
          }}
          onKeyDown={onKeyDown}
          className={cn(SEARCH_SELECT_INPUT, disabled && 'opacity-60 cursor-not-allowed')}
        />
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className={SEARCH_SELECT_DROPDOWN}
        >
          {isFetching && searchPath && (
            <li className="px-3 py-2 text-xs text-ink-muted">Searching…</li>
          )}
          {!isFetching && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-ink-muted">
              {query.trim()
                ? `${emptyMessage}${query.trim() ? ` for "${query.trim()}"` : ''} — check spelling or ask Coordinator to add it`
                : 'Type to search'}
            </li>
          )}
          {results.map((opt, i) => (
            <li key={opt.id} role="option" aria-selected={value === opt.id}>
              <button
                type="button"
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-surface-muted',
                  highlight === i && 'bg-surface-muted',
                  value === opt.id && 'font-semibold text-bekem-accent'
                )}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(opt)}
              >
                <span className="block">{opt.label}</span>
                {opt.sublabel && (
                  <span className="block text-xs text-ink-muted">{opt.sublabel}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
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
