import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialAvailabilityDto, MaterialDto, ProjectDto } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { MaterialSearch } from '@/components/layout/MaterialSearch';
import { MaterialAvailabilityPanel } from '@/components/MaterialAvailabilityPanel';
import { toast } from 'sonner';

export function PmMaterialLookupPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<MaterialDto | null>(null);
  const [fromProjectId, setFromProjectId] = useState('');
  const [toProjectId, setToProjectId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purpose, setPurpose] = useState('');
  const [procurementProjectId, setProcurementProjectId] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['pm-projects'],
    queryFn: async () => {
      const res = await api.get<{ data: ProjectDto[] }>('/projects');
      return res.data.data ?? [];
    },
  });

  const { data: availability, isFetching: availabilityLoading } = useQuery({
    queryKey: ['material-availability', selected?.id],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialAvailabilityDto }>(
        `/stock/material-availability/${selected!.id}`
      );
      return res.data.data;
    },
    enabled: !!selected?.id,
  });

  const projectsWithStock = useMemo(() => {
    if (!availability) return [];
    return availability.projectWise.filter((p) => p.availableQty > 0);
  }, [availability]);

  const branchTransferMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !fromProjectId || !toProjectId || !quantity) {
        throw new Error('Complete branch transfer details');
      }
      await api.post('/branch-transfers', {
        fromProjectId,
        toProjectId,
        items: [{ materialId: selected.id, quantity: parseFloat(quantity) }],
        note: `PM stock transfer request for ${selected.name}`,
      });
    },
    onSuccess: () => {
      toast.success('Branch transfer submitted to Head Office');
      queryClient.invalidateQueries({ queryKey: ['pm-branch-transfer-requests'] });
      setFromProjectId('');
      setToProjectId('');
      setQuantity('');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not submit branch transfer'),
  });

  const procurementMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !procurementProjectId || !quantity || !purpose.trim()) {
        throw new Error('Complete procurement details');
      }
      await api.post('/material-requests/pm-procurement', {
        projectId: procurementProjectId,
        items: [{ materialId: selected.id, quantityRequested: parseFloat(quantity) }],
        purpose: purpose.trim(),
      });
    },
    onSuccess: () => {
      toast.success('Procurement request sent to Executive');
      setPurpose('');
      setQuantity('');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not submit procurement request'),
  });

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="Material search"
        subtitle="Search materials and act on stock without leaving this page"
      />

      <MaterialSearch
        onSelect={(m) => {
          setSelected(m);
          setFromProjectId('');
          setToProjectId('');
          setProcurementProjectId('');
        }}
      />

      {selected && (
        <div className="space-y-3">
          <div className="panel p-3">
            <p className="font-semibold text-ink">{selected.name}</p>
            <p className="text-sm text-ink-secondary mt-0.5">
              {selected.code}
              {selected.unit ? ` · ${selected.unit}` : ''}
            </p>
          </div>

          {availabilityLoading && (
            <p className="text-sm text-ink-muted text-center py-6">Loading availability…</p>
          )}
          {availability && <MaterialAvailabilityPanel availability={availability} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="panel p-3 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-bekem-accent" />
                <h3 className="font-semibold text-ink">Branch transfer</h3>
              </div>
              <select
                value={fromProjectId}
                onChange={(e) => setFromProjectId(e.target.value)}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              >
                <option value="">From project (with stock)</option>
                {projectsWithStock.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectCode} — {p.availableQty} available
                  </option>
                ))}
              </select>
              <select
                value={toProjectId}
                onChange={(e) => setToProjectId(e.target.value)}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              >
                <option value="">To project</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              />
              <Button
                variant="secondary"
                className="w-full"
                disabled={branchTransferMutation.isPending}
                onClick={() => branchTransferMutation.mutate()}
              >
                Request branch transfer
              </Button>
            </div>

            <div className="panel p-3 space-y-3 border-bekem-accent/20">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-bekem-accent" />
                <h3 className="font-semibold text-ink">New procurement</h3>
              </div>
              <select
                value={procurementProjectId}
                onChange={(e) => setProcurementProjectId(e.target.value)}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              >
                <option value="">Project</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="Quantity required"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Reason for procurement"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm resize-none"
              />
              <Button
                variant="primary"
                className="w-full"
                disabled={procurementMutation.isPending}
                onClick={() => procurementMutation.mutate()}
              >
                New procurement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
