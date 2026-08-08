import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialAvailabilityDto, MaterialDto, ProjectDto } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { MaterialSearch } from '@/components/layout/MaterialSearch';
import { MaterialAvailabilityPanel } from '@/components/MaterialAvailabilityPanel';
import { IndentCategorySelect } from '@/components/IndentCategorySelect';
import { toast } from 'sonner';
import axios from 'axios';

function showActionError(err: unknown, fallback: string) {
  // Axios errors are already toasted by the API interceptor.
  if (axios.isAxiosError(err)) return;
  toast.error(err instanceof Error ? err.message : fallback);
}

export function PmMaterialLookupPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<MaterialDto | null>(null);
  const [fromProjectId, setFromProjectId] = useState('');
  const [toProjectId, setToProjectId] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [procurementQty, setProcurementQty] = useState('');
  const [purpose, setPurpose] = useState('');
  const [procurementProjectId, setProcurementProjectId] = useState('');
  const [indentCategoryId, setIndentCategoryId] = useState('');

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

  /** Company projects that currently hold stock — valid BT sources. */
  const projectsWithStock = useMemo(() => {
    if (!availability) return [];
    return availability.projectWise.filter((p) => p.availableQty > 0);
  }, [availability]);

  /** Destination must be a project this PM manages. */
  const destinationProjects = useMemo(() => {
    return (projects ?? []).filter((p) => p.id !== fromProjectId);
  }, [projects, fromProjectId]);

  useEffect(() => {
    if (!toProjectId && destinationProjects.length === 1) {
      setToProjectId(destinationProjects[0].id);
    }
  }, [destinationProjects, toProjectId]);

  useEffect(() => {
    if (!procurementProjectId && (projects?.length ?? 0) === 1) {
      setProcurementProjectId(projects![0].id);
    }
  }, [projects, procurementProjectId]);

  const branchTransferMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !fromProjectId || !toProjectId || !transferQty) {
        throw new Error('Complete branch transfer details');
      }
      if (fromProjectId === toProjectId) {
        throw new Error('Source and destination projects must differ');
      }
      const qty = parseFloat(transferQty);
      if (!(qty > 0)) {
        throw new Error('Enter a valid quantity');
      }
      const source = projectsWithStock.find((p) => p.projectId === fromProjectId);
      if (source && qty > source.availableQty) {
        throw new Error(`Only ${source.availableQty} available at source project`);
      }
      await api.post('/branch-transfers', {
        fromProjectId,
        toProjectId,
        items: [{ materialId: selected.id, quantity: qty }],
        note: `PM stock transfer request for ${selected.name}`,
      });
    },
    onSuccess: () => {
      toast.success('Branch transfer submitted to Head Office');
      queryClient.invalidateQueries({ queryKey: ['pm-branch-transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-availability', selected?.id] });
      setFromProjectId('');
      setTransferQty('');
    },
    onError: (err: Error) => showActionError(err, 'Could not submit branch transfer'),
  });

  const procurementMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !procurementProjectId || !procurementQty || !purpose.trim() || !indentCategoryId) {
        throw new Error('Complete procurement details including indent category');
      }
      const qty = parseFloat(procurementQty);
      if (!(qty > 0)) {
        throw new Error('Enter a valid quantity');
      }
      await api.post('/material-requests/pm-procurement', {
        projectId: procurementProjectId,
        items: [{ materialId: selected.id, quantityRequested: qty }],
        purpose: purpose.trim(),
        indentCategoryId,
      });
    },
    onSuccess: () => {
      toast.success('Procurement request sent to Executive');
      setPurpose('');
      setProcurementQty('');
      setIndentCategoryId('');
    },
    onError: (err: Error) => showActionError(err, 'Could not submit procurement request'),
  });

  return (
    <div className="page-container max-w-full">
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
          setTransferQty('');
          setProcurementQty('');
          setIndentCategoryId('');
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
              <p className="text-xs text-ink-muted">
                Pull stock from any company project into one of your projects. Head Office approves.
              </p>
              {availability && projectsWithStock.length === 0 ? (
                <p className="text-sm text-warning-dark rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
                  No company stock available for this material. Use New procurement instead.
                </p>
              ) : null}
              <select
                value={fromProjectId}
                onChange={(e) => {
                  setFromProjectId(e.target.value);
                  if (e.target.value === toProjectId) setToProjectId('');
                }}
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
                <option value="">To your project</option>
                {destinationProjects.map((p) => (
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
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              />
              <Button
                variant="secondary"
                className="w-full"
                disabled={
                  branchTransferMutation.isPending ||
                  !fromProjectId ||
                  !toProjectId ||
                  !transferQty ||
                  projectsWithStock.length === 0
                }
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
              <IndentCategorySelect
                value={indentCategoryId}
                onChange={setIndentCategoryId}
                className="h-auto rounded-lg border border-surface-border px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="Quantity required"
                value={procurementQty}
                onChange={(e) => setProcurementQty(e.target.value)}
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
                disabled={
                  procurementMutation.isPending ||
                  !procurementProjectId ||
                  !indentCategoryId ||
                  !procurementQty ||
                  !purpose.trim()
                }
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
