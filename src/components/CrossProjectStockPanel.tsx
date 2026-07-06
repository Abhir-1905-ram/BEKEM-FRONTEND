import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export interface CrossProjectStockRow {
  materialId: string;
  materialName?: string;
  projects: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    availableQty: number;
  }>;
}

interface CrossProjectStockPanelProps {
  rows: CrossProjectStockRow[];
  className?: string;
  requestingProjectId?: string;
}

export function CrossProjectStockPanel({
  rows,
  className,
  requestingProjectId,
}: CrossProjectStockPanelProps) {
  if (!rows.length) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {rows.map((row) => (
        <Card key={row.materialId} className="p-4 space-y-3">
          <p className="font-semibold text-ink">{row.materialName || 'Material'}</p>
          <div className="space-y-2">
            {row.projects.map((p) => {
              const isRequesting = requestingProjectId && p.projectId === requestingProjectId;
              const hasSurplus = p.availableQty > 0 && !isRequesting;
              return (
                <div
                  key={p.projectId}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-3 py-2 text-sm',
                    isRequesting
                      ? 'border-bekem-accent/30 bg-bekem-accent/5'
                      : hasSurplus
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-surface-border'
                  )}
                >
                  <div>
                    <p className="font-medium text-ink">{p.projectName}</p>
                    <p className="text-xs text-ink-muted">{p.projectCode}</p>
                  </div>
                  <p className="tabular-nums font-semibold text-ink">
                    Available: {p.availableQty}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
