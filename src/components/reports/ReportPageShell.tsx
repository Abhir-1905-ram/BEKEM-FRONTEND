import type { ReactNode } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';

export function ReportPageShell({
  title,
  subtitle,
  filters,
  onExportCsv,
  exporting,
  children,
}: {
  title: string;
  subtitle?: string;
  filters?: ReactNode;
  onExportCsv?: () => void;
  exporting?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="page-container max-w-full">
      <PageHeader
        title={title}
        subtitle={subtitle || 'Operational MIS report'}
        action={
          onExportCsv ? (
            <Button variant="secondary" size="sm" disabled={exporting} onClick={onExportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          ) : undefined
        }
      />
      {filters ? <div className="mb-3 flex flex-wrap gap-2 items-end">{filters}</div> : null}
      {children}
    </div>
  );
}
