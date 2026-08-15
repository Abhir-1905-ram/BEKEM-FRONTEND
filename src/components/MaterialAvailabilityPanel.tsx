import { useState } from 'react';
import { ChevronDown, ChevronUp, Warehouse, Building2 } from 'lucide-react';
import type { MaterialAvailabilityDto } from '@afios/shared';
import { cn } from '@/lib/utils';

interface MaterialAvailabilityPanelProps {
  availability: MaterialAvailabilityDto;
  className?: string;
}

export function MaterialAvailabilityPanel({ availability, className }: MaterialAvailabilityPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={cn('panel p-3 space-y-3', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-lg border border-surface-border bg-bekem-accent-soft/30 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 text-ink-muted mb-0.5">
            <Warehouse className="h-3.5 w-3.5" />
            <p className="text-[10px] font-semibold uppercase tracking-wide">Store available stock</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-ink">
            {availability.storeAvailableQty}{' '}
            <span className="text-sm font-medium text-ink-secondary">{availability.unit}</span>
          </p>
        </div>
        <div className="rounded-lg border border-surface-border px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 text-ink-muted mb-0.5">
            <Building2 className="h-3.5 w-3.5" />
            <p className="text-[10px] font-semibold uppercase tracking-wide">Company available stock</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-ink">
            {availability.companyAvailableQty}{' '}
            <span className="text-sm font-medium text-ink-secondary">{availability.unit}</span>
          </p>
        </div>
      </div>

      {availability.projectWise.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-between w-full text-left py-1"
          >
            <span className="text-sm font-semibold text-ink">Project-wise stock availability</span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-ink-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-ink-muted" />
            )}
          </button>
          {expanded && (
            <div className="table-shell mt-2">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Code</th>
                    <th className="num">Available</th>
                    <th>UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {availability.projectWise.map((p) => (
                    <tr key={p.projectId}>
                      <td className="cell-text">{p.projectName}</td>
                      <td className="cell-code whitespace-nowrap">{p.projectCode}</td>
                      <td className="num tabular-nums">{p.availableQty}</td>
                      <td className="whitespace-nowrap">{availability.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {availability.stores.length > 0 && expanded && (
        <div className="pt-2 border-t border-surface-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">By store</p>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Project</th>
                  <th className="num">Available</th>
                  <th>UOM</th>
                </tr>
              </thead>
              <tbody>
                {availability.stores.map((s) => (
                  <tr key={s.siteId}>
                    <td className="cell-text">{s.siteName}</td>
                    <td className="cell-code whitespace-nowrap">{s.projectCode || '—'}</td>
                    <td className="num tabular-nums">{s.availableQty}</td>
                    <td className="whitespace-nowrap">{availability.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
