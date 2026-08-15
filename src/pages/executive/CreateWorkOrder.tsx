import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  ROLE_COLORS,
  UserRole,
  formatCurrency,
  type PurchaseOrderDto,
  type WorkOrderDto,
} from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SuccessScreen } from '@/components/SuccessScreen';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

/** Prefill WO qty/unit from the approved PO's line items (already agreed on the PO). */
function quantityFromPo(po: PurchaseOrderDto): { qty: string; unit: string } {
  const lines = po.lineItems || [];
  if (!lines.length) return { qty: '', unit: 'Units' };
  const total = lines.reduce((sum, li) => sum + Number(li.quantity || 0), 0);
  const unit =
    lines.map((li) => String(li.unit || '').trim()).find(Boolean) || 'Units';
  return {
    qty: total > 0 ? String(total) : '',
    unit,
  };
}

export function CreateWorkOrderPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const accent =
    ROLE_COLORS[
      role === UserRole.COORDINATOR ? UserRole.COORDINATOR : UserRole.EXECUTIVE
    ].primary;
  const homeHref =
    role === UserRole.COORDINATOR ? '/coordinator' : '/executive';
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderDto | null>(null);
  const [scope, setScope] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('Units');
  const [createdWo, setCreatedWo] = useState<WorkOrderDto | null>(null);
  const [selectingPo, setSelectingPo] = useState(false);

  const applyPoDefaults = (po: PurchaseOrderDto) => {
    setSelectedPo(po);
    setScope(
      po.purchaseRequest?.project?.name
        ? `Execution — ${po.purchaseRequest.project.name}`
        : ''
    );
    const { qty, unit } = quantityFromPo(po);
    setTotalQuantity(qty);
    setQuantityUnit(unit);
  };

  const selectPo = async (po: PurchaseOrderDto) => {
    setSelectingPo(true);
    try {
      // Always load full PO so quantity/unit match the approved order lines.
      const res = await api.get<{ data: PurchaseOrderDto }>(
        `/purchase-orders/${po.id}`
      );
      applyPoDefaults(res.data.data || po);
    } catch {
      applyPoDefaults(po);
      toast.error('Could not load PO lines — enter quantity manually');
    } finally {
      setSelectingPo(false);
    }
  };

  const { data: approvedPos, list } = useListQuery({
    queryKey: ['approved-pos-for-wo'],
    queryFn: async () => {
      const [poRes, woRes] = await Promise.all([
        api.get<{ data: PurchaseOrderDto[] }>('/purchase-orders', { params: { status: 'APPROVED' } }),
        api.get<{ data: WorkOrderDto[] }>('/work-orders'),
      ]);
      const pos = normalizeListData<PurchaseOrderDto>(poRes.data.data);
      const workOrders = normalizeListData<WorkOrderDto>(woRes.data.data);
      const usedPoIds = new Set(workOrders.map((w) => w.purchaseOrderId));
      return pos.filter((po) => !usedPoIds.has(po.id));
    },
  });

  const createWo = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: WorkOrderDto }>('/work-orders', {
        purchaseOrderId: selectedPo!.id,
        scope,
        totalQuantity: parseFloat(totalQuantity),
        quantityUnit,
      });
      return res.data.data;
    },
    onSuccess: (wo) => {
      toast.success('Work order created');
      setCreatedWo(wo);
    },
    onError: () => toast.error('Failed to create work order'),
  });

  if (createdWo) {
    return (
      <SuccessScreen
        title="Work order created!"
        message={`${createdWo.woNumber} is pending coordinator verification. Contractor acceptance is required before work can start.`}
        accentColor={accent}
        primaryAction={{
          label: 'View work order',
          onClick: () => navigate(`/work-orders/${createdWo.id}`),
        }}
        secondaryAction={{ label: 'Back to home', onClick: () => navigate(homeHref) }}
      />
    );
  }

  return (
    <div className="page-container max-w-lg mx-auto">
      <header className="flex items-center gap-3 mb-3">
        <button
          onClick={() => navigate('/work-orders')}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-semibold text-lg">Generate work order</h1>
          <p className="text-sm text-ink-secondary">From an approved purchase order</p>
        </div>
      </header>

      {!selectedPo ? (
        <>
          <h2 className="text-sm font-semibold text-ink mb-3">Select approved PO</h2>
          <ListQueryBoundary
            isLoading={list.isLoading}
            isError={list.isError}
            onRetry={list.onRetry}
            retrying={list.retrying}
            isEmpty={!approvedPos?.length}
            skeletonRows={3}
            empty={
              <EmptyState
                title="No approved POs available"
                description="Complete PO approval first, or all approved POs already have work orders."
              />
            }
          >
            <div className="space-y-2">
              {(approvedPos ?? []).map((po) => (
                <Card
                  key={po.id}
                  className={cn(
                    'cursor-pointer hover:border-bekem-accent transition-colors py-3',
                    selectingPo && 'opacity-60 pointer-events-none'
                  )}
                  onClick={() => void selectPo(po)}
                >
                  <p className="font-semibold text-ink">{po.poNumber}</p>
                  <p className="text-sm text-ink-secondary">
                    {po.vendor?.name} · {formatCurrency(po.amount)}
                  </p>
                  {po.purchaseRequest?.project && (
                    <p className="text-xs text-ink-muted mt-1">
                      {po.purchaseRequest.project.code} — {po.purchaseRequest.project.name}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </ListQueryBoundary>
        </>
      ) : (
        <div className="space-y-3">
          <Card className="py-3">
            <p className="text-xs text-ink-muted">Selected PO</p>
            <p className="font-semibold">{selectedPo.poNumber}</p>
            <p className="text-sm text-ink-secondary">
              Contractor: {selectedPo.vendor?.name} · {formatCurrency(selectedPo.amount)}
            </p>
            {(selectedPo.lineItems?.length ?? 0) > 0 && (
              <p className="text-xs text-ink-muted mt-1">
                From PO lines:{' '}
                {(selectedPo.lineItems || [])
                  .map(
                    (li) =>
                      `${li.quantity ?? 0} ${li.unit || ''}`.trim() +
                      (li.description ? ` (${li.description})` : '')
                  )
                  .join(' · ')}
              </p>
            )}
            <button
              type="button"
              className="text-sm text-bekem-accent mt-2 hover:underline"
              onClick={() => {
                setSelectedPo(null);
                setScope('');
                setTotalQuantity('');
                setQuantityUnit('Units');
              }}
            >
              Change PO
            </button>
          </Card>

          <div>
            <label className="text-sm font-medium text-ink">Scope of work</label>
            <Input
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="e.g. Supply and execution per approved PO"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink">Total quantity</label>
              <Input
                type="number"
                min={1}
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                placeholder="From PO"
                className="mt-1"
              />
              <p className="text-[11px] text-ink-muted mt-1">Prefilled from the selected PO</p>
            </div>
            <div>
              <label className="text-sm font-medium text-ink">Unit</label>
              <Input
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
                placeholder="Unit"
                className="mt-1"
              />
            </div>
          </div>

          <Button
            variant="accent"
            size="lg"
            accentColor={accent}
            className="w-full"
            disabled={!scope.trim() || !totalQuantity || createWo.isPending}
            onClick={() => createWo.mutate()}
          >
            Generate work order
          </Button>
        </div>
      )}
    </div>
  );
}
