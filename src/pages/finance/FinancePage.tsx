import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@afios/shared';

interface PaymentBillDto {
  id: string;
  billNumber: string;
  vendorName: string;
  projectCode: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  invoiceValue: number;
  outstandingAmount: number;
  paidAmount: number;
  paymentStatus: string;
  invoiceStatus: string;
  tallySyncStatus: string;
  tallyVoucherId: string;
  dueDate: string | null;
  paidDate: string | null;
  agingDays: number;
}

interface FinanceSummaryDto {
  pending: number;
  overdue: number;
  paid: number;
  outstandingTotal: number;
  tallyPending: number;
  tallySynced: number;
  total: number;
}

export function FinancePage() {
  const user = useAuthStore((s) => s.user);
  const isCoordinator = user?.role === UserRole.COORDINATOR;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      const res = await api.get<{ data: FinanceSummaryDto }>('/finance/summary');
      return res.data.data;
    },
  });

  const { data: bills, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['finance-bills', filter],
    queryFn: async () => {
      const res = await api.get<{ data: PaymentBillDto[] }>('/finance/bills', {
        params: filter ? { paymentStatus: filter } : undefined,
      });
      return res.data.data;
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({
      id,
      paidAmount,
      tallySyncStatus,
      tallyVoucherId,
    }: {
      id: string;
      paidAmount: number;
      tallySyncStatus?: string;
      tallyVoucherId?: string;
    }) => {
      await api.patch(`/finance/bills/${id}/payment`, {
        paidAmount,
        paidDate: new Date().toISOString(),
        tallySyncStatus,
        tallyVoucherId,
        invoiceStatus: paidAmount > 0 ? 'PAID' : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-bills'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  return (
    <div className="page-container max-w-4xl">
      <PageHeader
        title="Finance & Tally"
        subtitle={
          isCoordinator
            ? 'Payment processing, bill aging, and Tally sync status'
            : 'Enterprise financial overview — outstanding bills and payment aging'
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Pending bills</p>
          <p className="text-2xl font-bold tabular-nums">{summary?.pending ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Overdue</p>
          <p className="text-2xl font-bold tabular-nums text-danger">{summary?.overdue ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Outstanding</p>
          <p className="text-lg font-bold tabular-nums">{formatCurrency(summary?.outstandingTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Tally sync pending</p>
          <p className="text-2xl font-bold tabular-nums">{summary?.tallyPending ?? 0}</p>
        </Card>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'PENDING', 'OVERDUE', 'PAID'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              filter === s ? 'border-bekem-accent bg-bekem-accent/10' : 'border-surface-border'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <ListQueryBoundary
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        retrying={isFetching && !isLoading}
        isEmpty={!bills?.length}
        skeletonRows={4}
        empty={<Card className="p-6 text-center text-ink-secondary">No bills yet — created when GRNs are approved.</Card>}
      >
        <div className="space-y-3">
          {(bills ?? []).map((bill) => (
            <Card key={bill.id} className="p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold">{bill.billNumber}</p>
                  <p className="text-sm text-ink-secondary">
                    {bill.vendorName} · {bill.projectCode}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{formatCurrency(bill.invoiceValue)}</p>
                  <p className="text-ink-muted capitalize">{bill.paymentStatus.toLowerCase()}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-secondary">
                <span>Invoice: {bill.invoiceNumber || '—'}</span>
                <span>Invoice date: {bill.invoiceDate ? formatDate(bill.invoiceDate) : '—'}</span>
                <span>Due: {bill.dueDate ? formatDate(bill.dueDate) : '—'}</span>
                <span>Aging: {bill.agingDays} days</span>
                <span>Outstanding: {formatCurrency(bill.outstandingAmount)}</span>
                <span>Tally: {bill.tallySyncStatus}</span>
              </div>
              {isCoordinator && bill.paymentStatus !== 'PAID' && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      updatePayment.mutate({
                        id: bill.id,
                        paidAmount: bill.invoiceValue,
                        tallySyncStatus: 'SYNCED',
                        tallyVoucherId: `TALLY-${bill.billNumber}`,
                      })
                    }
                  >
                    Mark paid &amp; sync Tally
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
