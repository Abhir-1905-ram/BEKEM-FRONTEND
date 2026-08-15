import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { formatCurrency, UserRole, type WorkOrderDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuthStore } from '@/stores/authStore';

export function WorkOrdersListPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canCreate =
    role === UserRole.EXECUTIVE || role === UserRole.COORDINATOR;

  const { data: items, list } = useListQuery({
    queryKey: ['work-orders-list'],
    queryFn: async () => {
      const res = await api.get<{ data: WorkOrderDto[] }>('/work-orders');
      return normalizeListData<WorkOrderDto>(res.data.data);
    },
  });

  return (
    <div className="page-container max-w-full">
      <PageHeader
        title="Work orders"
        subtitle="Track and open work orders linked to approved purchase orders"
        action={
          canCreate ? (
            <Button
              variant="accent"
              size="sm"
              onClick={() =>
                navigate(
                  role === UserRole.COORDINATOR
                    ? '/coordinator/wo/new'
                    : '/executive/wo/new'
                )
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Generate work order
            </Button>
          ) : undefined
        }
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!items?.length}
        empty={
          <EmptyState
            title="No work orders yet"
            description={
              canCreate
                ? 'Generate a work order from an approved purchase order.'
                : 'Work orders will appear here once created.'
            }
            actionLabel={canCreate ? 'Generate work order' : undefined}
            onAction={
              canCreate
                ? () =>
                    navigate(
                      role === UserRole.COORDINATOR
                        ? '/coordinator/wo/new'
                        : '/executive/wo/new'
                    )
                : undefined
            }
          />
        }
      >
        <div className="table-shell">
          <table className="data-table min-w-[52rem]">
            <thead>
              <tr>
                <th>WO No</th>
                <th>Vendor</th>
                <th>Scope</th>
                <th className="num">Qty</th>
                <th className="num">Value</th>
                <th>Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((wo) => (
                <tr
                  key={wo.id}
                  className="cursor-pointer hover:bg-surface-muted/40"
                  onClick={() => navigate(`/work-orders/${wo.id}`)}
                >
                  <td className="font-medium">{wo.woNumber}</td>
                  <td>{wo.vendor?.name || '—'}</td>
                  <td className="max-w-[220px] truncate">{wo.scope || '—'}</td>
                  <td className="num tabular-nums">
                    {wo.totalQuantity != null
                      ? `${wo.totalQuantity} ${wo.quantityUnit || ''}`.trim()
                      : '—'}
                  </td>
                  <td className="num">{formatCurrency(wo.contractValue || 0)}</td>
                  <td>
                    <StatusBadge status={wo.status} />
                  </td>
                  <td>
                    <ChevronRight className="h-4 w-4 text-ink-muted" />
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
