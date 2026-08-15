import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatDate } from '@afios/shared';
import { api } from '@/lib/api';
import type { BranchTransferDto } from '@afios/shared';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';

function formatItems(t: BranchTransferDto): string {
  if (!t.items?.length) return `${t.itemCount} item(s)`;
  const first = t.items[0];
  const label = first.materialName || 'Material';
  return t.items.length > 1 ? `${label} +${t.items.length - 1} more` : `${label}: ${first.quantity}`;
}

export function PMBranchTransferRequestsPage() {
  const navigate = useNavigate();

  const { data: transfers, list } = useListQuery({
    queryKey: ['pm-branch-transfer-requests'],
    queryFn: async () => {
      const res = await api.get<{ data: BranchTransferDto[] }>('/branch-transfers');
      return normalizeListData<BranchTransferDto>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-full">
      <PageHeader
        title="Branch transfer requests"
        subtitle="Track requests you submitted — approval is handled by Head Office"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!transfers?.length}
        skeletonRows={2}
        empty={
          <EmptyState
            title="No branch transfer requests"
            description="Request a transfer from an indent when surplus stock exists in another supervised project."
          />
        }
      >
        <div className="table-shell">
          <table className="data-table min-w-[56rem]">
            <thead>
              <tr>
                <th>Transfer No</th>
                <th>From</th>
                <th>To</th>
                <th>Materials</th>
                <th>Date</th>
                <th>Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {(transfers ?? []).map((t) => (
                <tr
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/branch-transfers/${t.id}`)}
                >
                  <td className="cell-code whitespace-nowrap">{t.transferNumber}</td>
                  <td className="cell-text whitespace-nowrap">
                    {t.fromProjectName || t.fromProject || '—'}
                  </td>
                  <td className="cell-text whitespace-nowrap">
                    {t.toProjectName || t.toProject || '—'}
                  </td>
                  <td className="cell-text">{formatItems(t)}</td>
                  <td className="whitespace-nowrap">{formatDate(t.createdAt)}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="text-right">
                    <ChevronRight className="h-4 w-4 text-ink-muted inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListQueryBoundary>
    </div>
  );
}

/** @deprecated Use PMBranchTransferRequestsPage */
export const PMBranchTransferApprovalsPage = PMBranchTransferRequestsPage;
