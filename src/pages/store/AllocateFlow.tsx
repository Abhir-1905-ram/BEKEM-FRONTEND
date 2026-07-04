import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { forbiddenQueryOptions, isForbiddenError, useRedirectOnForbidden } from '@/lib/forbiddenRedirect';
import { ROLE_COLORS, UserRole } from '@afios/shared';
import type { MaterialRequestDto } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Input';
import { SuccessScreen } from '@/components/SuccessScreen';
import { useAuthStore } from '@/stores/authStore';

export function AllocateFlowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accent = ROLE_COLORS[UserRole.STORE_INCHARGE].primary;
  const siteId = useAuthStore((s) => s.user?.assignedSiteId);
  const [forwardReason, setForwardReason] = useState('');
  const [phase, setPhase] = useState<'review' | 'forward' | 'done'>('review');
  const [allocQty, setAllocQty] = useState<Record<string, number>>({});

  const {
    data: request,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['material-request', id],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialRequestDto }>(`/material-requests/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    ...forbiddenQueryOptions,
  });

  useRedirectOnForbidden(error);

  const { data: stock } = useQuery({
    queryKey: ['stock', siteId],
    queryFn: async () => {
      const res = await api.get<{
        data: Array<{ materialId: string; quantityOnHand: number; material: { name: string; unit: string } }>;
      }>(`/stock/site/${siteId}`);
      return res.data.data;
    },
    enabled: !!siteId,
  });

  const stockMap = useMemo(() => {
    const m = new Map<string, number>();
    stock?.forEach((s) => m.set(s.materialId, s.quantityOnHand));
    return m;
  }, [stock]);

  const allocateMutation = useMutation({
    mutationFn: async () => {
      const allocations = (request?.items || []).map((item) => ({
        itemId: item.id,
        quantityAllocated: allocQty[item.id] ?? 0,
      }));
      await api.post(`/material-requests/${id}/allocate`, { allocations });
    },
    onSuccess: () => {
      toast.success('Indent accepted');
      setPhase('done');
      queryClient.invalidateQueries({ queryKey: ['store-pending-requests'] });
    },
    onError: () => toast.error('Allocation failed'),
  });

  const forwardMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: unknown; message?: string }>(
        `/material-requests/${id}/forward`,
        { reason: forwardReason }
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Forwarded to PM');
      setPhase('done');
    },
    onError: (err: Error & { response?: { data?: { message?: string }; status?: number } }) => {
      const msg = err.response?.data?.message || 'Forward failed';
      // If already with PM, treat as success (idempotent server)
      if (err.response?.status === 400 && /forwarded|With PM|FORWARDED/i.test(msg)) {
        toast.success('Already forwarded to PM');
        setPhase('done');
        return;
      }
      toast.error(msg);
    },
  });

  if (phase === 'done') {
    return (
      <SuccessScreen
        title="Done!"
        message="Indent updated successfully."
        accentColor={accent}
        primaryAction={{ label: 'Back to store', onClick: () => navigate('/store') }}
      />
    );
  }

  if (isLoading) {
    return <div className="p-6 h-40 bg-surface-muted animate-pulse rounded-xl mx-4 mt-4" />;
  }
  if (isError && isForbiddenError(error)) return null;
  if (!request) return null;

  const items = request.items?.length
    ? request.items
    : request.materialId
      ? [
          {
            id: request.id,
            materialId: request.materialId,
            quantityRequested: request.quantityRequested || 0,
            quantityAllocated: request.quantityAllocated || 0,
            material: request.material,
          },
        ]
      : [];

  if (phase === 'forward') {
    return (
      <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <button onClick={() => setPhase('review')} className="h-10 w-10 rounded-xl hover:bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">Forward to PM</h1>
        </header>
        <Textarea
          value={forwardReason}
          onChange={(e) => setForwardReason(e.target.value)}
          placeholder="Reason for forwarding (e.g. insufficient stock)"
        />
        <Button
          className="mt-4 w-full"
          variant="accent"
          accentColor={accent}
          disabled={!forwardReason.trim() || forwardMutation.isPending}
          onClick={() => forwardMutation.mutate()}
        >
          Forward indent
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-3xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/store')} className="h-10 w-10 rounded-xl hover:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-semibold">{request.indentNumber}</h1>
          <p className="text-xs text-ink-secondary">{items.length} item(s) — allocate or forward</p>
        </div>
      </header>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted/50">
              <th className="text-left px-3 py-2 font-semibold text-ink-muted">Item</th>
              <th className="text-right px-3 py-2 font-semibold text-ink-muted">Stock</th>
              <th className="text-right px-3 py-2 font-semibold text-ink-muted">Requested</th>
              <th className="text-right px-3 py-2 font-semibold text-ink-muted">Allocate</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const available = stockMap.get(item.materialId) ?? 0;
              return (
                <tr key={item.id} className="border-b border-surface-border last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-medium">{item.material?.name}</p>
                    <p className="text-xs text-ink-muted">{item.material?.unit}</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{available}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{item.quantityRequested}</td>
                  <td className="px-3 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      max={Math.min(available, item.quantityRequested)}
                      value={allocQty[item.id] ?? item.quantityRequested}
                      onChange={(e) =>
                        setAllocQty((prev) => ({
                          ...prev,
                          [item.id]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-20 border rounded px-2 py-1 text-right text-sm"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-col gap-2 mt-6">
        <Button
          variant="accent"
          size="lg"
          accentColor={accent}
          disabled={allocateMutation.isPending}
          onClick={() => allocateMutation.mutate()}
        >
          Accept & allocate
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setPhase('forward')}>
          Forward to PM
        </Button>
      </div>
    </div>
  );
}
