import { api } from '@/lib/api';
import { formatDate } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

interface AgingRow {
  id: string;
  itemCode: string;
  itemDescription: string;
  unit: string;
  batchId: string;
  grnNumber: string;
  receivedAt: string | null;
  availableQuantity: number;
  agingDays: number;
}

export function StockAgingPage() {
  const { data, list } = useListQuery({
    queryKey: ['stock-aging'],
    queryFn: async () => {
      const res = await api.get<{ data: AgingRow[] }>('/stock/aging');
      return normalizeListData<AgingRow>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-full">
      <PageHeader
        title="Stock aging report"
        subtitle="FIFO batch aging — Current Date − GRN Receipt Date"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!data?.length}
        empty={
          <EmptyState
            title="No aged stock batches"
            description="Batches appear after GRNs are received and stock remains on hand."
          />
        }
      >
        <div className="table-shell">
          <table className="data-table min-w-[56rem]">
            <thead>
              <tr>
                <th>Item</th>
                <th>Batch</th>
                <th>GRN</th>
                <th>Received Date</th>
                <th className="num">Available Quantity</th>
                <th className="num">Aging (Days)</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="cell-text">
                    <span className="cell-code block">{row.itemCode || '—'}</span>
                    <span className="text-xs text-ink-secondary">{row.itemDescription}</span>
                  </td>
                  <td className="cell-code whitespace-nowrap">{row.batchId.slice(-6)}</td>
                  <td className="cell-code whitespace-nowrap">{row.grnNumber}</td>
                  <td className="whitespace-nowrap">
                    {row.receivedAt ? formatDate(row.receivedAt) : '—'}
                  </td>
                  <td className="num tabular-nums">
                    {row.availableQuantity} {row.unit}
                  </td>
                  <td className="num tabular-nums font-semibold">{row.agingDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListQueryBoundary>
    </div>
  );
}
