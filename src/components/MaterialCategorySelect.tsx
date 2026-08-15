import { MATERIAL_CATEGORY_NAMES, MATERIAL_CATEGORY_OTHERS } from '@afios/shared';
import type { MaterialCategoryDto } from '@afios/shared';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/Input';

interface MaterialCategorySelectProps {
  categories?: MaterialCategoryDto[];
  categoryId: string;
  categoryName: string;
  categoryRemarks?: string;
  onChange: (next: { categoryId: string; categoryName: string; categoryRemarks?: string }) => void;
  remarksLabel?: string;
  className?: string;
}

export function MaterialCategorySelect({
  categories,
  categoryId,
  categoryName,
  categoryRemarks = '',
  onChange,
  remarksLabel = 'Remarks',
  className,
}: MaterialCategorySelectProps) {
  const options =
    categories?.length
      ? categories
      : MATERIAL_CATEGORY_NAMES.map((name, i) => ({ id: `static-${i}`, name }));

  const isOthers = categoryName === MATERIAL_CATEGORY_OTHERS;

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <label className="text-xs font-semibold text-ink-muted mb-1 block">
          Category <span className="text-danger">*</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => {
            const selected = options.find((c) => c.id === e.target.value);
            if (!selected) return;
            onChange({
              categoryId: selected.id,
              categoryName: selected.name,
              categoryRemarks: selected.name === MATERIAL_CATEGORY_OTHERS ? categoryRemarks : '',
            });
          }}
          className="w-full h-10 rounded-xl border border-surface-border px-3 text-sm bg-white"
        >
          <option value="">Select category…</option>
          {options.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {isOthers && (
        <div>
          <label className="text-xs font-semibold text-ink-muted mb-1 block">
            {remarksLabel} <span className="text-danger">*</span>
          </label>
          <Textarea
            value={categoryRemarks}
            onChange={(e) =>
              onChange({ categoryId, categoryName, categoryRemarks: e.target.value })
            }
            placeholder="Specify the material type…"
            className="min-h-[72px]"
          />
        </div>
      )}
    </div>
  );
}
