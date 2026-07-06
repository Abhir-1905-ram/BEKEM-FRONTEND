import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MaterialAvailabilityDto {
  materialId: string;
  materialName: string;
  materialCode?: string;
  companyAvailableQty: number;
  projectWise: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    availableQty: number;
  }>;
}

interface PoWizardStockPanelProps {
  materialIds: string[];
  requestingProjectId?: string;
  className?: string;
}

export function PoWizardStockPanel({
  materialIds,
  requestingProjectId,
  className,
}: PoWizardStockPanelProps) {
  const uniqueIds = [...new Set(materialIds.filter(Boolean))];
  const queries = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: ['material-availability', id],
      queryFn: async () => {
        const res = await api.get<{ data: MaterialAvailabilityDto }>(
          `/stock/material-availability/${id}`
        );
        return res.data.data;
      },
      enabled: !!id,
    })),
  });

  const rows = queries.map((q) => q.data).filter(Boolean) as MaterialAvailabilityDto[];
  if (!uniqueIds.length) return null;
  if (queries.every((q) => q.isLoading)) {
    return <div className={cn('h-8 bg-surface-muted animate-pulse rounded', className)} />;
  }
  if (!rows.length) return null;

  return (
    <div className={cn('mb-2', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted mb-1">
        Stock before PO (company + project-wise)
      </p>
      <div className="table-shell">
        <table className="data-table min-w-[520px]">
          <thead>
            <tr>
              <th>Material</th>
              <th className="num w-24">Company</th>
              {rows[0]?.projectWise.map((p) => (
                <th key={p.projectId} className="num w-20">
                  {p.projectCode || p.projectName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.materialId}>
                <td className="cell-text" title={row.materialName}>
                  {row.materialCode || row.materialName}
                </td>
                <td className="num font-semibold">{row.companyAvailableQty}</td>
                {row.projectWise.map((p) => (
                  <td
                    key={p.projectId}
                    className={cn(
                      'num',
                      requestingProjectId && p.projectId === requestingProjectId && 'bg-bekem-accent/10',
                      p.availableQty > 0 &&
                        requestingProjectId &&
                        p.projectId !== requestingProjectId &&
                        'text-success-dark font-semibold'
                    )}
                  >
                    {p.availableQty}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
