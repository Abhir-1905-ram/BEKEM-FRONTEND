import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate, UserRole, type FinanceSummaryDto, type PaymentBillDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

const STATUS_FILTERS = ['', 'PENDING', 'PARTIAL', 'OVERDUE', 'PAID'] as const;

function paymentStatusClass(status: string) {
  switch (status) {
    case 'PAID':
      return 'text-emerald-700 bg-emerald-50';
    case 'PARTIAL':
      return 'text-amber-800 bg-amber-50';
    case 'OVERDUE':
      return 'text-rose-700 bg-rose-50';
    default:
      return 'text-ink-secondary bg-surface-muted';
  }
}

export function FinancePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole;
  const canRecordPayment = role === UserRole.COORDINATOR;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [payDrafts, setPayDrafts] = useState<Record<string, { amount: string; remark: string }>>({});

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

  const recordPayment = useMutation({
    mutationFn: async ({
      id,
      paymentAmount,
      paymentRemark,
      tallySyncStatus,
      tallyVoucherId,
    }: {
      id: string;
      paymentAmount: number;
      paymentRemark?: string;
      tallySyncStatus?: string;
      tallyVoucherId?: string;
    }) => {
      await api.patch(`/finance/bills/${id}/payment`, {
        paymentAmount,
        paidDate: new Date().toISOString(),
        paymentRemark,
        tallySyncStatus,
        tallyVoucherId,
      });
    },
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['finance-bills'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['po-grns'] });
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Could not record payment');
    },
  });

  const getDraft = (billId: string) => payDrafts[billId] || { amount: '', remark: '' };

  const setDraft = (billId: string, patch: Partial<{ amount: string; remark: string }>) => {
    setPayDrafts((prev) => ({
      ...prev,
      [billId]: { ...getDraft(billId), ...patch },
    }));
  };

  const subtitle = canRecordPayment
    ? 'Record partial or full payments, track aging, and sync to Tally'
    : 'Payment status and bill aging across your projects';

  const monthlyReportPath =
    role === UserRole.COORDINATOR
      ? '/coordinator/finance/monthly-report'
      : role === UserRole.CHAIRMAN
        ? '/chairman/finance/monthly-report'
        : role === UserRole.EXECUTIVE
          ? '/executive/finance/monthly-report'
          : role === UserRole.PROJECT_MANAGER
            ? '/pm/finance/monthly-report'
            : '/store/finance/monthly-report';

  const miscPurchasesPath =
    role === UserRole.COORDINATOR
      ? '/coordinator/misc-purchases'
      : role === UserRole.CHAIRMAN
        ? '/chairman/misc-purchases'
        : role === UserRole.EXECUTIVE
          ? '/executive/misc-purchases'
          : '/pm/misc-purchases';

  return (
    <div className="page-container max-w-4xl">
      <PageHeader title="Finance & Tally" subtitle={subtitle} />

      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="secondary" size="sm" onClick={() => navigate(monthlyReportPath)}>
          Monthly audit report
        </Button>
        {(role === UserRole.PROJECT_MANAGER ||
          role === UserRole.EXECUTIVE ||
          role === UserRole.COORDINATOR ||
          role === UserRole.CHAIRMAN) && (
          <Button variant="secondary" size="sm" onClick={() => navigate(miscPurchasesPath)}>
            Misc purchases
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Pending bills</p>
          <p className="text-2xl font-bold tabular-nums">{summary?.pending ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Partially paid</p>
          <p className="text-2xl font-bold tabular-nums text-amber-700">{summary?.partial ?? 0}</p>
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
          <p className="text-xs text-ink-muted">Paid to date</p>
          <p className="text-lg font-bold tabular-nums text-emerald-700">
            {formatCurrency(summary?.paidTotal)}
          </p>
        </Card>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              filter === s ? 'border-bekem-accent bg-bekem-accent/10' : 'border-surface-border'
            }`}
          >
            {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}
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
        empty={
          <Card className="p-6 text-center text-ink-secondary">
            No bills yet — created when GRNs are approved.
          </Card>
        }
      >
        <div className="space-y-3">
          {(bills ?? []).map((bill) => {
            const draft = getDraft(bill.id);
            const installment = Number(draft.amount) || 0;
            const canSubmit =
              installment > 0 && installment <= (bill.outstandingAmount || bill.invoiceValue);

            return (
              <Card key={bill.id} className="p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{bill.billNumber}</p>
                    <p className="text-sm text-ink-secondary">
                      {bill.vendorName} · {bill.projectCode}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{formatCurrency(bill.invoiceValue)}</p>
                    <span
                      className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${paymentStatusClass(bill.paymentStatus)}`}
                    >
                      {bill.paymentStatus.toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-secondary">
                  <span>Invoice: {bill.invoiceNumber || '—'}</span>
                  <span>Invoice date: {bill.invoiceDate ? formatDate(bill.invoiceDate) : '—'}</span>
                  <span>Due: {bill.dueDate ? formatDate(bill.dueDate) : '—'}</span>
                  <span>Aging: {bill.agingDays} days</span>
                  <span>Paid: {formatCurrency(bill.paidAmount)}</span>
                  <span>Outstanding: {formatCurrency(bill.outstandingAmount)}</span>
                  <span>Tally: {bill.tallySyncStatus}</span>
                  {bill.paidDate ? (
                    <span>Last payment: {formatDate(bill.paidDate)}</span>
                  ) : (
                    <span />
                  )}
                </div>

                {bill.paymentRemark ? (
                  <p className="text-xs text-ink-muted border-t border-surface-border pt-2">
                    Note: {bill.paymentRemark}
                  </p>
                ) : null}

                {canRecordPayment && bill.paymentStatus !== 'PAID' && (
                  <div className="border-t border-surface-border pt-3 space-y-2">
                    <p className="text-xs font-semibold text-ink">Record payment</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={`Up to ${formatCurrency(bill.outstandingAmount)}`}
                        value={draft.amount}
                        onChange={(e) => setDraft(bill.id, { amount: e.target.value })}
                      />
                      <Input
                        placeholder="Payment reference / remark"
                        value={draft.remark}
                        onChange={(e) => setDraft(bill.id, { remark: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="accent"
                        disabled={!canSubmit || recordPayment.isPending}
                        onClick={() =>
                          recordPayment.mutate({
                            id: bill.id,
                            paymentAmount: installment,
                            paymentRemark: draft.remark || undefined,
                            tallySyncStatus:
                              installment >= bill.outstandingAmount ? 'SYNCED' : undefined,
                            tallyVoucherId:
                              installment >= bill.outstandingAmount
                                ? `TALLY-${bill.billNumber}`
                                : undefined,
                          })
                        }
                      >
                        Record payment
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={recordPayment.isPending}
                        onClick={() => {
                          setDraft(bill.id, { amount: String(bill.outstandingAmount) });
                          recordPayment.mutate({
                            id: bill.id,
                            paymentAmount: bill.outstandingAmount,
                            paymentRemark: draft.remark || 'Full settlement',
                            tallySyncStatus: 'SYNCED',
                            tallyVoucherId: `TALLY-${bill.billNumber}`,
                          });
                        }}
                      >
                        Pay full &amp; sync Tally
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
