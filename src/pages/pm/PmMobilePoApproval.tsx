import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { requireBiometricConfirm } from '@/lib/biometricGate';
import type { PurchaseOrderDto } from '@afios/shared';
import { formatCurrency } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { GstSummaryBar } from '@/components/GstSummaryBar';

export function PmMobilePoApprovalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: po, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto }>(`/purchase-orders/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  const approve = useMutation({
    mutationFn: async () => {
      const ok = await requireBiometricConfirm('Approve purchase order');
      if (!ok) throw new Error('Biometric confirmation cancelled');
      await api.post(`/purchase-orders/${id}/pm-approve`, { note: 'Approved via mobile' });
    },
    onSuccess: () => {
      toast.success('Purchase order approved');
      queryClient.invalidateQueries({ queryKey: ['po-queue-pm'] });
      navigate('/pm/approve-pos');
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      if (e.message !== 'Biometric confirmation cancelled') {
        toast.error(e.response?.data?.message || e.message || 'Approval failed');
      }
    },
  });

  const firstLine = po?.lineItems?.[0];

  return (
    <div className="min-h-[100dvh] bg-surface-muted px-4 py-6 max-w-lg mx-auto safe-bottom">
      <PageHeader title="Approve PO" subtitle="Low-value PO — confirm with Face ID / fingerprint" />

      <ListQueryBoundary isLoading={isLoading} isError={isError} onRetry={() => refetch()} empty={<></>}>
        {po && (
          <div className="panel p-4 space-y-4 mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-ink">{po.poNumber || po.draftRef || 'Draft PO'}</p>
              <StatusBadge status={po.status} />
            </div>
            <p className="text-sm text-ink-secondary">{po.vendor?.name || 'Vendor'}</p>
            <p className="text-2xl font-bold tabular-nums text-bekem-navy">
              {formatCurrency(po.amount)}
            </p>
            {po.approvalRoutingNote && (
              <p className="text-xs text-ink-muted">{po.approvalRoutingNote}</p>
            )}
            <div className="space-y-2 border-t border-surface-border pt-3">
              {(po.lineItems ?? []).map((line, idx) => (
                <div key={idx} className="flex justify-between gap-2 text-sm">
                  <span className="text-ink-secondary truncate">{line.description}</span>
                  <span className="tabular-nums font-medium shrink-0">
                    {line.quantity} × ₹{line.rate}
                  </span>
                </div>
              ))}
            </div>
            {po.lineItems && po.lineItems.length > 1 && firstLine && (
              <GstSummaryBar
                quantity={po.lineItems.reduce((s, l) => s + l.quantity, 0)}
                rate={po.amount / Math.max(1, po.lineItems.reduce((s, l) => s + l.quantity, 0))}
                gstPercent={firstLine.gstPercent ?? 18}
                compact
              />
            )}
            {firstLine && po.lineItems?.length === 1 && (
              <GstSummaryBar
                quantity={firstLine.quantity}
                rate={firstLine.rate}
                gstPercent={firstLine.gstPercent ?? 18}
                compact
              />
            )}
            <p className="text-[11px] text-ink-muted">
              Web biometric gate — use Face ID / fingerprint when supported on this device.
            </p>
            <div className="grid grid-cols-1 gap-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                className="h-14 gap-2"
                disabled={approve.isPending || po.status !== 'PM_PENDING'}
                onClick={() => approve.mutate()}
              >
                <Fingerprint className="h-5 w-5" />
                Approve PO
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="h-12"
                onClick={() => navigate('/pm/approve-pos')}
              >
                Back to queue
              </Button>
            </div>
          </div>
        )}
      </ListQueryBoundary>
    </div>
  );
}
