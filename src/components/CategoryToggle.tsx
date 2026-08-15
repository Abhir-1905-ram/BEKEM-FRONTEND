import type { MaterialCategoryDto } from '@afios/shared';
import { cn } from '@/lib/utils';

interface CategoryToggleProps {
  categories: MaterialCategoryDto[];
  value?: string;
  onChange: (categoryId: string, categoryName: string) => void;
  className?: string;
}

export function CategoryToggle({ categories, value, onChange, className }: CategoryToggleProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {categories.map((cat) => {
        const selected = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id, cat.name)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
              selected
                ? 'bg-bekem-navy text-white border-bekem-navy'
                : 'bg-white text-ink-secondary border-surface-border hover:border-bekem-accent/40'
            )}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
