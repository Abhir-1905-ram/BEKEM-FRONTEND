import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
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
  MaterialCategoryDto,
  MaterialDto,
  UpdateMaterialDto,
} from '@afios/shared';
import { MaterialCategorySelect } from '@/components/MaterialCategorySelect';
import { MATERIAL_CATEGORY_NAMES, DEFAULT_GST_PERCENT, snapGstPercent } from '@afios/shared';
import { useAuthStore } from '@/stores/authStore';
import { UserRole, PERMISSION_MATRIX } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { GstPercentSelect } from '@/components/GstPercentSelect';
import { Modal } from '@/components/ui/Modal';
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
    categoryId: '',
    categoryRemarks: '',
    hsnCode: '',
    gstRate: DEFAULT_GST_PERCENT,
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
    categoryId: '',
    categoryRemarks: '',
    hsnCode: '',
    gstRate: DEFAULT_GST_PERCENT,
  });

  const { data: categories } = useQuery({
    queryKey: ['material-categories'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialCategoryDto[] }>('/material-categories');
      return res.data.data;
    },
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

  const sortedCatalog = useMemo(() => {
    const order = new Map<string, number>(MATERIAL_CATEGORY_NAMES.map((c, i) => [c, i]));
    return [...(catalog ?? [])].sort((a, b) => {
      const ca = order.get(a.category || 'Others') ?? 99;
      const cb = order.get(b.category || 'Others') ?? 99;
      if (ca !== cb) return ca - cb;
      return a.code.localeCompare(b.code);
    });
  }, [catalog]);

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
        categoryId: '',
        categoryRemarks: '',
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
      categoryId: item.categoryId || categories?.find((c) => c.name === item.category)?.id || '',
      categoryRemarks: item.categoryRemarks || '',
      hsnCode: item.hsnCode || '',
      gstRate: snapGstPercent(item.gstRate),
    });
  };

  const stockSiteLabel = isHq
    ? sites?.find((s) => s.id === activeSiteId)?.name || 'All sites (total stock)'
    : mySite?.chainageLabel;

  return (
    <div className="page-container max-w-[1600px]">
      <PageHeader
        title="Product catalog"
        subtitle="Manage materials, descriptions, and site stock"
        action={
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary mb-2 px-0.5">
        <span>
          <strong className="text-ink tabular-nums">{stats.total.toLocaleString('en-IN')}</strong>{' '}
          products
        </span>
        <span>
          <strong className="text-success-dark tabular-nums">{stats.inStock.toLocaleString('en-IN')}</strong>{' '}
          in stock
        </span>
        <span>
          <strong className="text-warning-dark tabular-nums">{stats.lowStock.toLocaleString('en-IN')}</strong>{' '}
          low
        </span>
        <span>
          <strong className="text-ink tabular-nums">{stats.totalQty.toLocaleString('en-IN')}</strong>{' '}
          total qty
        </span>
      </div>

      <div className="panel px-2 py-1.5 mb-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search code, name, description…"
            className="w-full h-8 pl-8 pr-3 rounded border border-surface-border bg-white text-xs focus:outline-none focus:ring-1 focus:ring-bekem-accent/30"
          />
        </div>
        {isHq && (
          <select
            value={siteFilter}
            onChange={(e) => {
              setSiteFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded border border-surface-border px-2 text-xs min-w-[180px]"
          >
            <option value="">All sites — total stock</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.chainageLabel})
              </option>
            ))}
          </select>
        )}
        {!isHq && stockSiteLabel && (
          <p className="text-[11px] text-ink-muted">
            Stock from inventory/GRN · Site: <span className="font-semibold text-ink">{stockSiteLabel}</span>
          </p>
        )}
      </div>

      <div className="overflow-x-auto border border-surface-border bg-white">
        {isLoading ? (
          <div className="p-4 space-y-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-6 bg-surface-muted animate-pulse" />
            ))}
          </div>
        ) : !catalog?.length ? (
          <div className="p-8">
            <EmptyState
              title="No products yet"
              description="Add your first material to the catalog so site teams can raise indents."
            />
          </div>
        ) : (
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th className="w-28">Item code</th>
                <th>Description</th>
                <th className="w-24">Category</th>
                <th className="w-14">Unit</th>
                <th className="w-16">HSN</th>
                <th className="w-12 text-right">GST</th>
                <th className="w-20 text-right">Stock</th>
                <th className="w-16 text-center">Status</th>
                <th className="w-20 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedCatalog.map((item) => {
                const status =
                  item.stock.isLowStock
                    ? 'Low'
                    : !item.stock.hasLedger && item.stock.quantityOnHand === 0
                      ? 'No stock'
                      : item.stock.quantityOnHand > 0
                        ? 'OK'
                        : '—';
                const desc =
                  item.description && item.description !== item.name
                    ? `${item.name} — ${item.description}`
                    : item.name;
                return (
                  <tr key={item.id}>
                    <td className="cell-code" title={item.code}>
                      {item.code}
                    </td>
                    <td className="cell-text" title={desc}>
                      {desc}
                    </td>
                    <td className="truncate max-w-[100px]" title={item.category || 'General'}>
                      {item.category || 'General'}
                    </td>
                    <td>{item.unit}</td>
                    <td className="text-ink-muted">{item.hsnCode || '—'}</td>
                    <td className="text-right">{item.gstRate != null ? `${item.gstRate}%` : '—'}</td>
                    <td
                      className={cn(
                        'text-right font-semibold',
                        item.stock.isLowStock
                          ? 'text-warning-dark'
                          : item.stock.quantityOnHand > 0
                            ? 'text-ink'
                            : 'text-ink-muted'
                      )}
                    >
                      {item.stock.quantityOnHand.toLocaleString('en-IN')}
                    </td>
                    <td
                      className={cn(
                        'text-center text-[10px] font-semibold',
                        status === 'Low' && 'text-warning-dark',
                        status === 'No stock' && 'text-ink-muted',
                        status === 'OK' && 'text-success-dark'
                      )}
                    >
                      {status}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => openStockModal(item)}
                          className="h-6 w-6 inline-flex items-center justify-center rounded border border-surface-border text-ink-secondary hover:text-bekem-accent hover:border-bekem-accent/40"
                          title="Add stock"
                        >
                          <ArrowUpCircle className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="h-6 w-6 inline-flex items-center justify-center rounded border border-surface-border text-ink-secondary hover:text-bekem-accent hover:border-bekem-accent/40"
                          title={`Edit ${item.code}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="h-6 w-6 inline-flex items-center justify-center rounded border border-surface-border text-ink-secondary hover:text-danger hover:border-danger/40"
                            title={`Delete ${item.code}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
            <label className="text-xs font-semibold text-ink-muted mb-1 block">
              Product description
            </label>
            <Textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Vendor-facing specification, brand, size, or grade. Do not use internal notes."
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
          </div>
          <MaterialCategorySelect
            categories={categories}
            categoryId={createForm.categoryId || ''}
            categoryName={createForm.category || ''}
            categoryRemarks={createForm.categoryRemarks}
            onChange={({ categoryId, categoryName, categoryRemarks }) =>
              setCreateForm({
                ...createForm,
                categoryId,
                category: categoryName,
                categoryRemarks: categoryRemarks || '',
              })
            }
          />
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">HSN code</label>
            <Input
              value={createForm.hsnCode}
              onChange={(e) => setCreateForm({ ...createForm, hsnCode: e.target.value })}
              placeholder="e.g. 25232930"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">GST %</label>
            <GstPercentSelect
              value={createForm.gstRate}
              onChange={(gstRate) => setCreateForm({ ...createForm, gstRate })}
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
            disabled={
              !createForm.code ||
              !createForm.name ||
              !createForm.unit ||
              !createForm.categoryId ||
              (createForm.category === 'Others' && !createForm.categoryRemarks?.trim()) ||
              create.isPending
            }
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
          <div className="space-y-3">
            <div className="rounded-xl bg-surface-muted px-3 py-2 flex justify-between items-center">
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
            <label className="text-xs font-semibold text-ink-muted mb-1 block">
              Product description
            </label>
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Vendor-facing specification, brand, size, or grade. Do not use internal notes."
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
            <div className="sm:col-span-2">
              <MaterialCategorySelect
                categories={categories}
                categoryId={editForm.categoryId || ''}
                categoryName={editForm.category || ''}
                categoryRemarks={editForm.categoryRemarks}
                onChange={({ categoryId, categoryName, categoryRemarks }) =>
                  setEditForm({
                    ...editForm,
                    categoryId,
                    category: categoryName,
                    categoryRemarks: categoryRemarks || '',
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">HSN code</label>
            <Input
              value={editForm.hsnCode}
              onChange={(e) => setEditForm({ ...editForm, hsnCode: e.target.value })}
              placeholder="e.g. 25232930"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">GST %</label>
            <GstPercentSelect
              value={editForm.gstRate}
              onChange={(gstRate) => setEditForm({ ...editForm, gstRate })}
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
          <div className="space-y-3">
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
