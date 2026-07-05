import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Search, Package, Building2, MapPin, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  ROLE_COLORS,
  UserRole,
  formatCurrency,
  type MaterialDto,
  type CreateIndentDto,
  type CreateSiteMaterialDto,
  type SiteDto,
} from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SuccessScreen } from '@/components/SuccessScreen';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { QuantityStepper } from '@/components/QuantityStepper';
import { cn } from '@/lib/utils';

interface LineDraft {
  material: MaterialDto;
  quantity: number;
  unit: string;
}

const MATERIAL_CATEGORIES = ['Raw Material', 'Consumables'] as const;

function unitPriceSuffix(unit: string) {
  if (!unit) return '';
  if (unit.length > 1 && unit.endsWith('s')) return unit.slice(0, -1);
  return unit;
}

export function RequestWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accent = ROLE_COLORS[UserRole.SITE_INCHARGE].primary;
  const [step, setStep] = useState<'project' | 'materials'>('project');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [pickQty, setPickQty] = useState(1);
  const [pickUnit, setPickUnit] = useState('Nos');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialDto | null>(null);
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('Nos');
  const [customCategory, setCustomCategory] = useState<(typeof MATERIAL_CATEGORIES)[number]>('Consumables');
  const [customDescription, setCustomDescription] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [indentNumber, setIndentNumber] = useState('');
  const [purpose, setPurpose] = useState('');

  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ['indent-sites'],
    queryFn: async () => {
      const res = await api.get<{ data: SiteDto[] }>('/sites');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (sites?.length === 1 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  const selectedSite = sites?.find((s) => s.id === selectedSiteId);

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', search],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialDto[] }>('/materials', {
        params: { search: search || undefined },
      });
      return res.data.data;
    },
    enabled: step === 'materials',
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateIndentDto) => {
      const res = await api.post<{ data: { indentNumber: string } }>('/material-requests', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      setIndentNumber(data.indentNumber);
      setSuccess(true);
    },
    onError: () => toast.error('Failed to submit indent'),
  });

  const createSiteMaterial = useMutation({
    mutationFn: async (payload: CreateSiteMaterialDto) => {
      const res = await api.post<{ data: MaterialDto; meta: { created: boolean; reused: boolean } }>(
        '/materials/site-request',
        payload
      );
      return res.data;
    },
  });

  const addLine = (material: MaterialDto, qty = pickQty, unit = pickUnit) => {
    if (qty <= 0) return;
    const lineUnit = (unit || material.unit || 'Nos').trim() || 'Nos';
    setLines((prev) => {
      const existing = prev.find((l) => l.material.id === material.id);
      if (existing) {
        return prev.map((l) =>
          l.material.id === material.id
            ? { ...l, quantity: l.quantity + qty, unit: lineUnit }
            : l
        );
      }
      return [...prev, { material, quantity: qty, unit: lineUnit }];
    });
    setSelectedMaterial(null);
    setPickQty(1);
    setPickUnit('Nos');
  };

  const addCustomLine = async () => {
    const name = customName.trim();
    if (!name) {
      toast.error('Enter the material name');
      return;
    }
    if (customQty <= 0) return;
    const unit = customUnit.trim() || 'Nos';

    try {
      const { data: material, meta } = await createSiteMaterial.mutateAsync({
        name,
        unit,
        category: customCategory,
        description: customDescription.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
      addLine(material, customQty, unit);
      setCustomName('');
      setCustomUnit('Nos');
      setCustomCategory('Consumables');
      setCustomDescription('');
      setCustomQty(1);
      setShowCustomForm(false);
      toast.success(
        meta.reused
          ? `“${name}” already in catalog — added to indent`
          : `“${name}” saved to Material Master and added to indent`
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not save material');
    }
  };

  const updateLineQty = (materialId: string, quantity: number) => {
    if (quantity <= 0) {
      setLines((prev) => prev.filter((l) => l.material.id !== materialId));
      return;
    }
    setLines((prev) =>
      prev.map((l) => (l.material.id === materialId ? { ...l, quantity } : l))
    );
  };

  const updateLineUnit = (materialId: string, unit: string) => {
    setLines((prev) =>
      prev.map((l) => (l.material.id === materialId ? { ...l, unit } : l))
    );
  };

  const removeLine = (materialId: string) => {
    setLines((prev) => prev.filter((l) => l.material.id !== materialId));
  };

  const selectMaterial = (material: MaterialDto) => {
    setSelectedMaterial(material);
    const inCart = lines.find((l) => l.material.id === material.id);
    setPickQty(inCart?.quantity ?? 1);
    setPickUnit(inCart?.unit || material.unit || 'Nos');
  };

  if (success) {
    return (
      <SuccessScreen
        title="Indent submitted!"
        message={`${indentNumber} sent to store. You'll be notified at each step.`}
        accentColor={accent}
        primaryAction={{ label: 'Back to home', onClick: () => navigate('/site') }}
        secondaryAction={{ label: 'View my indents', onClick: () => navigate('/requests') }}
      />
    );
  }

  const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);

  if (step === 'project') {
    return (
      <div className="page-container max-w-2xl">
        <PageHeader
          eyebrow="Site Manager · Step 1 of 2"
          title="Select project"
          subtitle="Confirm which project and site this material indent is for before adding items."
        />

        {sitesLoading ? (
          <div className="h-48 rounded-3xl bg-surface-muted animate-pulse" />
        ) : !sites?.length ? (
          <EmptyState
            title="No site assigned"
            description="Your account has no project or site linked. Contact the coordinator."
          />
        ) : (
          <div className="space-y-4">
            {sites.map((site) => {
              const isSelected = selectedSiteId === site.id;
              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => setSelectedSiteId(site.id)}
                  className={cn(
                    'w-full text-left rounded-3xl border p-6 transition-all duration-200',
                    isSelected
                      ? 'border-bekem-accent bg-bekem-accent/5 shadow-md ring-2 ring-bekem-accent/20'
                      : 'border-surface-border bg-white hover:border-bekem-accent/40 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
                        isSelected ? 'bg-bekem-accent text-white' : 'bg-surface-muted text-ink-secondary'
                      )}
                    >
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                        Project
                      </p>
                      <p className="text-lg font-semibold text-ink mt-1">
                        {site.project?.name || 'Project'}
                      </p>
                      <p className="text-sm text-bekem-accent font-medium mt-0.5">
                        {site.project?.code}
                      </p>
                      <div className="flex items-center gap-1.5 mt-3 text-sm text-ink-secondary">
                        <MapPin className="h-4 w-4 shrink-0 text-ink-muted" />
                        <span>
                          {site.name}
                          {site.chainageLabel ? ` · ${site.chainageLabel}` : ''}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-bekem-accent text-white">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            <Button
              variant="accent"
              size="lg"
              accentColor={accent}
              className="w-full mt-2"
              disabled={!selectedSiteId}
              onClick={() => setStep('materials')}
            >
              Continue to materials
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-container max-w-5xl">
      <PageHeader
        eyebrow="Site Manager · Step 2 of 2"
        title="Raise material indent"
        subtitle="Search the catalog, or add a product name if it is not listed yet."
        action={
          <Button variant="secondary" size="sm" onClick={() => setStep('project')}>
            Change project
          </Button>
        }
      />

      {selectedSite && (
        <div className="mb-6 rounded-2xl border border-bekem-accent/20 bg-gradient-to-r from-bekem-navy/5 to-bekem-accent/5 px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Project</p>
            <p className="font-semibold text-ink">
              {selectedSite.project?.code} — {selectedSite.project?.name}
            </p>
          </div>
          <div className="h-8 w-px bg-surface-border hidden sm:block" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Site</p>
            <p className="font-medium text-ink-secondary">
              {selectedSite.name}
              {selectedSite.chainageLabel ? ` · ${selectedSite.chainageLabel}` : ''}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        {/* Cart */}
        <aside className="lg:col-span-2 order-1 lg:order-2">
          <div className="panel p-5 lg:sticky lg:top-20 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Your indent</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-bekem-accent/10 text-bekem-accent">
                {lines.length} item{lines.length !== 1 ? 's' : ''}
              </span>
            </div>

            {lines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border bg-surface-muted/40 px-4 py-8 text-center">
                <Package className="h-8 w-8 text-ink-muted mx-auto mb-2" />
                <p className="text-sm font-medium text-ink-secondary">No materials added yet</p>
                <p className="text-xs text-ink-muted mt-1">
                  Select from catalog or add a product not listed
                </p>
              </div>
            ) : (
              <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {lines.map((line, idx) => (
                  <li
                    key={line.material.id}
                    className="rounded-2xl border border-surface-border bg-white p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-muted">#{idx + 1}</p>
                        <p className="font-semibold text-sm text-ink truncate">{line.material.name}</p>
                        <p className="text-xs text-ink-secondary mt-0.5">
                          {line.material.code}
                          {line.material.grade ? ` · ${line.material.grade}` : ''}
                          {line.material.category ? ` · ${line.material.category}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.material.id)}
                        className="shrink-0 p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <QuantityStepper
                        size="compact"
                        value={line.quantity}
                        onChange={(v) => updateLineQty(line.material.id, v)}
                        min={1}
                        unit={line.unit}
                        accentColor={accent}
                      />
                      <div>
                        <label className="text-[10px] font-semibold text-ink-muted mb-0.5 block">
                          Unit
                        </label>
                        <Input
                          value={line.unit}
                          onChange={(e) => updateLineUnit(line.material.id, e.target.value)}
                          placeholder="Nos"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    {line.material.unitPrice != null && (
                      <p className="text-xs text-ink-secondary">
                        <span className="font-semibold text-ink-muted">Unit Price:</span>{' '}
                        {formatCurrency(line.material.unitPrice)}
                        {line.unit ? ` / ${unitPriceSuffix(line.unit)}` : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2 border-t border-surface-border space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink-muted mb-1 block">
                  Reason for request <span className="text-danger">*</span>
                </label>
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Why is this material needed? (mandatory)"
                  className="text-sm"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">Total quantity</span>
                <span className="font-semibold text-ink tabular-nums">{totalItems}</span>
              </div>
              <Button
                variant="accent"
                size="lg"
                accentColor={accent}
                className="w-full"
                disabled={lines.length === 0 || !purpose.trim() || mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    purpose: purpose.trim(),
                    items: lines.map((l) => ({
                      materialId: l.material.id,
                      unit: l.unit || l.material.unit || 'Nos',
                      quantityRequested: l.quantity,
                    })),
                  })
                }
              >
                <Plus className="h-4 w-4" />
                {mutation.isPending ? 'Submitting…' : 'Submit indent'}
              </Button>
            </div>
          </div>
        </aside>

        {/* Material picker */}
        <div className="lg:col-span-3 order-2 lg:order-1 space-y-5">
          <div className="panel p-5 space-y-4">
            <label className="text-sm font-semibold text-ink">Search materials</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code, name, grade…"
                className="pl-10 h-11"
              />
            </div>

            {selectedMaterial && (
              <div className="rounded-2xl border border-bekem-accent/30 bg-bekem-accent/5 p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-bekem-accent">
                    Selected
                  </p>
                  <p className="font-semibold text-ink mt-1">{selectedMaterial.name}</p>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    {selectedMaterial.code}
                    {selectedMaterial.grade ? ` · ${selectedMaterial.grade}` : ''}
                  </p>
                  {selectedMaterial.unitPrice != null && (
                    <p className="text-xs text-ink-muted mt-1">
                      Unit price (reference): {formatCurrency(selectedMaterial.unitPrice)}
                      {pickUnit ? ` / ${unitPriceSuffix(pickUnit)}` : ''}
                    </p>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4 items-end">
                  <QuantityStepper
                    value={pickQty}
                    onChange={setPickQty}
                    min={1}
                    unit={pickUnit}
                    accentColor={accent}
                  />
                  <div>
                    <label className="text-xs font-semibold text-ink-muted mb-1 block">Unit</label>
                    <Input
                      value={pickUnit}
                      onChange={(e) => setPickUnit(e.target.value)}
                      placeholder="Nos, Pkts, Mtr…"
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setSelectedMaterial(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="accent"
                    accentColor={accent}
                    className="flex-1"
                    onClick={() => addLine(selectedMaterial, pickQty, pickUnit)}
                  >
                    Add to indent
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted px-1">
              {search ? 'Search results' : 'Catalog'}
            </p>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-surface-muted animate-pulse" />
                ))}
              </div>
            ) : search && !materials?.length ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 px-4 py-6 text-center space-y-3">
                <p className="text-sm font-medium text-ink">No catalog match for “{search}”</p>
                <p className="text-xs text-ink-secondary">
                  You can still request it — store will procure and deliver.
                </p>
                <Button
                  variant="accent"
                  accentColor={accent}
                  onClick={() => {
                    setCustomName(search.trim());
                    setShowCustomForm(true);
                  }}
                >
                  Add “{search.trim()}” as new material
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {materials?.slice(0, 12).map((m) => {
                  const inCart = lines.find((l) => l.material.id === m.id);
                  const isSelected = selectedMaterial?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMaterial(m)}
                      className={cn(
                        'w-full text-left rounded-2xl border px-4 py-3 transition-all duration-200',
                        isSelected
                          ? 'border-bekem-accent bg-bekem-accent/5 shadow-sm'
                          : 'border-surface-border bg-white hover:border-bekem-accent/40 hover:shadow-sm'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-ink">{m.name}</p>
                          <p className="text-xs text-ink-secondary mt-0.5">
                            {m.pickerSubtitle ?? (
                              <>
                                {m.code}
                                {m.grade ? ` · ${m.grade}` : ''} · {m.unit}
                              </>
                            )}
                          </p>
                        </div>
                        {inCart ? (
                          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {inCart.quantity} {m.unit}
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs font-medium text-bekem-accent">
                            Select →
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl border border-surface-border bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">Material not in catalog?</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Add a new material — it is saved to Material Master immediately.
                  </p>
                </div>
                {!showCustomForm && (
                  <Button variant="secondary" size="sm" onClick={() => setShowCustomForm(true)}>
                    Add new material
                  </Button>
                )}
              </div>

              {showCustomForm && (
                <div className="space-y-3 pt-1 border-t border-surface-border">
                  <div>
                    <label className="text-xs font-semibold text-ink-muted mb-1 block">
                      Material name <span className="text-danger">*</span>
                    </label>
                    <Input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Sand, Cement"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-ink-muted mb-1 block">
                        Unit <span className="text-danger">*</span>
                      </label>
                      <Input
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        placeholder="Nos, Mts, Bags…"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-muted mb-1 block">
                        Category <span className="text-danger">*</span>
                      </label>
                      <select
                        value={customCategory}
                        onChange={(e) =>
                          setCustomCategory(e.target.value as (typeof MATERIAL_CATEGORIES)[number])
                        }
                        className="w-full h-10 rounded-xl border border-surface-border px-3 text-sm bg-white"
                      >
                        {MATERIAL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink-muted mb-1 block">
                      Description (optional)
                    </label>
                    <Input
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Grade, spec, or usage notes"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink-muted mb-1 block">
                      Quantity for this indent
                    </label>
                    <QuantityStepper
                      size="compact"
                      value={customQty}
                      onChange={setCustomQty}
                      min={1}
                      unit={customUnit || 'Nos'}
                      accentColor={accent}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setShowCustomForm(false);
                        setCustomName('');
                        setCustomQty(1);
                        setCustomDescription('');
                      }}
                      disabled={createSiteMaterial.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="accent"
                      accentColor={accent}
                      className="flex-1"
                      onClick={() => void addCustomLine()}
                      disabled={createSiteMaterial.isPending}
                    >
                      {createSiteMaterial.isPending ? 'Saving…' : 'Save & add to indent'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
