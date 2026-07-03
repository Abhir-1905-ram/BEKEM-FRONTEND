import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { UserRole } from '@afios/shared';
import type { DelegationStatusDto, DelegationUserOptionDto } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';

function defaultValidTo() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function DelegationPanel() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole;
  const queryClient = useQueryClient();
  const [delegateUserId, setDelegateUserId] = useState('');
  const [validTo, setValidTo] = useState(defaultValidTo());

  const canManage =
    role === UserRole.CHAIRMAN || role === UserRole.PROJECT_MANAGER;

  const { data: status } = useQuery({
    queryKey: ['delegation-status'],
    queryFn: async () => {
      const res = await api.get<{ data: DelegationStatusDto }>('/delegations/status');
      return res.data.data;
    },
    enabled: canManage,
  });

  const { data: users } = useQuery({
    queryKey: ['delegation-users'],
    queryFn: async () => {
      const res = await api.get<{ data: DelegationUserOptionDto[] }>('/delegations/users');
      return res.data.data;
    },
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const scope = role === UserRole.CHAIRMAN ? 'PO_FINAL' : 'MR_PM';
      const res = await api.post('/delegations', {
        delegateUserId,
        scope,
        validTo: new Date(validTo).toISOString(),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Delegation created');
      setDelegateUserId('');
      queryClient.invalidateQueries({ queryKey: ['delegation-status'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/delegations/${id}`),
    onSuccess: () => {
      toast.success('Delegation revoked');
      queryClient.invalidateQueries({ queryKey: ['delegation-status'] });
    },
  });

  if (!canManage) return null;

  const scopeLabel =
    role === UserRole.CHAIRMAN ? 'PO final approval' : 'PM material approval';

  return (
    <section className="panel p-5 mb-6">
      <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-2">
        <UserCheck className="h-4 w-4" />
        Approval delegation
      </h2>
      <p className="text-xs text-ink-muted mb-4">
        Delegate {scopeLabel} while you are away. Actions are recorded on your behalf.
      </p>

      {status?.asDelegate.length ? (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
          You can act on behalf of:{' '}
          {status.asDelegate.map((d) => d.principal?.name).filter(Boolean).join(', ')}
        </div>
      ) : null}

      {status?.asPrincipal.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between rounded-xl bg-surface-muted p-3 mb-2 text-sm"
        >
          <span>
            <span className="font-medium text-ink">{d.delegate?.name}</span>
            <span className="text-ink-muted"> until {new Date(d.validTo).toLocaleDateString()}</span>
          </span>
          <button
            type="button"
            onClick={() => revokeMutation.mutate(d.id)}
            className="text-ink-muted hover:text-rose-600"
            aria-label="Revoke delegation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <div>
          <label className="text-xs font-semibold text-ink-muted mb-1 block">Delegate to</label>
          <select
            value={delegateUserId}
            onChange={(e) => setDelegateUserId(e.target.value)}
            className="w-full h-10 rounded-lg border border-surface-border bg-white px-3 text-sm"
          >
            <option value="">Select colleague…</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted mb-1 block">Valid until</label>
          <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} min={defaultValidTo().slice(0, 10)} />
        </div>
      </div>
      <Button
        variant="secondary"
        className="mt-3"
        disabled={!delegateUserId || createMutation.isPending}
        onClick={() => createMutation.mutate()}
      >
        {createMutation.isPending ? 'Saving…' : 'Create delegation'}
      </Button>
    </section>
  );
}
