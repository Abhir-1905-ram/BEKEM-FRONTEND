import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@afios/shared';
import type { ExplorerProjectDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

export function ExplorerPage() {
  const navigate = useNavigate();

  const { data: projects, list } = useListQuery({
    queryKey: ['explorer'],
    queryFn: async () => {
      const res = await api.get<{ data: ExplorerProjectDto[] }>('/dashboard/explorer');
      return normalizeListData<ExplorerProjectDto>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-full">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <PageHeader
        title="Portfolio explorer"
        subtitle="Cross-project drill-down for leadership and PM"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!projects?.length}
        skeletonRows={6}
        empty={<EmptyState title="No projects" description="Active projects will appear here." />}
      >
        <div className="table-shell">
          <table className="data-table min-w-[72rem]">
            <thead>
              <tr>
                <th>Code</th>
                <th>Project</th>
                <th>PM</th>
                <th>Status</th>
                <th className="num">Indents</th>
                <th className="num">PRs</th>
                <th className="num">POs</th>
                <th className="num">GRNs</th>
                <th className="num">Transfers</th>
                <th>Procurement</th>
                <th>Inventory</th>
                <th>Budget</th>
                <th className="num">Deployed</th>
                <th className="num">Health</th>
              </tr>
            </thead>
            <tbody>
              {(projects ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="cell-code whitespace-nowrap">{p.code}</td>
                  <td className="cell-text">{p.name}</td>
                  <td className="cell-text whitespace-nowrap">{p.projectManager}</td>
                  <td className="whitespace-nowrap">{p.status}</td>
                  <td className="num tabular-nums">{p.pendingMaterialRequests}</td>
                  <td className="num tabular-nums">{p.pendingPurchaseRequests}</td>
                  <td className="num tabular-nums">{p.pendingPurchaseOrders}</td>
                  <td className="num tabular-nums">{p.pendingGrns}</td>
                  <td className="num tabular-nums">{p.pendingBranchTransfers}</td>
                  <td className="whitespace-nowrap">{p.procurementStatus}</td>
                  <td className="whitespace-nowrap">{p.inventoryHealth}</td>
                  <td className="whitespace-nowrap">{p.budgetStatus}</td>
                  <td className="num tabular-nums whitespace-nowrap">
                    {formatCurrency(p.budgetSpent)} ({p.deployPct}%)
                  </td>
                  <td className="num tabular-nums">{p.healthScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListQueryBoundary>
    </div>
  );
}
