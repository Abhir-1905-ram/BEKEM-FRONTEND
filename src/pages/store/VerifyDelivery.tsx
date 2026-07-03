import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ROLE_COLORS, UserRole, formatDate, type PurchaseOrderDto, type PoLineItemDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/EmptyState';
import { QuantityStepper } from '@/components/QuantityStepper';
import { ArrowLeft } from 'lucide-react';

export function VerifyDeliveryPage() {
  const accent = ROLE_COLORS[UserRole.STORE_INCHARGE].primary;
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderDto | null>(null);
  const [receivedByLine, setReceivedByLine] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState('');

  const { data: orders, refetch } = useQuery({
    queryKey: ['pending-delivery-verify'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[] }>('/delivery-verifications/pending');
      return res.data.data;
    },
  });

  const verify = useMutation({
    mutationFn: async () => {
      const items = (selectedPo?.lineItems || []).map((line: PoLineItemDto) => ({
        materialId: line.materialId!,
        quantityOrdered: line.quantity,
        quantityVerified: receivedByLine[line.materialId!] ?? line.quantity,
        condition: 'OK',
      }));
      await api.post('/delivery-verifications', {
        purchaseOrderId: selectedPo!.id,
        items,
        remarks,
      });
    },
    onSuccess: () => {
      toast.success('Physical delivery verified — inventory coordinator can create GRN');
      setSelectedPo(null);
      setRemarks('');
      setReceivedByLine({});
      refetch();
    },
    onError: () => toast.error('Verification failed'),
  });

  const selectPo = (po: PurchaseOrderDto) => {
    setSelectedPo(po);
    const initial: Record<string, number> = {};
    po.lineItems?.forEach((line) => {
      if (line.materialId) initial[line.materialId] = line.quantity;
    });
    setReceivedByLine(initial);
  };

  if (selectedPo) {
    const project = selectedPo.purchaseRequest?.project;
    return (
      <div className="page-container max-w-lg">
        <button
          type="button"
          onClick={() => setSelectedPo(null)}
          className="flex items-center gap-2 text-sm text-ink-secondary mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <PageHeader
          title={`PO #${selectedPo.displayPoNumber || '—'}`}
          subtitle={selectedPo.procurementRef || selectedPo.poNumber}
        />

        <div className="panel p-4 mb-4 space-y-2 text-sm">
          <p>
            <span className="text-ink-muted">Project:</span> {project?.name || '—'}
          </p>
          <p>
            <span className="text-ink-muted">Vendor:</span> {selectedPo.vendor?.name}
          </p>
          <p>
            <span className="text-ink-muted">FY:</span> {selectedPo.financialYear || '—'}
          </p>
        </div>

        <p className="text-sm font-medium mb-3">Verify quantities received at store gate</p>
        <div className="space-y-3 mb-4">
          {selectedPo.lineItems?.map((line) => (
            <div key={line.id || line.materialId} className="panel p-4">
              <p className="font-medium text-sm">{line.description}</p>
              <p className="text-xs text-ink-muted mb-2">Ordered: {line.quantity}</p>
              <QuantityStepper
                value={receivedByLine[line.materialId!] ?? line.quantity}
                onChange={(v) =>
                  setReceivedByLine((prev) => ({ ...prev, [line.materialId!]: v }))
                }
                min={0}
                max={line.quantity * 2}
              />
            </div>
          ))}
        </div>

        <Input
          placeholder="Remarks (damage, short supply, etc.)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="mb-4"
        />

        <Button
          variant="accent"
          accentColor={accent}
          size="lg"
          className="w-full"
          disabled={verify.isPending}
          onClick={() => verify.mutate()}
        >
          Confirm physical verification
        </Button>
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="Verify delivery"
        subtitle="Physical check at project store — does not update inventory"
      />

      {!orders?.length ? (
        <EmptyState
          title="No deliveries to verify"
          description="Approved POs awaiting vendor dispatch will appear here."
        />
      ) : (
        <div className="space-y-2">
          {orders.map((po) => (
            <button
              key={po.id}
              type="button"
              onClick={() => selectPo(po)}
              className="panel w-full p-4 text-left hover:shadow-card-hover"
            >
              <p className="font-semibold">PO #{po.displayPoNumber || '—'}</p>
              <p className="text-xs text-ink-muted mt-0.5">{po.procurementRef || po.poNumber}</p>
              <p className="text-sm text-ink-secondary mt-1">
                {po.vendor?.name} · {po.purchaseRequest?.project?.code}
              </p>
              <p className="text-xs text-ink-muted mt-1">{formatDate(po.createdAt)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
