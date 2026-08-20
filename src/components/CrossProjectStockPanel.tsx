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
    sites?: Array<{
      siteId: string;
      siteName: string;
      availableQty: number;
    }>;
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
  const visibleRows = rows
    .map((row) => ({
      ...row,
      projects: row.projects.filter(
        (p) => !requestingProjectId || p.projectId !== requestingProjectId
      ),
    }))
    .filter((row) => row.projects.length > 0);

  if (!visibleRows.length) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {visibleRows.map((row) => (
        <Card key={row.materialId} className="p-4 space-y-3">
          <p className="font-semibold text-ink">{row.materialName || 'Material'}</p>
          <div className="space-y-2">
            {row.projects.map((p) => {
              const hasSurplus = p.availableQty > 0;
              const sites = p.sites?.length ? p.sites : null;
              return (
                <div
                  key={p.projectId}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm',
                    hasSurplus
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-surface-border'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{p.projectName}</p>
                      <p className="text-xs text-ink-muted">{p.projectCode}</p>
                    </div>
                    <p className="tabular-nums font-semibold text-ink shrink-0">
                      Available: {p.availableQty}
                    </p>
                  </div>
                  {sites ? (
                    <ul className="mt-2 space-y-1 border-t border-surface-border/70 pt-2">
                      {sites.map((site) => (
                        <li
                          key={site.siteId}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="text-ink-secondary">{site.siteName}</span>
                          <span className="tabular-nums font-medium text-ink">
                            {site.availableQty}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-ink-muted">No site linked</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
