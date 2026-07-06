import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  formatCurrency,
  formatDate,
  UserRole,
  type MiscPurchaseDto,
  type OrgSettingsDto,
} from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WorkflowStatusTabs, type WorkflowStatusTab } from '@/components/WorkflowStatusTabs';
import { useAuthStore } from '@/stores/authStore';
import { EmptyState } from '@/components/EmptyState';

export function MiscPurchasesPage() {
  const user = useAuthStore((s) => s.user)!;
  const role = user.role as UserRole;
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as WorkflowStatusTab) || 'pending';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    expenseCategoryKey: 'GROCERY',
    description: '',
    amount: '',
    projectId: user.assignedProjectIds?.[0] || '',
    vendorName: '',
    purchaseOrderId: '',
    note: '',
  });

  const { data: settings } = useQuery({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const res = await api.get<{ data: OrgSettingsDto }>('/admin/org-settings');
      return res.data.data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ id: string; code: string; name: string }> }>('/projects');
      return res.data.data;
    },
  });

  const { data: items, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['misc-purchases', tab],
    queryFn: async () => {
      const res = await api.get<{ data: MiscPurchaseDto[] }>('/misc-purchases', {
        params: { tab },
      });
      return res.data.data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: MiscPurchaseDto }>('/misc-purchases', {
        ...form,
        amount: Number(form.amount),
        purchaseOrderId: form.purchaseOrderId || undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Misc purchase submitted for approval');
      queryClient.invalidateQueries({ queryKey: ['misc-purchases'] });
      setShowForm(false);
      setForm((f) => ({ ...f, description: '', amount: '', note: '', vendorName: '', purchaseOrderId: '' }));
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Could not create misc purchase');
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/misc-purchases/${id}/approve`);
    },
    onSuccess: () => {
      toast.success('Approved');
      queryClient.invalidateQueries({ queryKey: ['misc-purchases'] });
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Approval failed');
    },
  });

  const canCreate =
    role === UserRole.PROJECT_MANAGER ||
    role === UserRole.EXECUTIVE ||
    role === UserRole.COORDINATOR;

  const canApprove =
    role === UserRole.PROJECT_MANAGER ||
    role === UserRole.COORDINATOR ||
    role === UserRole.CHAIRMAN;

  const selectedCategory = settings?.expenseCategories?.find((c) => c.key === form.expenseCategoryKey);

  return (
    <div className="page-container max-w-4xl">
      <PageHeader
        title="Misc purchases"
        subtitle="Grocery, mess, office & emergency expenses — with or without PO"
        action={
          canCreate ? (
            <Button variant="accent" size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancel' : 'New expense'}
            </Button>
          ) : undefined
        }
      />

      {showForm && canCreate && (
        <div className="panel p-3 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-medium text-ink-secondary">
              Category
              <select
                className="mt-1 w-full h-8 rounded-lg border border-surface-border px-2 text-sm"
                value={form.expenseCategoryKey}
                onChange={(e) => setForm((f) => ({ ...f, expenseCategoryKey: e.target.value }))}
              >
                {(settings?.expenseCategories ?? []).map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                    {c.requiresPo ? ' (PO required)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-ink-secondary">
              Project
              <select
                className="mt-1 w-full h-8 rounded-lg border border-surface-border px-2 text-sm"
                value={form.projectId}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
              >
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedCategory?.description && (
            <p className="text-[11px] text-ink-muted">{selectedCategory.description}</p>
          )}
          <label className="text-xs font-medium text-ink-secondary block">
            Description
            <Input
              className="mt-1"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-medium text-ink-secondary block">
              Amount (₹)
              <Input
                className="mt-1"
                type="number"
                min={1}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </label>
            <label className="text-xs font-medium text-ink-secondary block">
              Vendor (optional)
              <Input
                className="mt-1"
                value={form.vendorName}
                onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
              />
            </label>
          </div>
          {selectedCategory?.requiresPo && (
            <label className="text-xs font-medium text-ink-secondary block">
              Linked PO id
              <Input
                className="mt-1"
                value={form.purchaseOrderId}
                onChange={(e) => setForm((f) => ({ ...f, purchaseOrderId: e.target.value }))}
                placeholder="MongoDB PO id"
              />
            </label>
          )}
          <label className="text-xs font-medium text-ink-secondary block">
            Note
            <Textarea
              className="mt-1"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </label>
          <Button
            variant="primary"
            disabled={!form.description || !form.amount || !form.projectId || create.isPending}
            onClick={() => create.mutate()}
          >
            Submit for approval
          </Button>
        </div>
      )}

      <WorkflowStatusTabs value={tab} onChange={(t) => setParams({ tab: t })} />

      <ListQueryBoundary
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        retrying={isFetching && !isLoading}
        isEmpty={!items?.length}
        empty={
          <EmptyState
            title="No misc purchases"
            description="Grocery, mess and other site expenses appear here after submission."
          />
        }
      >
        <div className="space-y-2">
          {(items ?? []).map((row) => (
            <div key={row.id} className="panel p-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{row.referenceNumber}</p>
                  <StatusBadge status={row.status} />
                  <span className="text-[10px] uppercase tracking-wide text-ink-muted">
                    {row.expenseCategoryLabel || row.expenseCategoryKey}
                  </span>
                </div>
                <p className="text-sm text-ink-secondary mt-0.5">{row.description}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {row.projectCode} · {formatCurrency(row.amount)}
                  {row.transactionDate ? ` · ${formatDate(row.transactionDate)}` : ''}
                </p>
                {row.poNumber && (
                  <p className="text-[11px] text-ink-muted mt-0.5">PO: {row.poNumber}</p>
                )}
              </div>
              {canApprove &&
                ['PM_PENDING', 'COORDINATOR_PENDING', 'CHAIRMAN_PENDING'].includes(row.status) && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(row.id)}
                  >
                    Approve
                  </Button>
                )}
            </div>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
