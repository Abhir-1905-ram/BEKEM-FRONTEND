import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ROLE_COLORS, UserRole, formatDate, type PurchaseOrderDto, type PoLineItemDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { QuantityStepper } from '@/components/QuantityStepper';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export function VerifyDeliveryPage() {
  const accent = ROLE_COLORS[UserRole.STORE_INCHARGE].primary;
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderDto | null>(null);
  const [receivedByLine, setReceivedByLine] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState('');

  const { data: orders, list, refetch } = useListQuery({
    queryKey: ['pending-delivery-verify'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrderDto[] }>('/delivery-verifications/pending');
      return normalizeListData<PurchaseOrderDto>(res.data.data);
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
      toast.success('Physical delivery verified — GRN can be created next');
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
      <div className="page-container max-w-4xl">
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

        <div className="panel p-3 mb-4 space-y-2 text-sm">
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
        <div className="table-shell mb-4">
          <table className="data-table min-w-[44rem]">
            <thead>
              <tr>
                <th>Material</th>
                <th className="num">Ordered</th>
                <th className="num">Verified</th>
              </tr>
            </thead>
            <tbody>
              {selectedPo.lineItems?.map((line) => (
                <tr key={line.id || line.materialId}>
                  <td className="cell-text">{line.description}</td>
                  <td className="num tabular-nums">{line.quantity}</td>
                  <td>
                    <QuantityStepper
                      value={receivedByLine[line.materialId!] ?? line.quantity}
                      onChange={(v) =>
                        setReceivedByLine((prev) => ({ ...prev, [line.materialId!]: v }))
                      }
                      min={0}
                      max={line.quantity * 2}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="page-container max-w-full">
      <PageHeader
        title="Verify delivery"
        subtitle="Physical check at project store — does not update inventory"
      />

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!orders?.length}
        empty={
          <EmptyState
            title="No deliveries to verify"
            description="Approved POs awaiting vendor dispatch will appear here."
          />
        }
      >
        <div className="table-shell">
          <table className="data-table min-w-[64rem]">
            <thead>
              <tr>
                <th>PO No</th>
                <th>Reference</th>
                <th>Vendor</th>
                <th>Project</th>
                <th>Date</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((po) => (
                <tr key={po.id} className="cursor-pointer" onClick={() => selectPo(po)}>
                  <td className="cell-code whitespace-nowrap">PO #{po.displayPoNumber || '—'}</td>
                  <td className="cell-text whitespace-nowrap">{po.procurementRef || po.poNumber}</td>
                  <td className="cell-text">{po.vendor?.name || '—'}</td>
                  <td className="cell-text whitespace-nowrap">{po.purchaseRequest?.project?.code || '—'}</td>
                  <td className="whitespace-nowrap">{formatDate(po.createdAt)}</td>
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
