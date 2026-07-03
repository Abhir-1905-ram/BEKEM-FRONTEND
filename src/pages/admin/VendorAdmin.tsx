import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { CreateVendorDto, MaterialDto, VendorDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

const emptyForm: CreateVendorDto = {
  name: '',
  code: '',
  address: '',
  gstNumber: '',
  email: '',
  contactPerson: '',
  phone: '',
  category: '',
  suppliedCategories: [],
  materialIds: [],
};

export function VendorAdminPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<VendorDto | null>(null);
  const [form, setForm] = useState<CreateVendorDto>(emptyForm);

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await api.get<{ data: VendorDto[] }>('/vendors');
      return res.data.data;
    },
  });

  const { data: materials } = useQuery({
    queryKey: ['materials-list'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialDto[] }>('/materials');
      return res.data.data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editTarget) {
        await api.patch(`/vendors/${editTarget.id}`, form);
      } else {
        await api.post('/vendors', form);
      }
    },
    onSuccess: () => {
      toast.success(editTarget ? 'Vendor updated' : 'Vendor added');
      setShowModal(false);
      setEditTarget(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: () => toast.error('Failed to save vendor'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/vendors/${id}`),
    onSuccess: () => {
      toast.success('Vendor removed');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (v: VendorDto) => {
    setEditTarget(v);
    setForm({
      name: v.name,
      code: v.code || '',
      address: v.address,
      gstNumber: v.gstNumber,
      email: v.email,
      contactPerson: v.contactPerson,
      phone: v.phone,
      category: v.category,
      suppliedCategories: v.suppliedCategories || [],
      materialIds: v.materialIds || [],
    });
    setShowModal(true);
  };

  const toggleMaterial = (id: string) => {
    const ids = form.materialIds || [];
    setForm({
      ...form,
      materialIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    });
  };

  return (
    <div className="page-container max-w-5xl">
      <PageHeader
        title="Vendors"
        subtitle="Register suppliers with address, GST, and materials they provide"
        action={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add vendor
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-surface-muted animate-pulse" />
          ))}
        </div>
      ) : !vendors?.length ? (
        <EmptyState title="No vendors" description="Add vendors so executives can raise POs." />
      ) : (
        <div className="space-y-2">
          {vendors.map((v) => (
            <div key={v.id} className="panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-bekem-accent shrink-0" />
                    <p className="font-semibold text-ink">{v.name}</p>
                    <span className="text-xs text-ink-muted">★ {v.rating.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-ink-secondary mt-1 whitespace-pre-line">{v.address}</p>
                  <p className="text-xs text-ink-muted mt-2">
                    {v.gstNumber && `GST ${v.gstNumber} · `}
                    {v.contactPerson}
                    {v.phone ? ` · ${v.phone}` : ''}
                  </p>
                  {v.materials?.length ? (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {v.materials.map((m) => (
                        <span
                          key={m.id}
                          className="text-xs font-medium px-2 py-0.5 rounded-full bg-bekem-accent-soft text-bekem-accent"
                        >
                          {m.code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted mt-2">{v.category || 'General supplier'}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(v)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-surface-border hover:border-bekem-accent/30"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(v.id)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-surface-border hover:text-danger"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? 'Edit vendor' : 'Add vendor'}
        subtitle="Vendor address appears on PO as the To block"
        className="max-w-xl"
      >
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <Input
            placeholder="Vendor name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Vendor code (e.g. TATA, CST)"
            value={form.code || ''}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
          <Textarea
            placeholder="Full address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              placeholder="GST number"
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
            />
            <Input
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              placeholder="Contact person"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div>
            <p className="text-xs font-semibold text-ink-muted mb-2">Materials / stock supplied</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {materials?.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMaterial(m.id)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium border',
                    form.materialIds?.includes(m.id)
                      ? 'border-bekem-accent bg-bekem-accent-soft text-bekem-accent'
                      : 'border-surface-border text-ink-secondary'
                  )}
                >
                  {m.code}
                </button>
              ))}
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full"
            disabled={!form.name || save.isPending}
            onClick={() => save.mutate()}
          >
            {editTarget ? 'Save changes' : 'Add vendor'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
