import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { IndentCategoryDto } from '@afios/shared';
import { cn } from '@/lib/utils';

interface IndentCategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function IndentCategorySelect({
  value,
  onChange,
  disabled,
  className,
}: IndentCategorySelectProps) {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['indent-categories'],
    queryFn: async () => {
      const res = await api.get<{ data: IndentCategoryDto[] }>('/indent-categories');
      return res.data.data;
    },
  });

  return (
    <select
      value={value}
      disabled={disabled || isLoading}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full h-8 rounded border border-surface-border px-2 text-xs bg-white disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      <option value="">{isLoading ? 'Loading…' : 'Select indent category…'}</option>
      {(categories ?? []).map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
  );
}
