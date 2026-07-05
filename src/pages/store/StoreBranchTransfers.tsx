import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ROLE_COLORS, UserRole, type BranchTransferDto, type MaterialSearchResultDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchSelect } from '@/components/SearchSelect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { SuccessScreen } from '@/components/SuccessScreen';

export function StoreBranchTransfersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accent = ROLE_COLORS[UserRole.STORE_INCHARGE].primary;
  const [showCreate, setShowCreate] = useState(false);
  const [fromProjectId, setFromProjectId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [materialRequestId, setMaterialRequestId] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const state = location.state as {
      materialRequestId?: string;
      materialId?: string;
      quantity?: number;
    } | null;
    if (state?.materialRequestId) {
      setMaterialRequestId(state.materialRequestId);
      setShowCreate(true);
    }
    if (state?.materialId) setMaterialId(state.materialId);
    if (state?.quantity) setQuantity(String(state.quantity));
  }, [location.state]);

  const { data: transfers, list, refetch } = useListQuery({
    queryKey: ['branch-transfers'],
    queryFn: async () => {
      const res = await api.get<{ data: BranchTransferDto[] }>('/branch-transfers');
      return normalizeListData<BranchTransferDto>(res.data.data);
    },
  });

  const createTransfer = useMutation({
    mutationFn: async () => {
      await api.post('/branch-transfers', {
        fromProjectId,
        items: [{ materialId, quantity: parseFloat(quantity) }],
        note,
        materialRequestId: materialRequestId || undefined,
      });
    },
    onSuccess: () => {
      setDone(true);
      refetch();
    },
    onError: () => toast.error('Could not create branch transfer request'),
  });

  if (done) {
    return (
      <SuccessScreen
        title="Request sent!"
        message="Branch transfer request sent to PM for approval — no PO created yet."
        accentColor={accent}
        primaryAction={{ label: 'Back to store', onClick: () => navigate('/store') }}
      />
    );
  }

  return (
    <div className="page-container max-w-lg">
      <PageHeader
        title="Branch transfers"
        subtitle="Request stock from another project when local inventory is short"
        action={
          <Button variant="primary" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Cancel' : 'New request'}
          </Button>
        }
      />

      {showCreate && (
        <div className="panel p-5 space-y-3 mb-6">
          <p className="text-sm text-ink-secondary">
            Search for a project that may hold the required stock. Your store&apos;s project is the destination.
          </p>

          <label className="text-sm font-medium text-ink-secondary">Source project (has stock)</label>
          <SearchSelect
            value={fromProjectId || null}
            onChange={(id) => setFromProjectId(id)}
            searchPath="/branch-transfers/targets/search"
            mapResult={(raw) => {
              const p = raw as { id: string; code: string; name: string };
              return { id: p.id, label: `${p.code} — ${p.name}`, sublabel: p.code };
            }}
            placeholder="Search project by name or code…"
          />

          <label className="text-sm font-medium text-ink-secondary">Material</label>
          <SearchSelect
            value={materialId || null}
            onChange={(id) => setMaterialId(id)}
            searchPath="/materials/search"
            mapResult={(raw) => {
              const m = raw as MaterialSearchResultDto;
              return {
                id: m.id,
                label: m.name || m.description,
                sublabel: `${m.itemCode} · ${m.unit}`,
              };
            }}
            placeholder="Search material…"
          />

          <Input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Button
            variant="primary"
            disabled={!fromProjectId || !materialId || !quantity || createTransfer.isPending}
            onClick={() => createTransfer.mutate()}
          >
            Submit to PM
          </Button>
        </div>
      )}

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!transfers?.length}
        empty={
          <EmptyState
            title="No branch transfers"
            description="When local stock cannot fulfill an indent, request stock from another project here."
          />
        }
      >
        <div className="space-y-2">
          {(transfers ?? []).map((t) => (
            <button
              key={t.id}
              type="button"
              className="w-full text-left"
              onClick={() => navigate(`/branch-transfers/${t.id}`)}
            >
              <Card className="hover:border-bekem-accent/40 transition-colors">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t.transferNumber}</p>
                    <p className="text-sm text-ink-secondary">
                      {t.fromProjectName || t.fromProject} → {t.toProjectName || t.toProject}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    <ChevronRight className="h-4 w-4 text-ink-muted" />
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}

export function openStoreBranchTransferFromIndent(
  navigate: (path: string, options?: { state?: unknown }) => void,
  indentId: string,
  materialId: string,
  quantity: number
) {
  navigate('/store/branch-transfers', {
    state: { materialRequestId: indentId, materialId, quantity },
  });
}
