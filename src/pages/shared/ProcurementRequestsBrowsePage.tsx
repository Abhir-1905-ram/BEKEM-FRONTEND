import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate, formatProjectLabel } from '@afios/shared';
import type { PurchaseRequestDto } from '@afios/shared';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { WorkflowStatusTabs, type WorkflowStatusTab } from '@/components/WorkflowStatusTabs';

export function prLinkedMaterialRequestId(pr: PurchaseRequestDto): string | undefined {
  const raw = pr.materialRequestId as unknown;
  if (typeof raw === 'string' && raw) return raw;
  if (raw && typeof raw === 'object' && 'id' in (raw as object)) {
    return String((raw as { id: string }).id);
  }
  return pr.materialRequest?.id;
}

interface ProcurementRequestsBrowsePageProps {
  title?: string;
  subtitle?: string;
  /** Detail navigation — Store/PM view-only; Coord/Chairman may deep-link to PR or indent. */
  detailPath?: (pr: PurchaseRequestDto) => string;
  /** When true, API returns only PRs raised by the current user (Store/PM). */
  mineOnly?: boolean;
}

function matchesTab(pr: PurchaseRequestDto, tab: WorkflowStatusTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'pending') {
    return !['PO_CREATED', 'CLOSED', 'COMPLETED', 'CANCELLED', 'APPROVED'].includes(pr.status);
  }
  if (tab === 'approved') {
    return !!pr.executiveRecommendation || pr.status === 'APPROVED';
  }
  if (tab === 'completed') {
    return ['PO_CREATED', 'CLOSED', 'COMPLETED'].includes(pr.status);
  }
  return true;
}

export function ProcurementRequestsBrowsePage({
  title = 'Procurement requests',
  subtitle = 'Purchase requests moving through Head Office',
  detailPath,
  mineOnly = false,
}: ProcurementRequestsBrowsePageProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as WorkflowStatusTab) || 'all';

  const { data: items, list } = useListQuery({
    queryKey: ['procurement-requests-browse', mineOnly ? 'mine' : 'all', tab],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseRequestDto[] }>('/purchase-requests', {
        params: { scope: 'procurement' },
      });
      return normalizeListData<PurchaseRequestDto>(res.data.data);
    },
  });

  const rows = (items ?? []).filter((pr) => matchesTab(pr, tab));

  return (
    <div className="page-container max-w-full">
      <PageHeader title={title} subtitle={subtitle} />

      <WorkflowStatusTabs value={tab} onChange={(t) => setParams({ tab: t })} />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!rows.length}
        skeletonRows={3}
        empty={
          <EmptyState
            title="No procurement requests"
            description={
              mineOnly
                ? 'Requests you raise for purchase will appear here.'
                : 'Purchase requests from projects will appear here.'
            }
          />
        }
      >
        <div className="table-shell">
          <table className="data-table min-w-[56rem]">
            <thead>
              <tr>
                <th>PR No</th>
                <th>Project</th>
                <th className="num">Value</th>
                <th>Requested</th>
                <th>Status</th>
                <th>RFQ</th>
                <th>Raised by (RFQ)</th>
                <th>Materials</th>
                {detailPath ? <th className="w-10" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((pr) => (
                <tr
                  key={pr.id}
                  className={detailPath ? 'cursor-pointer' : undefined}
                  onClick={() => detailPath && navigate(detailPath(pr))}
                >
                  <td className="cell-code whitespace-nowrap">{pr.prNumber}</td>
                  <td className="cell-text whitespace-nowrap">
                    {formatProjectLabel(pr.project)}
                  </td>
                  <td className="num tabular-nums whitespace-nowrap">
                    {formatCurrency(pr.totalValue ?? pr.amountEstimate)}
                  </td>
                  <td className="whitespace-nowrap">
                    {pr.requestDate ? formatDate(pr.requestDate) : pr.createdAt ? formatDate(pr.createdAt) : '—'}
                  </td>
                  <td>
                    <StatusBadge status={pr.status} />
                  </td>
                  <td className="cell-code whitespace-nowrap">{pr.rfqNumber || '—'}</td>
                  <td className="cell-text whitespace-nowrap">
                    {pr.rfqRaisedByName
                      ? pr.rfqRaisedByRole === 'EXECUTIVE'
                        ? `Raised by ${pr.rfqRaisedByName} (Executive)`
                        : `Raised by ${pr.rfqRaisedByName}`
                      : '—'}
                  </td>
                  <td className="cell-text">{pr.materialsSummary || '—'}</td>
                  {detailPath ? (
                    <td className="text-right">
                      <ChevronRight className="h-4 w-4 text-ink-muted inline-block" />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListQueryBoundary>
    </div>
  );
}
