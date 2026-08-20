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

export type CrossProjectSource = {
  projectId: string;
  projectCode: string;
  projectName: string;
  siteId: string;
  siteName: string;
};

interface CrossProjectStockPanelProps {
  rows: CrossProjectStockRow[];
  className?: string;
  requestingProjectId?: string;
  selectedSiteId?: string;
  onSelectSource?: (source: CrossProjectSource) => void;
}

export function otherProjectSitesWithStock(
  rows: CrossProjectStockRow[],
  requestingProjectId?: string
): CrossProjectSource[] {
  const seen = new Map<string, CrossProjectSource>();
  for (const row of rows) {
    for (const p of row.projects) {
      if (requestingProjectId && p.projectId === requestingProjectId) continue;
      for (const site of p.sites || []) {
        if (site.availableQty <= 0) continue;
        if (!seen.has(site.siteId)) {
          seen.set(site.siteId, {
            projectId: p.projectId,
            projectCode: p.projectCode,
            projectName: p.projectName,
            siteId: site.siteId,
            siteName: site.siteName,
          });
        }
      }
    }
  }
  return [...seen.values()];
}

function siteQtyForMaterial(
  rows: CrossProjectStockRow[],
  materialId: string,
  siteId: string
): number {
  const row = rows.find((r) => r.materialId === materialId);
  if (!row) return 0;
  for (const p of row.projects) {
    const site = p.sites?.find((s) => s.siteId === siteId);
    if (site) return site.availableQty;
  }
  return 0;
}

export function transferQtyForSource(
  rows: CrossProjectStockRow[],
  items: Array<{ materialId: string; quantityRequested: number }>,
  siteId: string
): Array<{ materialId: string; quantity: number }> {
  return items
    .map((item) => ({
      materialId: item.materialId,
      quantity: Math.min(
        Number(item.quantityRequested) || 0,
        siteQtyForMaterial(rows, item.materialId, siteId)
      ),
    }))
    .filter((item) => item.quantity > 0);
}

export function CrossProjectStockPanel({
  rows,
  className,
  requestingProjectId,
  selectedSiteId,
  onSelectSource,
}: CrossProjectStockPanelProps) {
  const selectable = Boolean(onSelectSource);
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
                      {sites.map((site) => {
                        const canPick = selectable && site.availableQty > 0;
                        const selected = selectedSiteId === site.siteId;
                        const row = (
                          <>
                            <span className="text-ink-secondary">
                              {selectable && canPick ? (
                                <span className="mr-1.5 text-bekem-accent font-semibold">
                                  {selected ? '●' : '○'}
                                </span>
                              ) : null}
                              {site.siteName}
                            </span>
                            <span className="tabular-nums font-medium text-ink">
                              {site.availableQty}
                            </span>
                          </>
                        );
                        if (!selectable) {
                          return (
                            <li
                              key={site.siteId}
                              className="flex items-center justify-between gap-3 text-xs px-2 py-1.5"
                            >
                              {row}
                            </li>
                          );
                        }
                        return (
                          <li key={site.siteId}>
                            <button
                              type="button"
                              disabled={!canPick}
                              onClick={() =>
                                canPick &&
                                onSelectSource?.({
                                  projectId: p.projectId,
                                  projectCode: p.projectCode,
                                  projectName: p.projectName,
                                  siteId: site.siteId,
                                  siteName: site.siteName,
                                })
                              }
                              className={cn(
                                'w-full flex items-center justify-between gap-3 text-xs rounded-lg px-2 py-1.5 text-left',
                                canPick && 'hover:bg-white/80',
                                selected && 'bg-white ring-1 ring-bekem-accent',
                                !canPick && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              {row}
                            </button>
                          </li>
                        );
                      })}
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
