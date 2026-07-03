import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  Boxes,
  AlertTriangle,
  ArrowUpCircle,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  AddMaterialStockDto,
  CreateMaterialDto,
  MaterialCatalogItemDto,
  MaterialDto,
  UpdateMaterialDto,
} from '@afios/shared';
import { useAuthStore } from '@/stores/authStore';
import { UserRole, PERMISSION_MATRIX } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ActionCard } from '@/components/ui/ActionCard';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

const HQ_ROLES = new Set([
  UserRole.COORDINATOR,
  UserRole.CHAIRMAN,
  UserRole.EXECUTIVE,
  UserRole.PROJECT_MANAGER,
]);

export function CreateMaterialPage() {
  const user = useAuthStore((s) => s.user)!;
  const role = user.role as UserRole;
  const queryClient = useQueryClient();
  const isHq = HQ_ROLES.has(role);
  const canDelete = PERMISSION_MATRIX[role]?.includes('DELETE_INVENTORY_ITEM');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 100;
  const [siteFilter, setSiteFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stockTarget, setStockTarget] = useState<MaterialCatalogItemDto | null>(null);
  const [editTarget, setEditTarget] = useState<MaterialCatalogItemDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialCatalogItemDto | null>(null);

  const [createForm, setCreateForm] = useState<CreateMaterialDto>({
    code: '',
    name: '',
    unit: 'MT',
    description: '',
    grade: '',
    category: '',
    hsnCode: '',
    initialQuantity: 0,
    lowStockThreshold: 20,
  });

  const [stockForm, setStockForm] = useState<AddMaterialStockDto>({
    siteId: '',
    quantity: 0,
    lowStockThreshold: 20,
    mode: 'add',
  });

  const [editForm, setEditForm] = useState<UpdateMaterialDto>({
    code: '',
    name: '',
    unit: '',
    description: '',
    grade: '',
    category: '',
    hsnCode: '',
  });

  const { data: sites } = useQuery({
    queryKey: ['catalog-sites'],
    queryFn: async () => {
      const res = await api.get<{
        data: Array<{ id: string; name: string; chainageLabel: string }>;
      }>('/sites');
      return res.data.data;
    },
    enabled: isHq,
  });

  const { data: mySite } = useQuery({
    queryKey: ['my-site'],
    queryFn: async () => {
      const res = await api.get<{ data: { id: string; chainageLabel: string } | null }>(
        '/sites/my'
      );
      return res.data.data;
    },
    enabled: !isHq,
  });

  const activeSiteId = isHq ? siteFilter : mySite?.id;

  const { data: catalogResponse, isLoading } = useQuery({
    queryKey: ['material-catalog', search, activeSiteId, page],
    queryFn: async () => {
      const res = await api.get<{
        data: MaterialCatalogItemDto[];
        meta: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          inStock: number;
          lowStock: number;
          totalQty: number;
          siteId: string | null;
        };
      }>('/materials/catalog', {
        params: {
          search: search || undefined,
          siteId: activeSiteId || undefined,
          page,
          limit: pageSize,
        },
      });
      return res.data;
    },
  });

  const catalog = catalogResponse?.data;
  const meta = catalogResponse?.meta;

  const stats = useMemo(() => {
    return {
      total: meta?.total ?? catalog?.length ?? 0,
      inStock: meta?.inStock ?? 0,
      lowStock: meta?.lowStock ?? 0,
      totalQty: meta?.totalQty ?? 0,
    };
  }, [meta, catalog]);

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        ...createForm,
        siteId: activeSiteId || createForm.siteId,
        initialQuantity: createForm.initialQuantity || undefined,
      };
      const res = await api.post<{ data: MaterialDto }>('/materials', payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Product added to catalog');
      setShowCreateModal(false);
      setCreateForm({
        code: '',
        name: '',
        unit: 'MT',
        description: '',
        grade: '',
        category: '',
        hsnCode: '',
        initialQuantity: 0,
        lowStockThreshold: 20,
      });
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
    },
    onError: () => toast.error('Failed to create product'),
  });

  const addStock = useMutation({
    mutationFn: async () => {
      if (!stockTarget) throw new Error('No material selected');
      const siteId = stockForm.siteId || activeSiteId;
      await api.post(`/materials/${stockTarget.id}/stock`, {
        ...stockForm,
        siteId,
      });
    },
    onSuccess: () => {
      toast.success('Stock updated');
      setStockTarget(null);
      setStockForm({ siteId: '', quantity: 0, lowStockThreshold: 20, mode: 'add' });
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
    },
    onError: () => toast.error('Failed to update stock'),
  });

  const updateProduct = useMutation({
    mutationFn: async () => {
      if (!editTarget) throw new Error('No material selected');
      const res = await api.patch<{ data: MaterialDto }>(
        `/materials/${editTarget.id}`,
        editForm
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Product updated');
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
    },
    onError: () => toast.error('Failed to update product'),
  });

  const deleteProduct = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) throw new Error('No material selected');
      await api.delete(`/materials/${deleteTarget.id}`);
    },
    onSuccess: () => {
      toast.success('Product removed from catalog');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const openStockModal = (item: MaterialCatalogItemDto) => {
    setStockTarget(item);
    setStockForm({
      siteId: activeSiteId || '',
      quantity: 0,
      lowStockThreshold: item.stock.lowStockThreshold || 20,
      mode: item.stock.hasLedger ? 'add' : 'set',
    });
  };

  const openEditModal = (item: MaterialCatalogItemDto) => {
    setEditTarget(item);
    setEditForm({
      code: item.code,
      name: item.name,
      unit: item.unit,
      description: item.description || '',
      grade: item.grade || '',
      category: item.category || '',
      hsnCode: item.hsnCode || '',
    });
  };

  const stockSiteLabel = isHq
    ? sites?.find((s) => s.id === activeSiteId)?.name || 'All sites (total stock)'
    : mySite?.chainageLabel;

  return (
    <div className="page-container max-w-6xl">
      <PageHeader
        title="Product catalog"
        subtitle="Manage materials, descriptions, and site stock before indents are raised"
        action={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ActionCard title="Products" count={stats.total} icon={Package} tone="primary" />
        <ActionCard title="In stock" count={stats.inStock} icon={Boxes} tone="success" />
        <ActionCard title="Low stock" count={stats.lowStock} icon={AlertTriangle} tone="warning" />
        <ActionCard
          title="Total qty on hand"
          count={stats.totalQty}
          icon={Boxes}
          tone="primary"
        />
      </div>

      <div className="panel p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by code, name, description…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bekem-accent/20 focus:border-bekem-accent"
          />
        </div>
        {isHq && (
          <select
            value={siteFilter}
            onChange={(e) => {
              setSiteFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-surface-border px-3 text-sm min-w-[200px]"
          >
            <option value="">All sites — total stock</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.chainageLabel})
              </option>
            ))}
          </select>
        )}
        {!isHq && (
          <p className="text-sm text-ink-secondary">
            Stock qty = on-hand from inventory / GRN
            {stockSiteLabel ? (
              <>
                {' '}
                · Primary site: <span className="font-semibold text-ink">{stockSiteLabel}</span>
              </>
            ) : null}
          </p>
        )}
      </div>

      <div className="table-shell overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-surface-muted animate-pulse" />
            ))}
          </div>
        ) : !catalog?.length ? (
          <div className="p-10">
            <EmptyState
              title="No products yet"
              description="Add your first material to the catalog so site teams can raise indents."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item code</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-semibold text-ink font-mono text-[13px]">{item.code}</p>
                      {item.hsnCode && (
                        <p className="text-xs text-ink-muted mt-0.5">HSN {item.hsnCode}</p>
                      )}
                    </td>
                    <td className="max-w-xs">
                      <p className="font-medium text-ink">{item.name}</p>
                      <p className="text-sm text-ink-secondary mt-0.5 line-clamp-2">
                        {item.description || item.grade || '—'}
                      </p>
                    </td>
                    <td>
                      <span className="text-sm text-ink-secondary">{item.category || 'General'}</span>
                    </td>
                    <td>
                      <span className="text-sm font-medium text-ink">{item.unit}</span>
                    </td>
                    <td className="text-right">
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums',
                          item.stock.isLowStock
                            ? 'text-warning-dark'
                            : item.stock.quantityOnHand > 0
                              ? 'text-success-dark'
                              : 'text-ink-muted'
                        )}
                      >
                        {item.stock.quantityOnHand.toLocaleString('en-IN')}
                      </span>
                      {item.stock.isLowStock && (
                        <p className="text-[11px] text-warning-dark font-semibold mt-0.5">Low</p>
                      )}
                      {!item.stock.hasLedger && item.stock.quantityOnHand === 0 && (
                        <p className="text-[11px] text-ink-muted mt-0.5">No stock</p>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openStockModal(item)}
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          Stock
                        </Button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-surface-border text-ink-secondary hover:text-bekem-accent hover:border-bekem-accent/30 transition-colors"
                          aria-label={`Edit ${item.code}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-surface-border text-ink-secondary hover:text-danger hover:border-danger/30 hover:bg-danger-light/50 transition-colors"
                            aria-label={`Delete ${item.code}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-ink-muted">
            Page {meta.page} of {meta.totalPages} · {meta.total.toLocaleString()} products ·{' '}
            {pageSize} per page
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add product"
        subtitle="New catalog item — sites can indent once stock is added"
        className="max-w-xl"
      >
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">Item code</label>
              <Input
                placeholder="MAT-CEMENT-OPC53"
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">Unit</label>
              <Input
                placeholder="MT, Bags, KL"
                value={createForm.unit}
                onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Name</label>
            <Input
              placeholder="Cement OPC 53"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Description</label>
            <Textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Specifications, brand, usage notes…"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">Grade</label>
              <Input
                value={createForm.grade}
                onChange={(e) => setCreateForm({ ...createForm, grade: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">Category</label>
              <Input
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">HSN code</label>
            <Input
              value={createForm.hsnCode}
              onChange={(e) => setCreateForm({ ...createForm, hsnCode: e.target.value })}
            />
          </div>
          {(activeSiteId || !isHq) && (
            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-surface-border">
              <div>
                <label className="text-xs font-semibold text-ink-muted mb-1 block">
                  Opening stock
                </label>
                <Input
                  type="number"
                  value={createForm.initialQuantity}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, initialQuantity: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted mb-1 block">
                  Low stock alert
                </label>
                <Input
                  type="number"
                  value={createForm.lowStockThreshold}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, lowStockThreshold: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}
          <Button
            variant="primary"
            className="w-full"
            disabled={!createForm.code || !createForm.name || !createForm.unit || create.isPending}
            onClick={() => create.mutate()}
          >
            Create product
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!stockTarget}
        onClose={() => setStockTarget(null)}
        title="Add stock"
        subtitle={stockTarget ? `${stockTarget.code} — ${stockTarget.name}` : undefined}
      >
        {stockTarget && (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-muted px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-ink-secondary">Current stock</span>
              <span className="text-lg font-bold tabular-nums text-ink">
                {stockTarget.stock.quantityOnHand} {stockTarget.unit}
              </span>
            </div>

            {isHq && (
              <div>
                <label className="text-xs font-semibold text-ink-muted mb-1 block">Site</label>
                <select
                  value={stockForm.siteId}
                  onChange={(e) => setStockForm({ ...stockForm, siteId: e.target.value })}
                  className="w-full h-10 rounded-xl border border-surface-border px-3 text-sm"
                >
                  <option value="">Select site</option>
                  {sites?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.chainageLabel})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-ink-muted mb-1 block">
                  {stockTarget.stock.hasLedger ? 'Add quantity' : 'Set quantity'}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={stockForm.quantity}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, quantity: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted mb-1 block">
                  Low stock alert
                </label>
                <Input
                  type="number"
                  min={0}
                  value={stockForm.lowStockThreshold}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, lowStockThreshold: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              disabled={
                !stockForm.quantity ||
                addStock.isPending ||
                (isHq && !stockForm.siteId && !activeSiteId)
              }
              onClick={() => addStock.mutate()}
            >
              {stockTarget.stock.hasLedger ? 'Add to stock' : 'Set opening stock'}
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit product"
        subtitle={editTarget ? editTarget.code : undefined}
        className="max-w-xl"
      >
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">Item code</label>
              <Input
                value={editForm.code}
                onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">Unit</label>
              <Input
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Description</label>
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">Grade</label>
              <Input
                value={editForm.grade}
                onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">Category</label>
              <Input
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">HSN code</label>
            <Input
              value={editForm.hsnCode}
              onChange={(e) => setEditForm({ ...editForm, hsnCode: e.target.value })}
            />
          </div>
          <Button
            variant="primary"
            className="w-full"
            disabled={!editForm.code || !editForm.name || !editForm.unit || updateProduct.isPending}
            onClick={() => updateProduct.mutate()}
          >
            Save changes
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete product?"
        subtitle={deleteTarget ? `${deleteTarget.code} — ${deleteTarget.name}` : undefined}
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-secondary leading-relaxed">
              This removes the product from the catalog. Existing indents and stock records are kept,
              but the item will no longer appear for new requests.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-danger hover:bg-danger-dark border-danger"
                disabled={deleteProduct.isPending}
                onClick={() => deleteProduct.mutate()}
              >
                Delete product
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
