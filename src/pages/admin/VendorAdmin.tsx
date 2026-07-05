import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Truck, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { CreateVendorDto, MaterialDto, MsmeCertificateUploadDto, VendorDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { cn } from '@/lib/utils';

const emptyForm: CreateVendorDto = {
  name: '',
  isMsme: false,
  code: '',
  address: '',
  gstNumber: '',
  panNumber: '',
  email: '',
  contactPerson: '',
  phone: '',
  bankName: '',
  bankAccountNumber: '',
  ifscCode: '',
  msmeNumber: '',
  category: '',
  suppliedCategories: [],
  materialIds: [],
};

function readFileAsBase64(file: File): Promise<MsmeCertificateUploadDto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = () => {};
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({ fileName: file.name, mimeType: file.type, dataBase64: base64 });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function VendorAdminPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [editTarget, setEditTarget] = useState<VendorDto | null>(null);
  const [form, setForm] = useState<CreateVendorDto>(emptyForm);
  const [msmeCert, setMsmeCert] = useState<MsmeCertificateUploadDto | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [msmeChoice, setMsmeChoice] = useState<boolean | null>(null);

  const { data: vendors, list } = useListQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await api.get<{ data: VendorDto[] }>('/vendors');
      return normalizeListData<VendorDto>(res.data.data);
    },
  });

  const { data: materials } = useQuery({
    queryKey: ['materials-list'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialDto[] }>('/materials');
      return res.data.data;
    },
  });

  const { data: pendingVendors, refetch: refetchPending } = useQuery({
    queryKey: ['vendors-pending'],
    queryFn: async () => {
      const res = await api.get<{ data: VendorDto[] }>('/vendors/pending-authorization');
      return res.data.data;
    },
  });

  const authorize = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'authorize' | 'reject' }) => {
      await api.post(`/vendors/${id}/authorize`, { action });
    },
    onSuccess: () => {
      toast.success('Vendor authorization updated');
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Authorization failed');
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        msmeCertificate: form.isMsme ? msmeCert || undefined : undefined,
      };
      if (editTarget) {
        await api.patch(`/vendors/${editTarget.id}`, payload);
      } else {
        await api.post('/vendors', payload);
      }
    },
    onSuccess: () => {
      toast.success(editTarget ? 'Vendor updated' : 'Vendor added');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Failed to save vendor');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/vendors/${id}`),
    onSuccess: () => {
      toast.success('Vendor removed');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setForm(emptyForm);
    setMsmeCert(null);
    setWizardStep(0);
    setUploadProgress(0);
    setMsmeChoice(null);
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setMsmeCert(null);
    setWizardStep(0);
    setShowModal(true);
  };

  const openEdit = (v: VendorDto) => {
    setEditTarget(v);
    setForm({
      name: v.name,
      isMsme: !!v.isMsme,
      code: v.code || '',
      address: v.address,
      gstNumber: v.gstNumber,
      panNumber: v.panNumber || '',
      email: v.email,
      contactPerson: v.contactPerson,
      phone: v.phone,
      bankName: v.bankName || '',
      bankAccountNumber: v.bankAccountNumber || '',
      ifscCode: v.ifscCode || '',
      msmeNumber: v.msmeNumber || '',
      category: v.category,
      suppliedCategories: v.suppliedCategories || [],
      materialIds: v.materialIds || [],
    });
    setMsmeCert(null);
    setWizardStep(1);
    setShowModal(true);
  };

  const toggleMaterial = (id: string) => {
    const ids = form.materialIds || [];
    setForm({
      ...form,
      materialIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    });
  };

  const onMsmeFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      const cert = await readFileAsBase64(file);
      setUploadProgress(100);
      setMsmeCert(cert);
      toast.success('Certificate attached');
    } catch {
      toast.error('Could not read file');
    } finally {
      setUploading(false);
    }
  };

  const canProceedMsme =
    form.isMsme === false ||
    (!!form.msmeNumber?.trim() && (!!msmeCert || !!editTarget?.msmeCertificateUrl));

  const canSave =
    !!form.name?.trim() &&
    !!form.gstNumber?.trim() &&
    canProceedMsme &&
    (editTarget || form.isMsme !== undefined);

  return (
    <div className="page-container max-w-5xl">
      <PageHeader
        title="Vendors"
        subtitle="Register suppliers — MSME compliance captured at onboarding"
        action={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add vendor
          </Button>
        }
      />

      {!!pendingVendors?.length && (
        <div className="mb-6 panel p-4 border-amber-200 bg-amber-50/50">
          <p className="font-semibold text-ink mb-3">
            Pending authorization ({pendingVendors.length})
          </p>
          <div className="space-y-2">
            {pendingVendors.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-surface-border px-3 py-2">
                <div>
                  <p className="font-medium text-sm">{v.name}</p>
                  <p className="text-xs text-ink-muted">{v.gstNumber || v.code}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={authorize.isPending}
                    onClick={() => authorize.mutate({ id: v.id, action: 'authorize' })}
                  >
                    Authorize
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    disabled={authorize.isPending}
                    onClick={() => authorize.mutate({ id: v.id, action: 'reject' })}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!vendors?.length}
        skeletonRows={3}
        empty={<EmptyState title="No vendors" description="Add vendors so executives can raise POs." />}
      >
        <div className="space-y-2">
          {(vendors ?? []).map((v) => (
            <div key={v.id} className="panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Truck className="h-4 w-4 text-bekem-accent shrink-0" />
                    <p className="font-semibold text-ink">{v.name}</p>
                    {v.isMsme && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        MSME
                      </span>
                    )}
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
      </ListQueryBoundary>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editTarget ? 'Edit vendor' : 'Add vendor'}
        subtitle={
          wizardStep === 0
            ? 'Step 1 — MSME registration'
            : 'Step 2 — Vendor details'
        }
        className="max-w-xl"
      >
        {wizardStep === 0 && !editTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-secondary">
              Is this vendor registered under MSME (Udyam)?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Yes — MSME registered', value: true },
                { label: 'No — not MSME', value: false },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  className={cn(
                    'rounded-xl border px-4 py-6 text-sm font-semibold text-left',
                    msmeChoice === opt.value
                      ? 'border-bekem-accent bg-bekem-accent/10'
                      : 'border-surface-border hover:border-bekem-accent/30'
                  )}
                  onClick={() => setMsmeChoice(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              variant="primary"
              disabled={msmeChoice === null}
              onClick={() => {
                setForm({ ...form, isMsme: msmeChoice === true });
                setWizardStep(1);
              }}
            >
              Continue
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {form.isMsme && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                <p className="text-xs font-semibold text-emerald-800">MSME details (required)</p>
                <Input
                  placeholder="MSME / Udyam number"
                  value={form.msmeNumber || ''}
                  onChange={(e) => setForm({ ...form, msmeNumber: e.target.value })}
                />
                <label className="flex items-center gap-2 text-sm border border-dashed border-emerald-300 rounded-xl px-3 py-3 cursor-pointer hover:bg-emerald-50">
                  <Upload className="h-4 w-4 text-emerald-700" />
                  <span>{msmeCert?.fileName || 'Upload MSME certificate (PDF or image)'}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => onMsmeFile(e.target.files?.[0] || null)}
                  />
                </label>
                {uploading && (
                  <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                {msmeCert && (
                  <p className="text-xs text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {msmeCert.fileName} attached
                  </p>
                )}
                {editTarget?.msmeCertificateUrl && !msmeCert && (
                  <p className="text-xs text-ink-muted">Existing certificate on file</p>
                )}
              </div>
            )}

            <Input
              placeholder="Vendor name *"
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
                placeholder="GST number *"
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
              />
              <Input
                placeholder="PAN"
                value={form.panNumber || ''}
                onChange={(e) => setForm({ ...form, panNumber: e.target.value })}
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
            <div className="grid sm:grid-cols-3 gap-2">
              <Input
                placeholder="Bank name"
                value={form.bankName || ''}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              />
              <Input
                placeholder="Account no."
                value={form.bankAccountNumber || ''}
                onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
              />
              <Input
                placeholder="IFSC"
                value={form.ifscCode || ''}
                onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
              />
            </div>
            <Input
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <div>
              <p className="text-xs font-semibold text-ink-muted mb-2">Materials supplied</p>
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
            <div className="flex gap-2">
              {!editTarget && (
                <Button variant="secondary" className="flex-1" onClick={() => setWizardStep(0)}>
                  Back
                </Button>
              )}
              <Button
                variant="primary"
                className="flex-1"
                disabled={!canSave || save.isPending}
                onClick={() => save.mutate()}
              >
                {editTarget ? 'Save changes' : 'Add vendor'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
