import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_COLORS, UserRole, type BranchTransferDto } from '@afios/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusTimeline } from '@/components/StatusTimeline';
import { SuccessScreen } from '@/components/SuccessScreen';
import { SearchSelect } from '@/components/SearchSelect';
import type { MaterialSearchResultDto } from '@afios/shared';
import { getRoleHomePath } from '@/lib/rolePaths';

export function BranchTransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user)!;
  const role = user.role as UserRole;
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');
  const [decisionMode, setDecisionMode] = useState<'idle' | 'transfer' | 'raise_po'>('idle');
  const [fromProjectId, setFromProjectId] = useState('');
  const [toProjectId, setToProjectId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');

  const accent =
    role === UserRole.COORDINATOR
      ? ROLE_COLORS[UserRole.COORDINATOR].primary
      : ROLE_COLORS[UserRole.PROJECT_MANAGER].primary;

  const { data: transfer, isLoading } = useQuery({
    queryKey: ['branch-transfer', id],
    queryFn: async () => {
      const res = await api.get<{ data: BranchTransferDto }>(`/branch-transfers/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['branch-transfer', id] });
    queryClient.invalidateQueries({ queryKey: ['branch-transfers'] });
    queryClient.invalidateQueries({ queryKey: ['pm-branch-transfer-approvals'] });
  };

  const pmApprove = useMutation({
    mutationFn: () => api.post(`/branch-transfers/${id}/pm-approve`, { note }),
    onSuccess: () => {
      setDoneMessage('Branch transfer approved — sent to Coordinator for decision');
      setDone(true);
    },
    onError: () => toast.error('Approval failed'),
    onSettled: invalidate,
  });

  const pmReject = useMutation({
    mutationFn: () => api.post(`/branch-transfers/${id}/pm-reject`, { note }),
    onSuccess: () => {
      setDoneMessage('Branch transfer rejected');
      setDone(true);
    },
    onError: () => toast.error('Rejection failed'),
    onSettled: invalidate,
  });

  const coordinatorDecide = useMutation({
    mutationFn: (decision: 'transfer' | 'raise_po_instead') =>
      api.post(`/branch-transfers/${id}/coordinator-decide`, {
        decision,
        note,
        fromProjectId: fromProjectId || transfer?.fromProjectId,
        toProjectId: toProjectId || transfer?.toProjectId,
        items:
          materialId && quantity
            ? [{ materialId, quantity: parseFloat(quantity) }]
            : transfer?.items?.map((i) => ({
                materialId: i.materialId!,
                quantity: i.quantity,
              })),
      }),
    onSuccess: (res, decision) => {
      if (decision === 'raise_po_instead') {
        const redirect = res.data.data.redirect;
        if (redirect?.path) {
          navigate(redirect.path);
          toast.success('Redirecting to PO workflow');
          return;
        }
        setDoneMessage('Marked to raise PO instead — indent forwarded to PM');
      } else {
        setDoneMessage('Transfer confirmed — execute when ready');
      }
      setDone(true);
    },
    onError: () => toast.error('Decision failed'),
    onSettled: invalidate,
  });

  const execute = useMutation({
    mutationFn: () => api.post(`/branch-transfers/${id}/execute`, { note }),
    onSuccess: () => {
      setDoneMessage('Stock transferred successfully — no PO created');
      setDone(true);
    },
    onError: () => toast.error('Transfer execution failed'),
    onSettled: invalidate,
  });

  if (done) {
    return (
      <SuccessScreen
        title="Done!"
        message={doneMessage}
        accentColor={accent}
        primaryAction={{ label: 'Back to home', onClick: () => navigate(getRoleHomePath(role)) }}
      />
    );
  }

  if (isLoading || !transfer) {
    return <div className="p-6 h-40 bg-surface-muted animate-pulse rounded-xl mx-4 mt-4" />;
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-semibold">{transfer.transferNumber}</h1>
          <StatusBadge status={transfer.status} className="mt-1" />
        </div>
      </header>

      <Card className="space-y-3 mb-6">
        <div>
          <p className="text-xs text-gray-500">Route</p>
          <p className="font-medium">
            {transfer.fromProjectName || transfer.fromProject} → {transfer.toProjectName || transfer.toProject}
          </p>
        </div>
        {transfer.items?.map((item, i) => (
          <div key={i}>
            <p className="text-xs text-gray-500">Material</p>
            <p className="font-medium">
              {item.materialName}: {item.quantity}
            </p>
          </div>
        ))}
        {transfer.note && (
          <div>
            <p className="text-xs text-gray-500">Note</p>
            <p className="text-sm">{transfer.note}</p>
          </div>
        )}
        {transfer.requestedBy && (
          <p className="text-xs text-ink-muted">Requested by {transfer.requestedBy}</p>
        )}
      </Card>

      <h2 className="font-semibold text-sm mb-3">Timeline</h2>
      <StatusTimeline entityType="BranchTransfer" entityId={transfer.id} />

      {(transfer.canPmApprove || transfer.canPmReject) && (
        <div className="mt-6 space-y-3 border-t border-surface-border pt-6">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)…"
          />
          <Button
            variant="accent"
            size="lg"
            accentColor={accent}
            disabled={pmApprove.isPending}
            onClick={() => pmApprove.mutate()}
          >
            Approve branch transfer
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="text-danger"
            disabled={pmReject.isPending}
            onClick={() => pmReject.mutate()}
          >
            Reject
          </Button>
        </div>
      )}

      {transfer.canCoordinatorDecide && (
        <div className="mt-6 space-y-4 border-t border-surface-border pt-6">
          <h2 className="font-semibold text-sm">Coordinator decision</h2>
          <p className="text-sm text-ink-secondary">
            Confirm stock transfer between projects, or redirect this need into the normal PO workflow.
          </p>

          {decisionMode === 'transfer' && (
            <div className="space-y-3 rounded-xl border border-surface-border p-4">
              <label className="text-sm font-medium">Source project</label>
              <SearchSelect
                value={fromProjectId || transfer.fromProjectId || null}
                onChange={(pid) => setFromProjectId(pid)}
                searchPath="/branch-transfers/targets/search"
                searchParams={
                  toProjectId || transfer.toProjectId
                    ? { excludeProjectId: (toProjectId || transfer.toProjectId)! }
                    : undefined
                }
                mapResult={(raw) => {
                  const p = raw as { id: string; code: string; name: string };
                  return { id: p.id, label: `${p.code} — ${p.name}` };
                }}
                placeholder="Search source project…"
              />
              <label className="text-sm font-medium">Destination project</label>
              <SearchSelect
                value={toProjectId || transfer.toProjectId || null}
                onChange={(pid) => setToProjectId(pid)}
                searchPath="/projects/search"
                mapResult={(raw) => {
                  const p = raw as { id: string; code: string; name: string };
                  return { id: p.id, label: `${p.code} — ${p.name}` };
                }}
                placeholder="Search destination project…"
              />
              <SearchSelect
                value={materialId || transfer.items?.[0]?.materialId || null}
                onChange={(mid) => setMaterialId(mid)}
                searchPath="/materials/search"
                mapResult={(raw) => {
                  const m = raw as MaterialSearchResultDto;
                  return { id: m.id, label: m.name || m.description, sublabel: m.unit };
                }}
                placeholder="Material…"
              />
              <Input
                type="number"
                placeholder="Quantity"
                value={quantity || String(transfer.items?.[0]?.quantity || '')}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          )}

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Decision note…"
          />

          {decisionMode === 'idle' && (
            <div className="flex flex-col gap-2">
              <Button
                variant="accent"
                size="lg"
                accentColor={accent}
                onClick={() => setDecisionMode('transfer')}
              >
                Review & confirm transfer
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setDecisionMode('raise_po')}
              >
                Raise PO instead
              </Button>
            </div>
          )}

          {decisionMode === 'transfer' && (
            <div className="flex flex-col gap-2">
              <Button
                variant="accent"
                size="lg"
                accentColor={accent}
                disabled={coordinatorDecide.isPending}
                onClick={() => coordinatorDecide.mutate('transfer')}
              >
                Confirm transfer (no PO)
              </Button>
              <Button variant="ghost" size="lg" onClick={() => setDecisionMode('idle')}>
                Go back
              </Button>
            </div>
          )}

          {decisionMode === 'raise_po' && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
              <p className="text-sm text-ink-secondary">
                This will not transfer stock. The linked indent will be forwarded to PM for the normal PO path.
              </p>
              <Button
                variant="accent"
                size="lg"
                accentColor={ROLE_COLORS[UserRole.COORDINATOR].accent}
                disabled={coordinatorDecide.isPending}
                onClick={() => coordinatorDecide.mutate('raise_po_instead')}
              >
                Confirm — raise PO instead
              </Button>
              <Button variant="ghost" size="lg" onClick={() => setDecisionMode('idle')}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {transfer.canExecute && (
        <div className="mt-6 space-y-3 border-t border-surface-border pt-6">
          <p className="text-sm text-ink-secondary">
            Execute the atomic stock transfer — both project ledgers will update. No PO, PDF, or vendor email.
          </p>
          <Button
            variant="accent"
            size="lg"
            accentColor={accent}
            disabled={execute.isPending}
            onClick={() => execute.mutate()}
          >
            Execute transfer
          </Button>
        </div>
      )}
    </div>
  );
}
