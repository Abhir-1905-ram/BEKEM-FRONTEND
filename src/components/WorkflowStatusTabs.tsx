import { cn } from '@/lib/utils';

export const WORKFLOW_STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
] as const;

export type WorkflowStatusTab = (typeof WORKFLOW_STATUS_TABS)[number]['key'];

interface WorkflowStatusTabsProps {
  value: WorkflowStatusTab;
  onChange: (tab: WorkflowStatusTab) => void;
  className?: string;
}

export function WorkflowStatusTabs({ value, onChange, className }: WorkflowStatusTabsProps) {
  return (
    <div className={cn('flex gap-1 bg-surface-muted rounded-lg p-1 mb-4', className)}>
      {WORKFLOW_STATUS_TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            'flex-1 py-1.5 text-xs font-medium rounded-md transition-colors',
            value === t.key
              ? 'bg-white text-ink shadow-sm'
              : 'text-ink-muted hover:text-ink-secondary'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
