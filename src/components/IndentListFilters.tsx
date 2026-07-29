import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type {
  IndentDaysFilter,
  IndentQueueFilterOption,
  IndentQueueQuickFilter,
} from '@/lib/indentListFilters';

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  queue: IndentQueueQuickFilter | '';
  onQueueChange: (value: IndentQueueQuickFilter | '') => void;
  queueOptions: IndentQueueFilterOption[];
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  days: IndentDaysFilter;
  onDaysChange: (value: IndentDaysFilter) => void;
  resultCount: number;
  totalCount: number;
  className?: string;
};

/** Chip colors aligned with status badge palette for each queue. */
const QUEUE_CHIP_STYLES: Record<
  IndentQueueQuickFilter,
  { idle: string; active: string; badge: string; badgeActive: string }
> = {
  all: {
    idle: 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300',
    active: 'bg-slate-700 text-white border-slate-700',
    badge: 'bg-white/80 text-slate-700',
    badgeActive: 'bg-white/25 text-white',
  },
  'awaiting-store': {
    idle: 'bg-warning-light text-warning-dark border-warning/30 hover:border-warning/60',
    active: 'bg-warning text-white border-warning',
    badge: 'bg-white/80 text-warning-dark',
    badgeActive: 'bg-white/25 text-white',
  },
  'approved-store': {
    idle: 'bg-warning-light text-warning-dark border-warning/30 hover:border-warning/60',
    active: 'bg-warning text-white border-warning',
    badge: 'bg-white/80 text-warning-dark',
    badgeActive: 'bg-white/25 text-white',
  },
  pm: {
    idle: 'bg-review-light text-review-dark border-review/30 hover:border-review/60',
    active: 'bg-review text-white border-review',
    badge: 'bg-white/80 text-review-dark',
    badgeActive: 'bg-white/25 text-white',
  },
  ho: {
    idle: 'bg-warning-light text-warning-dark border-warning/30 hover:border-warning/60',
    active: 'bg-warning text-white border-warning',
    badge: 'bg-white/80 text-warning-dark',
    badgeActive: 'bg-white/25 text-white',
  },
  executive: {
    idle: 'bg-success-light text-success-dark border-success/30 hover:border-success/60',
    active: 'bg-success text-white border-success',
    badge: 'bg-white/80 text-success-dark',
    badgeActive: 'bg-white/25 text-white',
  },
  coordinator: {
    idle: 'bg-review-light text-review-dark border-review/40 hover:border-review/70',
    active: 'bg-review text-white border-review',
    badge: 'bg-white/80 text-review-dark',
    badgeActive: 'bg-white/25 text-white',
  },
  chairman: {
    idle: 'bg-bekem-accent/10 text-bekem-navy border-bekem-accent/30 hover:border-bekem-accent/50',
    active: 'bg-bekem-navy text-white border-bekem-navy',
    badge: 'bg-white/80 text-bekem-navy',
    badgeActive: 'bg-white/25 text-white',
  },
};

const DEFAULT_QUEUE_CHIP_STYLE = {
  idle: 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300',
  active: 'bg-slate-700 text-white border-slate-700',
  badge: 'bg-white/80 text-slate-700',
  badgeActive: 'bg-white/25 text-white',
};

export function IndentListFilters({
  search,
  onSearchChange,
  queue,
  onQueueChange,
  queueOptions,
  category,
  onCategoryChange,
  categories,
  days,
  onDaysChange,
  resultCount,
  totalCount,
  className,
}: Props) {
  const hasActive = Boolean(search.trim() || (queue && queue !== 'all') || category || days);

  return (
    <div className={cn('space-y-2 mb-3', className)}>
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search raised by, indent no., category, status, date…"
            className="pl-8 h-9 text-sm"
            aria-label="Search material indents"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="h-9 rounded border border-surface-border bg-white px-2 text-xs text-ink min-w-[8.5rem]"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {queueOptions.some((f) => f.id !== 'all') && (
            <select
              value={queue === 'all' ? '' : queue}
              onChange={(e) => onQueueChange(e.target.value as IndentQueueQuickFilter | '')}
              className="h-9 rounded border border-surface-border bg-white px-2 text-xs text-ink min-w-[11rem]"
              aria-label="Filter by pending status"
            >
              <option value="">All statuses</option>
              {queueOptions
                .filter((f) => f.id !== 'all')
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
            </select>
          )}
          <select
            value={days}
            onChange={(e) => onDaysChange(e.target.value as IndentDaysFilter)}
            className="h-9 rounded border border-surface-border bg-white px-2 text-xs text-ink min-w-[8rem]"
            aria-label="Filter by indent date"
          >
            <option value="">All days</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          {hasActive && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onQueueChange('');
                onCategoryChange('');
                onDaysChange('');
              }}
              className="h-9 inline-flex items-center gap-1 rounded border border-surface-border bg-white px-2.5 text-xs font-medium text-ink-secondary hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>
      {hasActive && (
        <p className="text-[11px] text-ink-muted">
          Showing {resultCount} of {totalCount} indent{totalCount === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}

export function IndentQueueQuickButtons({
  value,
  onChange,
  options,
  counts,
  className,
}: {
  value: IndentQueueQuickFilter | '';
  onChange: (next: IndentQueueQuickFilter | '') => void;
  options: IndentQueueFilterOption[];
  /** Pending count per queue chip — shown as a badge. */
  counts?: Partial<Record<IndentQueueQuickFilter, number>>;
  className?: string;
}) {
  if (!options.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((f) => {
        const active = f.id === 'all' ? !value || value === 'all' : value === f.id;
        const count = counts?.[f.id] ?? 0;
        const styles = QUEUE_CHIP_STYLES[f.id] ?? DEFAULT_QUEUE_CHIP_STYLE;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              if (f.id === 'all') {
                onChange('');
                return;
              }
              onChange(active ? '' : f.id);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-colors whitespace-nowrap',
              active ? styles.active : styles.idle
            )}
            aria-pressed={active}
            title={`${f.label}: ${count}`}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full shrink-0',
                active ? 'bg-white' : 'bg-current opacity-70'
              )}
              aria-hidden
            />
            {f.label}
            <span
              className={cn(
                'min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums inline-flex items-center justify-center',
                active ? styles.badgeActive : styles.badge
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
