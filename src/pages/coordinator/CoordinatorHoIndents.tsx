import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ChevronRight, FilePlus } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto, ProjectDto } from '@afios/shared';
import { formatProjectLabel } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { toast } from 'sonner';

export function CoordinatorHoIndentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purpose, setPurpose] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects-all'],
    queryFn: async () => {
      const res = await api.get<{ data: ProjectDto[] }>('/projects');
      return res.data.data ?? [];
    },
  });

  const { data: materials } = useQuery({
    queryKey: ['materials-catalog'],
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ id: string; name: string; code: string }> }>('/materials');
      return res.data.data ?? [];
    },
  });

  const { data: indents, ...list } = useQuery({
    queryKey: ['ho-indents'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto[] }>('/material-requests/ho-indents');
      return res.data.data ?? [];
    },
  });

  const pendingApprovals = (indents ?? []).filter((r) => r.status === 'HO_PENDING_COORDINATOR');

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{
        data: { indent: MaterialRequestDto; rfqId: string; rfqNumber: string };
      }>('/material-requests/ho-indents', {
        projectId,
        items: [{ materialId, quantityRequested: parseFloat(quantity) }],
        purpose: purpose.trim(),
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`HO indent created — RFQ ${data.rfqNumber} ready`);
      queryClient.invalidateQueries({ queryKey: ['ho-indents'] });
      setShowForm(false);
      setProjectId('');
      setMaterialId('');
      setQuantity('');
      setPurpose('');
      if (data.rfqId) navigate(`/rfqs/${data.rfqId}`);
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message || 'Could not generate indent'),
  });

  const approveMutation = useMutation({
    mutationFn: async (indentId: string) => {
      const res = await api.post<{ data: { rfqId: string; rfqNumber: string } }>(
        `/material-requests/ho-indents/${indentId}/coordinator-approve`
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`RFQ ${data.rfqNumber} generated`);
      queryClient.invalidateQueries({ queryKey: ['ho-indents'] });
      navigate(`/rfqs/${data.rfqId}`);
    },
    onError: () => toast.error('Approval failed'),
  });

  const canSubmit =
    projectId && materialId && parseFloat(quantity) > 0 && purpose.trim().length > 0;

  return (
    <div className="page-container max-w-full">
      <PageHeader
        title="Generate indent (HO)"
        subtitle="Head Office indents — create here to open RFQ (hidden from site / store / PM)"
        action={
          <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
            <FilePlus className="h-4 w-4" />
            Generate indent
          </Button>
        }
      />

      {showForm && (
        <div className="panel p-3 mb-3 space-y-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
          >
            <option value="">Select project</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
          <select
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
          >
            <option value="">Select material</option>
            {(materials ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
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
          <textarea
            placeholder="Purpose / remarks"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm resize-none"
          />
          <Button
            variant="primary"
            disabled={createMutation.isPending || !canSubmit}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Creating…' : 'Create indent & open RFQ'}
          </Button>
        </div>
      )}

      {!!pendingApprovals.length && (
        <section className="mb-6">
          <h2 className="section-label mb-3">Pending approval (legacy)</h2>
          <div className="space-y-2">
            {pendingApprovals.map((r) => (
              <div
                key={r.id}
                className="panel p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-ink">{r.indentNumber}</p>
                  <p className="text-sm text-ink-secondary mt-0.5">
                    {r.material?.name || r.items?.[0]?.material?.name} · {formatProjectLabel(r.project)}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(r.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve &amp; generate RFQ
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        retrying={list.isFetching && !list.isLoading}
        isEmpty={!indents?.length}
        skeletonRows={3}
        empty={
          <EmptyState
            title="No HO indents yet"
            description="Generate a Head Office indent to create the purchase request and open an RFQ."
          />
        }
      >
        <div className="table-shell">
          <table className="data-table min-w-[64rem]">
            <thead>
              <tr>
                <th>Indent No</th>
                <th>Material</th>
                <th>Project</th>
                <th>Purpose</th>
                <th>Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {(indents ?? []).map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => r.rfqId && navigate(`/rfqs/${r.rfqId}`)}
                >
                  <td className="cell-code whitespace-nowrap">{r.indentNumber}</td>
                  <td className="cell-text">
                    {r.material?.name || r.items?.[0]?.material?.name || '—'}
                  </td>
                  <td className="cell-text whitespace-nowrap">{formatProjectLabel(r.project)}</td>
                  <td className="cell-text">{r.purpose || '—'}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="text-right">
                    <ChevronRight className="h-4 w-4 text-ink-muted inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListQueryBoundary>

      <button
        type="button"
        onClick={() => navigate('/coordinator/material-indents')}
        className="mt-8 text-sm font-semibold text-bekem-accent hover:underline flex items-center gap-1"
      >
        View all material indents
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
