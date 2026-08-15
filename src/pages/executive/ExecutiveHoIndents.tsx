import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, FilePlus } from 'lucide-react';
import { api } from '@/lib/api';
import type { MaterialRequestDto, ProjectDto } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { toast } from 'sonner';

export function ExecutiveHoIndentsPage() {
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

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/material-requests/ho-indents', {
        projectId,
        items: [{ materialId, quantityRequested: parseFloat(quantity) }],
        purpose: purpose.trim(),
      });
    },
    onSuccess: () => {
      toast.success('HO indent submitted for Coordinator approval');
      queryClient.invalidateQueries({ queryKey: ['ho-indents'] });
      setShowForm(false);
      setProjectId('');
      setMaterialId('');
      setQuantity('');
      setPurpose('');
    },
    onError: () => toast.error('Could not generate indent'),
  });

  return (
    <div className="page-container max-w-full">
      <PageHeader
        title="HO indents"
        subtitle="Executive → Coordinator approval → RFQ generation (Head Office only)"
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
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Submit for Coordinator approval
          </Button>
        </div>
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
            description="Generate an indent to start the Executive → Coordinator → RFQ workflow."
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
                  <td className="cell-text">{r.material?.name || r.items?.[0]?.material?.name || '—'}</td>
                  <td className="cell-text whitespace-nowrap">{r.project?.code || '—'}</td>
                  <td className="cell-text">{r.purpose || '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-right"><ChevronRight className="h-4 w-4 text-ink-muted inline-block" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListQueryBoundary>
    </div>
  );
}
