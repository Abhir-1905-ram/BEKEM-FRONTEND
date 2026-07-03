import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { UserRole } from '@afios/shared';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface TransferRow {
  id: string;
  transferNumber: string;
  status: string;
  fromProjectId?: string;
  toProjectId?: string;
  fromProject?: string;
  toProject?: string;
  fromProjectName?: string;
  toProjectName?: string;
  itemCount: number;
  items?: { materialId?: string; materialName?: string; quantity: number }[];
  note?: string;
  rejectionNote?: string;
  requestedBy?: string;
  requestedByUserId?: string;
  destinationApprovedBy?: string;
  canDestinationAccept?: boolean;
  canDestinationReject?: boolean;
  canSourceFinalAccept?: boolean;
  createdAt?: string;
}

interface ProjectRow {
  id: string;
  code: string;
  name: string;
}

interface MaterialRow {
  id: string;
  name: string;
  unit?: string;
}

function statusHint(t: TransferRow, userId?: string) {
  if (t.status === 'PENDING_DESTINATION_PM') {
    return 'Waiting for destination project manager to accept or reject.';
  }
  if (t.status === 'PENDING_SOURCE_FINAL') {
    if (t.requestedByUserId === userId) {
      return `${t.destinationApprovedBy || 'Destination PM'} accepted — waiting for your final approval.`;
    }
    return 'Destination PM accepted — waiting for source project manager final approval.';
  }
  if (t.status === 'REJECTED' && t.rejectionNote) {
    return t.rejectionNote;
  }
  if (t.status === 'APPROVED') {
    return 'Fully approved — ready for store dispatch.';
  }
  return null;
}

