import { useState } from 'react';
import { ChevronDown, ChevronUp, Warehouse, Building2 } from 'lucide-react';
import type { MaterialAvailabilityDto } from '@afios/shared';
import { cn } from '@/lib/utils';

interface MaterialAvailabilityPanelProps {
  availability: MaterialAvailabilityDto;
  className?: string;
}

export function MaterialAvailabilityPanel({ availability, className }: MaterialAvailabilityPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn('panel p-4 lg:p-5 space-y-4', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-surface-border bg-bekem-accent-soft/30 px-4 py-3">
          <div className="flex items-center gap-2 text-ink-muted mb-1">
            <Warehouse className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Store available stock</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-ink">
            {availability.storeAvailableQty}{' '}
            <span className="text-sm font-medium text-ink-secondary">{availability.unit}</span>
          </p>
        </div>
        <div className="rounded-xl border border-surface-border px-4 py-3">
          <div className="flex items-center gap-2 text-ink-muted mb-1">
            <Building2 className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Company available stock</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-ink">
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
            className="flex items-center justify-between w-full text-left py-2"
          >
            <span className="text-sm font-semibold text-ink">Project-wise stock availability</span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-ink-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-ink-muted" />
            )}
          </button>
          {expanded && (
            <div className="space-y-2 mt-1">
              {availability.projectWise.map((p) => (
                <div
                  key={p.projectId}
                  className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">{p.projectName}</p>
                    <p className="text-xs text-ink-muted">{p.projectCode}</p>
                  </div>
                  <p className="font-semibold tabular-nums">
                    {p.availableQty} {availability.unit}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {availability.stores.length > 0 && expanded && (
        <div className="pt-2 border-t border-surface-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">By store</p>
          <div className="space-y-1">
            {availability.stores.map((s) => (
              <div key={s.siteId} className="flex justify-between text-sm text-ink-secondary">
                <span>
                  {s.siteName}
                  {s.projectCode ? ` · ${s.projectCode}` : ''}
                </span>
                <span className="tabular-nums font-medium text-ink">
                  {s.availableQty} {availability.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
