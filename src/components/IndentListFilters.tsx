import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
  INDENT_QUEUE_QUICK_FILTERS,
  type IndentDaysFilter,
  type IndentQueueQuickFilter,
} from '@/lib/indentListFilters';

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  queue: IndentQueueQuickFilter | '';
  onQueueChange: (value: IndentQueueQuickFilter | '') => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  days: IndentDaysFilter;
  onDaysChange: (value: IndentDaysFilter) => void;
  resultCount: number;
  totalCount: number;
  className?: string;
};

export function IndentListFilters({
  search,
  onSearchChange,
  queue,
  onQueueChange,
  category,
  onCategoryChange,
  categories,
  days,
  onDaysChange,
  resultCount,
  totalCount,
  className,
}: Props) {
  const hasActive = Boolean(search.trim() || queue || category || days);

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
          <select
            value={queue}
            onChange={(e) => onQueueChange(e.target.value as IndentQueueQuickFilter | '')}
            className="h-9 rounded border border-surface-border bg-white px-2 text-xs text-ink min-w-[11rem]"
            aria-label="Filter by pending status"
          >
            <option value="">All statuses</option>
            {INDENT_QUEUE_QUICK_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
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
  className,
}: {
  value: IndentQueueQuickFilter | '';
  onChange: (next: IndentQueueQuickFilter | '') => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {INDENT_QUEUE_QUICK_FILTERS.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(active ? '' : f.id)}
            className={cn(
              'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-colors whitespace-nowrap',
              active
                ? 'bg-bekem-navy text-white border-bekem-navy'
                : 'bg-white text-ink-secondary border-surface-border hover:border-bekem-navy/40 hover:text-ink'
            )}
            aria-pressed={active}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
