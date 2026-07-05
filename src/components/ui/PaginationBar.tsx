import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { PaginationMetaDto } from '@afios/shared';

interface PaginationBarProps {
  pagination: PaginationMetaDto;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationBar({ pagination, onPageChange, className }: PaginationBarProps) {
  const { page, totalPages, total, limit } = pagination;
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 text-sm ${className ?? ''}`}>
      <p className="text-ink-secondary tabular-nums">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <span className="text-ink-secondary tabular-nums px-1">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