export function BranchTransfersPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isPm = role === UserRole.PROJECT_MANAGER;
  const isCoordinator = role === UserRole.COORDINATOR;
  const canCreate = isPm || isCoordinator;

  const assignedFromProjectId = useMemo(() => {
    if (!isPm || !user?.assignedProjectIds?.length) return '';
    return user.assignedProjectIds[0];
  }, [isPm, user?.assignedProjectIds]);

  const [showCreate, setShowCreate] = useState(false);
  const [fromProjectId, setFromProjectId] = useState('');
  const [toProjectId, setToProjectId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    if (isPm && assignedFromProjectId) {
      setFromProjectId(assignedFromProjectId);
    }
  }, [isPm, assignedFromProjectId, showCreate]);

  const { data: transfers, refetch } = useQuery({
    queryKey: ['branch-transfers'],
    queryFn: async () => {
      const res = await api.get<{ data: TransferRow[] }>('/branch-transfers');
      return res.data.data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get<{ data: ProjectRow[] }>('/projects')).data.data,
    enabled: showCreate && canCreate,
  });

  const assignedFromProject = useMemo(
    () => projects?.find((p) => p.id === assignedFromProjectId),
    [projects, assignedFromProjectId]
  );

  const toProjectOptions = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => p.id !== fromProjectId);
  }, [projects, fromProjectId]);

  const { data: materials } = useQuery({
    queryKey: ['materials-catalog'],
    queryFn: async () => (await api.get<{ data: MaterialRow[] }>('/materials')).data.data,
    enabled: showCreate,
  });

  const createTransfer = useMutation({
    mutationFn: async () => {
      await api.post('/branch-transfers', {
        fromProjectId,
        toProjectId,
        items: [{ materialId, quantity: parseFloat(quantity) }],
        note,
      });
    },
    onSuccess: () => {
      toast.success(
        isCoordinator
          ? 'Branch transfer created and approved'
          : 'Request sent to destination project manager'
      );
      setShowCreate(false);
      setToProjectId('');
      setMaterialId('');
      setQuantity('');
      setNote('');
      refetch();
    },
    onError: () => toast.error('Could not create transfer'),
  });

  const destinationAccept = useMutation({
    mutationFn: (id: string) => api.post(`/branch-transfers/${id}/destination-accept`),
    onSuccess: () => {
      toast.success('Accepted — source PM notified for final approval');
      refetch();
    },
    onError: () => toast.error('Accept failed'),
  });

  const destinationReject = useMutation({
    mutationFn: ({ id, note: bodyNote }: { id: string; note?: string }) =>
      api.post(`/branch-transfers/${id}/destination-reject`, { note: bodyNote }),
    onSuccess: () => {
      toast.success('Transfer rejected');
      setRejectId(null);
      setRejectNote('');
      refetch();
    },
    onError: () => toast.error('Reject failed'),
  });

  const sourceFinalAccept = useMutation({
    mutationFn: (id: string) => api.post(`/branch-transfers/${id}/source-final-accept`),
    onSuccess: () => {
      toast.success('Final approval given — ready for dispatch');
      refetch();
    },
    onError: () => toast.error('Final approval failed'),
  });

  const logistics = useMutation({
    mutationFn: async ({ id, step }: { id: string; step: 'dispatch' | 'receive' }) => {
      await api.post(`/branch-transfers/${id}/${step}`);
    },
    onSuccess: () => {
      toast.success('Transfer updated');
      refetch();
    },
    onError: () => toast.error('Action failed'),
  });

  const openCreate = () => {
    if (isPm && assignedFromProjectId) {
      setFromProjectId(assignedFromProjectId);
    }
    setShowCreate((v) => !v);
  };

  return (
    <div className="page-container max-w-lg">
      <PageHeader
        title="Branch transfers"
        subtitle="PM A requests → destination PM accepts → source PM final approval → dispatch"
        action={
          canCreate ? (
            <Button variant="primary" onClick={openCreate}>
              {showCreate ? 'Cancel' : 'New transfer'}
            </Button>
          ) : undefined
        }
      />

      {showCreate && canCreate && (
        <div className="panel p-5 space-y-3 mb-6">
          <label className="text-sm font-medium text-ink-secondary">From project</label>
          {isPm ? (
            <div className="rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm">
              {assignedFromProject ? (
                <>
                  <p className="font-semibold text-ink">
                    {assignedFromProject.code} — {assignedFromProject.name}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">Your assigned project (cannot be changed)</p>
                </>
              ) : (
                <p className="text-ink-muted">Loading assigned project…</p>
              )}
            </div>
          ) : (
            <select
              className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-white"
              value={fromProjectId}
              onChange={(e) => setFromProjectId(e.target.value)}
            >
              <option value="">Select project</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          )}

          <label className="text-sm font-medium text-ink-secondary">To project</label>
          <select
            className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-white"
            value={toProjectId}
            onChange={(e) => setToProjectId(e.target.value)}
          >
            <option value="">Select project</option>
            {toProjectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>

          {isCoordinator && (
            <p className="text-xs text-ink-muted">
              Coordinator transfers are auto-approved and go straight to dispatch.
            </p>
          )}

          <label className="text-sm font-medium text-ink-secondary">Material</label>
          <select
            className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-white"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
          >
            <option value="">Select material</option>
            {materials?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <Input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />

          <Button
            variant="primary"
            disabled={
              !fromProjectId ||
              !toProjectId ||
              fromProjectId === toProjectId ||
              !materialId ||
              !quantity ||
              createTransfer.isPending
            }
            onClick={() => createTransfer.mutate()}
          >
            Submit request
          </Button>
        </div>
      )}

      {!transfers?.length ? (
        <EmptyState
          title="No transfers"
          description="Create a branch transfer to move stock between projects."
        />
      ) : (
        <div className="space-y-3">
          {transfers.map((t) => {
            const hint = statusHint(t, user?.id);
            return (
              <div key={t.id} className="panel p-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <p className="font-semibold">{t.transferNumber}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-sm text-ink-secondary">
                  {t.fromProject} → {t.toProject}
                </p>
                {hint && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                    {hint}
                  </p>
                )}
                {t.items?.map((item, i) => (
                  <p key={i} className="text-xs text-ink-muted">
                    {item.materialName}: {item.quantity}
                  </p>
                ))}
                {t.note && <p className="text-xs text-ink-muted">Note: {t.note}</p>}
                {t.requestedBy && (
                  <p className="text-xs text-ink-muted">Requested by {t.requestedBy}</p>
                )}

                {rejectId === t.id ? (
                  <div className="space-y-2 pt-1">
                    <Input
                      placeholder="Rejection reason (optional)"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={destinationReject.isPending}
                        onClick={() =>
                          destinationReject.mutate({ id: t.id, note: rejectNote || undefined })
                        }
                      >
                        Confirm reject
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setRejectId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {t.canDestinationAccept && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={destinationAccept.isPending}
                        onClick={() => destinationAccept.mutate(t.id)}
                      >
                        Accept (destination PM)
                      </Button>
                    )}
                    {t.canDestinationReject && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setRejectId(t.id)}
                      >
                        Reject
                      </Button>
                    )}
                    {t.canSourceFinalAccept && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={sourceFinalAccept.isPending}
                        onClick={() => sourceFinalAccept.mutate(t.id)}
                      >
                        Final approval (source PM)
                      </Button>
                    )}
                    {isCoordinator && t.status === 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={logistics.isPending}
                        onClick={() => logistics.mutate({ id: t.id, step: 'dispatch' })}
                      >
                        Dispatch
                      </Button>
                    )}
                    {isCoordinator && t.status === 'DISPATCHED' && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={logistics.isPending}
                        onClick={() => logistics.mutate({ id: t.id, step: 'receive' })}
                      >
                        Receive
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
