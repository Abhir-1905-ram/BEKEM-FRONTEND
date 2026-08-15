import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const STEPS = [
  'Material Request',
  'Store Verification',
  'PM Approval',
  'Executive (HO)',
  'Indent Generation',
  'Coordinator Approval',
  'RFQ Generation',
  'Vendor Quotations',
  'Comparison',
  'Vendor Selection',
  'PO Generation',
  'GRN Generation',
  'Invoice Validation',
  'Variation Check',
  'ON HOLD → Coordinator / MD Approval',
  'Stock Allocation',
];

interface ProcurementWorkflowBannerProps {
  className?: string;
  highlightFrom?: number;
  defaultExpanded?: boolean;
}

export function ProcurementWorkflowBanner({
  className,
  highlightFrom = 0,
  defaultExpanded = false,
}: ProcurementWorkflowBannerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn('panel overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-surface-muted/50 transition-colors"
      >
        <span className="text-xs font-semibold text-ink">Procurement workflow</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-ink-muted shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-muted shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 overflow-x-auto procurement-landscape-scroll">
          <ol className="flex items-stretch gap-0 min-w-max text-[10px] sm:text-[11px]">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center">
                <span
                  className={cn(
                    'px-2 py-1 rounded-md whitespace-nowrap border',
                    i >= highlightFrom
                      ? 'bg-bekem-navy/5 border-bekem-navy/20 text-bekem-navy font-medium'
                      : 'bg-surface-muted/40 border-surface-border text-ink-muted'
                  )}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="text-ink-muted px-0.5 select-none hidden sm:inline" aria-hidden>
                    →
                  </span>
                )}
                {i < STEPS.length - 1 && (
                  <span className="text-ink-muted px-0.5 select-none sm:hidden" aria-hidden>
                    ·
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
