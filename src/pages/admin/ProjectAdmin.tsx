import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  MapPin,
  UserPlus,
  Plus,
  ChevronRight,
  ArrowLeft,
  FileText,
  ShoppingCart,
  Users,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  CreateProjectDto,
  CreateSiteDto,
  ProjectDto,
  UpdateProjectDto,
  MaterialRequestDto,
  PurchaseOrderDto,
  UserDto,
} from '@afios/shared';
import { ROLE_LABELS, UserRole, formatDate, ProjectStatus } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ActionCard } from '@/components/ui/ActionCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { cn } from '@/lib/utils';

interface ProjectDetail {
  project: ProjectDto;
  sites: Array<{ id: string; name: string; chainageLabel: string; projectId: string }>;
  users: UserDto[];
  materialRequests: MaterialRequestDto[];
  purchaseOrders: PurchaseOrderDto[];
}

type DetailTab = 'users' | 'pos' | 'indents';

export function ProjectAdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('users');
  const [projectForm, setProjectForm] = useState<CreateProjectDto>({
    code: '',
    name: '',
    location: '',
    budgetTotal: 50000000,
  });
  const [siteForm, setSiteForm] = useState<CreateSiteDto>({
    projectId: '',
    name: '',
    chainageLabel: '',
  });
  const [editProjectForm, setEditProjectForm] = useState<UpdateProjectDto>({
    name: '',
    location: '',
    status: ProjectStatus.ACTIVE,
    budgetTotal: 0,
    healthScore: 85,
  });
  const [assignUserId, setAssignUserId] = useState('');

  const { data: projects, list: projectsList } = useListQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get<{ data: ProjectDto[] }>('/projects');
      return normalizeListData<ProjectDto>(res.data.data);
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get<{ data: UserDto[] }>('/users');
      return res.data.data;
    },
  });

  const { data: detail, isLoading: detailLoading, isError: detailError, refetch: refetchDetail, isFetching: detailFetching } = useQuery({
    queryKey: ['project-detail', selectedProjectId],
    queryFn: async () => {
      const res = await api.get<{ data: ProjectDetail }>(`/projects/${selectedProjectId}/detail`);
      return res.data.data;
    },
    enabled: !!selectedProjectId,
  });

  const createProject = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: ProjectDto }>('/projects', projectForm);
      return res.data.data;
    },
    onSuccess: (p) => {
      toast.success(`Project ${p.code} created`);
      setProjectForm({ code: '', name: '', location: '', budgetTotal: 50000000 });
      setShowProjectModal(false);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const assignUser = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/projects/${selectedProjectId}/users`, { userId });
    },
    onSuccess: () => {
      toast.success('User assigned to project');
      setAssignUserId('');
      queryClient.invalidateQueries({ queryKey: ['project-detail', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Could not assign user');
    },
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/projects/${selectedProjectId}/users/${userId}`);
    },
    onSuccess: () => {
      toast.success('User removed from project');
      queryClient.invalidateQueries({ queryKey: ['project-detail', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Could not remove user');
    },
  });

  const createSite = useMutation({
    mutationFn: async () => {
      await api.post('/sites', siteForm);
    },
    onSuccess: () => {
      toast.success('Site added');
      setSiteForm({ projectId: siteForm.projectId, name: '', chainageLabel: '' });
      setShowSiteModal(false);
      queryClient.invalidateQueries({ queryKey: ['project-detail', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['all-sites'] });
    },
  });

  const updateProject = useMutation({
    mutationFn: async () => {
      const res = await api.patch<{ data: ProjectDto }>(
        `/projects/${selectedProjectId}`,
        editProjectForm
      );
      return res.data.data;
    },
    onSuccess: (p) => {
      toast.success(`Project ${p.code} updated`);
      setShowEditProjectModal(false);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-detail', selectedProjectId] });
    },
    onError: () => toast.error('Could not update project'),
  });

  const openSiteModal = (projectId: string) => {
    setSiteForm({ projectId, name: '', chainageLabel: '' });
    setShowSiteModal(true);
  };

  const openEditProjectModal = (project: ProjectDto) => {
    setEditProjectForm({
      name: project.name,
      location: project.location,
      status: project.status,
      budgetTotal: project.budgetTotal,
      healthScore: project.healthScore,
    });
    setShowEditProjectModal(true);
  };

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const displayProject = detail?.project ?? selectedProject;

  if (selectedProjectId && displayProject) {
    return (
      <div className="page-container max-w-5xl">
        <button
          type="button"
          onClick={() => setSelectedProjectId(null)}
          className="flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All projects
        </button>

        <PageHeader
          title={`${displayProject.code} — ${displayProject.name}`}
          subtitle={displayProject.location}
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => openEditProjectModal(displayProject)}>
                <Pencil className="h-4 w-4" />
                Edit project
              </Button>
              <Button variant="secondary" onClick={() => openSiteModal(displayProject.id)}>
                <MapPin className="h-4 w-4" />
                Add site
              </Button>
              <Button variant="secondary" onClick={() => navigate('/admin/users')}>
                <UserPlus className="h-4 w-4" />
                Create users
              </Button>
            </div>
          }
        />

        <div className="grid sm:grid-cols-4 gap-3 mb-4">
          <ActionCard title="Team" count={detail?.users.length ?? 0} icon={Users} tone="primary" />
          <ActionCard
            title="Sites"
            count={detail?.sites.length ?? 0}
            icon={MapPin}
            tone="info"
          />
          <ActionCard
            title="Indents"
            count={detail?.materialRequests.length ?? 0}
            icon={FileText}
            tone="warning"
          />
          <ActionCard
            title="Purchase orders"
            count={detail?.purchaseOrders.length ?? 0}
            icon={ShoppingCart}
            tone="neutral"
          />
        </div>

        <div className="flex gap-1 bg-surface-muted rounded-xl p-1 mb-3 w-fit">
          {(
            [
              { key: 'users' as const, label: 'Users' },
              { key: 'indents' as const, label: 'Material indents' },
              { key: 'pos' as const, label: 'Purchase orders' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setDetailTab(t.key)}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-lg transition-all',
                detailTab === t.key
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-secondary hover:text-ink'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ListQueryBoundary
          isLoading={detailLoading}
          isError={detailError}
          onRetry={() => refetchDetail()}
          retrying={detailFetching && !detailLoading}
          skeletonRows={3}
          empty={<></>}
        >
        {detailTab === 'users' ? (
          <div className="space-y-3">
            <div className="panel p-3 flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label className="text-xs font-semibold text-ink-muted mb-1 block">
                  Assign user to this project
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-surface-border bg-white px-3 text-sm"
                >
                  <option value="">Select user…</option>
                  {(allUsers ?? [])
                    .filter((u) =>
                      [
                        UserRole.SITE_INCHARGE,
                        UserRole.STORE_INCHARGE,
                        UserRole.PROJECT_MANAGER,
                      ].includes(u.role as UserRole)
                    )
                    .filter((u) => !detail?.users.some((d) => d.id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {ROLE_LABELS[u.role as UserRole]}
                        {u.assignedProjectIds?.length
                          ? ` (currently ${u.assignedProjectIds.length} project${u.assignedProjectIds.length > 1 ? 's' : ''})`
                          : ' (unassigned)'}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-ink-muted mt-1">
                  Site Manager &amp; Project Manager: one project only (replaces existing). Store
                  Manager: can be on many projects.
                </p>
              </div>
              <Button
                variant="accent"
                disabled={!assignUserId || assignUser.isPending}
                onClick={() => assignUser.mutate(assignUserId)}
              >
                <UserPlus className="h-4 w-4" />
                Assign
              </Button>
            </div>

            {!detail?.users.length ? (
              <p className="text-sm text-ink-secondary panel p-6">
                No users assigned yet. Create accounts under Manage users, then assign them here.
              </p>
            ) : (
              <div className="space-y-2">
                {detail.users.map((u) => {
                  const isHq = [
                    UserRole.EXECUTIVE,
                    UserRole.COORDINATOR,
                    UserRole.CHAIRMAN,
                  ].includes(u.role as UserRole);
                  return (
                    <div key={u.id} className="data-row cursor-default hover:translate-y-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: u.avatarColor || '#1A4FA0' }}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{u.name}</p>
                          <p className="text-sm text-ink-secondary truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                          {ROLE_LABELS[u.role as UserRole]}
                          {isHq ? ' · all projects' : ''}
                        </span>
                        {!isHq && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={removeUser.isPending}
                            onClick={() => removeUser.mutate(u.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : detailTab === 'indents' ? (
          <div className="space-y-2">
            {!detail?.materialRequests.length ? (
              <p className="text-sm text-ink-secondary panel p-6">
                No material indents from site teams yet.
              </p>
            ) : (
              detail.materialRequests.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => navigate(`/requests/${r.id}`)}
                  className="data-row w-full text-left"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{r.indentNumber}</p>
                    <p className="text-sm text-ink-secondary mt-0.5 line-clamp-1">{r.purpose}</p>
                    <p className="text-xs text-ink-muted mt-1">
                      {r.site?.name} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.status} />
                    <ChevronRight className="h-4 w-4 text-ink-muted" />
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {!detail?.purchaseOrders.length ? (
              <p className="text-sm text-ink-secondary panel p-6">
                No purchase orders generated for this project yet.
              </p>
            ) : (
              detail.purchaseOrders.map((po) => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => navigate(`/purchase-orders/${po.id}`)}
                  className="data-row w-full text-left"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{po.poNumber || 'Draft PO'}</p>
                    <p className="text-sm text-ink-secondary mt-0.5">
                      {po.vendor?.name} · ₹{po.amount?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={po.status} />
                    <ChevronRight className="h-4 w-4 text-ink-muted" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
        </ListQueryBoundary>

        <Modal
          open={showSiteModal}
          onClose={() => setShowSiteModal(false)}
          title="Add site"
          subtitle={`New site for ${displayProject.code}`}
        >
          <div className="space-y-3">
            <Input
              placeholder="Site name"
              value={siteForm.name}
              onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
            />
            <Input
              placeholder="Chainage / location label"
              value={siteForm.chainageLabel}
              onChange={(e) => setSiteForm({ ...siteForm, chainageLabel: e.target.value })}
            />
            <Button
              variant="primary"
              className="w-full"
              disabled={!siteForm.name || createSite.isPending}
              onClick={() => createSite.mutate()}
            >
              Add site
            </Button>
          </div>
        </Modal>

        <Modal
          open={showEditProjectModal}
          onClose={() => setShowEditProjectModal(false)}
          title="Edit project"
          subtitle={`${displayProject.code} — project details`}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted">Project code</label>
              <Input value={displayProject.code} disabled className="mt-1 bg-surface-muted" />
            </div>
            <Input
              placeholder="Project name"
              value={editProjectForm.name || ''}
              onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
            />
            <Input
              placeholder="Location"
              value={editProjectForm.location || ''}
              onChange={(e) => setEditProjectForm({ ...editProjectForm, location: e.target.value })}
            />
            <div>
              <label className="text-xs font-semibold text-ink-muted">Status</label>
              <select
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm bg-white"
                value={editProjectForm.status || ProjectStatus.ACTIVE}
                onChange={(e) => setEditProjectForm({ ...editProjectForm, status: e.target.value })}
              >
                <option value={ProjectStatus.ACTIVE}>Active</option>
                <option value={ProjectStatus.ON_HOLD}>On hold</option>
                <option value={ProjectStatus.COMPLETED}>Completed</option>
              </select>
            </div>
            <Input
              type="number"
              placeholder="Budget (₹)"
              value={editProjectForm.budgetTotal ?? 0}
              onChange={(e) =>
                setEditProjectForm({ ...editProjectForm, budgetTotal: Number(e.target.value) })
              }
            />
            <Input
              type="number"
              placeholder="Health score (0–100)"
              min={0}
              max={100}
              value={editProjectForm.healthScore ?? 85}
              onChange={(e) =>
                setEditProjectForm({ ...editProjectForm, healthScore: Number(e.target.value) })
              }
            />
            <Button
              variant="primary"
              className="w-full"
              disabled={!editProjectForm.name?.trim() || !editProjectForm.location?.trim() || updateProject.isPending}
              onClick={() => updateProject.mutate()}
            >
              Save changes
            </Button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="page-container max-w-5xl">
      <PageHeader
        title="Projects"
        subtitle="Portfolio overview — open a project to see team, indents, and POs"
        action={
          <Button variant="primary" onClick={() => setShowProjectModal(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 gap-2.5 mb-4">
        <ActionCard
          title="Active projects"
          count={projects?.length ?? 0}
          icon={Building2}
          tone="primary"
        />
        <ActionCard
          title="Users"
          count={allUsers?.length ?? 0}
          icon={UserPlus}
          tone="neutral"
          onClick={() => navigate('/admin/users')}
        />
      </div>

      <section>
        <h2 className="section-label mb-4">Portfolio</h2>
        <ListQueryBoundary
          isLoading={projectsList.isLoading}
          isError={projectsList.isError}
          onRetry={projectsList.onRetry}
          retrying={projectsList.retrying}
          isEmpty={!projects?.length}
          skeletonRows={4}
          empty={<></>}
        >
        <div className="space-y-2">
          {(projects ?? []).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedProjectId(p.id);
                setDetailTab('users');
              }}
              className="data-row w-full text-left"
            >
              <div>
                <p className="font-semibold text-ink">
                  {p.code} — {p.name}
                </p>
                <p className="text-sm text-ink-secondary mt-0.5">{p.location}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={p.status} />
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </div>
            </button>
          ))}
        </div>
        </ListQueryBoundary>
      </section>

      <Modal
        open={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="New project"
        subtitle="Create a project and assign sites and team members"
      >
        <div className="space-y-3">
          <Input
            placeholder="Project code (PRJ-003)"
            value={projectForm.code}
            onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })}
          />
          <Input
            placeholder="Project name"
            value={projectForm.name}
            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
          />
          <Input
            placeholder="Location"
            value={projectForm.location}
            onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Budget (₹)"
            value={projectForm.budgetTotal}
            onChange={(e) =>
              setProjectForm({ ...projectForm, budgetTotal: Number(e.target.value) })
            }
          />
          <Button
            variant="primary"
            className="w-full"
            disabled={!projectForm.code || !projectForm.name || createProject.isPending}
            onClick={() => createProject.mutate()}
          >
            Create project
          </Button>
        </div>
      </Modal>
    </div>
  );
}
