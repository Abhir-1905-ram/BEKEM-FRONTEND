import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ProcurementRefFieldProps {
  value: string;
  label?: string;
}

export function ProcurementRefField({ value, label = 'Procurement reference' }: ProcurementRefFieldProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Reference copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="mb-4">
      <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-muted px-3 py-2">
        <code className="flex-1 text-sm font-mono text-ink break-all">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md hover:bg-white border border-transparent hover:border-surface-border"
          aria-label="Copy reference"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4 text-ink-muted" />
          )}
        </button>
      </div>
    </div>
  );
}
