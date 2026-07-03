import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ROLE_LABELS, UserRole, type CreateUserDto, type UserDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { useI18n } from '@/i18n/I18nContext';

interface UserRow extends UserDto {
  projects?: Array<{ id: string; code: string; name: string }>;
}

const EMPTY_FORM: CreateUserDto = {
  name: '',
  email: '',
  password: '',
  role: UserRole.SITE_INCHARGE,
  assignedProjectIds: [],
  assignedSiteId: null,
};

function isAllProjectsRole(role: string) {
  return (
    role === UserRole.EXECUTIVE ||
    role === UserRole.COORDINATOR ||
    role === UserRole.CHAIRMAN
  );
}

export function UserProvisioningPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [form, setForm] = useState<CreateUserDto>({ ...EMPTY_FORM });

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get<{ data: UserRow[] }>('/users');
      return res.data.data;
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: UserDto }>('/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      return res.data.data;
    },
    onSuccess: (user) => {
      toast.success(
        `${ROLE_LABELS[user.role as UserRole] || user.role} created. Assign projects under Projects.`
      );
      setForm({
        ...EMPTY_FORM,
        role: form.role,
        password: form.password,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || err.message || 'Could not create user');
    },
  });

  const canSubmit =
    form.name.trim() && form.email.trim() && form.password.length >= 8 && !createUser.isPending;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="page-container max-w-4xl">
      <PageHeader
        title={t('admin.title')}
        subtitle="Create accounts here. Assign people to projects in Projects."
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/projects')}>
            Go to Projects
          </Button>
        }
      />

      <section className="panel p-4 mb-6 text-sm text-ink-secondary">
        <p>
          This page only creates users (name, email, password, role). Open a project under{' '}
          <button
            type="button"
            className="font-semibold text-bekem-accent hover:underline"
            onClick={() => navigate('/admin/projects')}
          >
            Projects
          </button>{' '}
          to assign Site Managers, Store Managers, and Project Managers.
        </p>
        <p className="mt-1">
          Executive, Coordinator, and Chairman are on <strong className="text-ink">all projects</strong>{' '}
          automatically.
        </p>
      </section>

      <section className="panel p-5 mb-8">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
          <UserPlus className="h-4 w-4" />
          {t('admin.createUser')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">{t('admin.name')}</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">{t('admin.email')}</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">{t('admin.password')}</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">{t('admin.role')}</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full h-10 rounded-lg border border-surface-border bg-white px-3 text-sm"
            >
              {Object.values(UserRole).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          variant="accent"
          className="mt-4"
          disabled={!canSubmit}
          onClick={() => createUser.mutate()}
        >
          {createUser.isPending ? 'Creating…' : 'Create user & add another'}
        </Button>
      </section>

      <section>
        <h2 className="text-sm font-bold text-ink mb-4">
          {t('admin.users')} ({users?.length ?? 0})
        </h2>
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-ink-muted">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-ink-muted">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-ink-muted">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-ink-muted">Projects</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-4 py-3 text-ink-secondary">{u.email}</td>
                  <td className="px-4 py-3 text-ink-secondary">
                    {ROLE_LABELS[u.role as UserRole] || u.role}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary text-xs">
                    {isAllProjectsRole(u.role)
                      ? 'All projects'
                      : u.projects?.length
                        ? u.projects.map((p) => p.code).join(', ')
                        : u.assignedProjectIds?.length
                          ? `${u.assignedProjectIds.length} project(s)`
                          : 'Not assigned'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
