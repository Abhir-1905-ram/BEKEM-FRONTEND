import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { ROLE_LABELS, UserRole, type UserAnalyticsRowDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';
import { useListQuery, normalizeListData } from '@/hooks/useListQuery';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All roles' },
  ...Object.values(UserRole).map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  })),
];

export function UserAnalyticsPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data: rows, list } = useListQuery({
    queryKey: ['user-analytics'],
    queryFn: async () => {
      const res = await api.get<{ data: UserAnalyticsRowDto[] }>('/dashboard/user-analytics');
      return normalizeListData<UserAnalyticsRowDto>(res.data.data);
    },
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== 'all' && row.role !== roleFilter) return false;
      if (!term) return true;
      return (
        row.name.toLowerCase().includes(term) ||
        row.email.toLowerCase().includes(term) ||
        row.projects.some((p) => p.code.toLowerCase().includes(term) || p.name.toLowerCase().includes(term)) ||
        row.site?.name.toLowerCase().includes(term)
      );
    });
  }, [rows, search, roleFilter]);

  return (
    <div className="page-container max-w-6xl">
      <PageHeader
        title="User analytics"
        subtitle="Activity and assignments across every user in Bekem OS"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Search name, email, project, site…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-xl border border-surface-border bg-white px-3 text-sm text-ink"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <ListQueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={list.onRetry}
        retrying={list.retrying}
        isEmpty={!filtered.length}
        skeletonRows={4}
        empty={
          <EmptyState
            title="No users match"
            description="Try a different search or role filter."
          />
        }
      >
        <div className="table-shell overflow-x-auto">
          <table className="data-table min-w-[880px]">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Projects</th>
                <th>Site</th>
                <th className="text-right">Indents</th>
                <th className="text-right">Incidents</th>
                <th className="text-right">PO verified</th>
                <th className="text-right">PO approved</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <p className="font-medium text-ink">{row.name}</p>
                    <p className="text-xs text-ink-muted">{row.email}</p>
                  </td>
                  <td>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-bekem-accent-soft text-bekem-accent">
                      {ROLE_LABELS[row.role as UserRole] || row.role}
                    </span>
                  </td>
                  <td>
                    {row.projects.length ? (
                      <div className="flex flex-wrap gap-1">
                        {row.projects.map((p) => (
                          <span
                            key={p.id}
                            className="text-xs px-1.5 py-0.5 rounded bg-surface-muted text-ink-secondary"
                            title={p.name}
                          >
                            {p.code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-ink-muted text-sm">—</span>
                    )}
                  </td>
                  <td>
                    {row.site ? (
                      <div>
                        <p className="text-sm">{row.site.name}</p>
                        {row.site.chainageLabel && (
                          <p className="text-xs text-ink-muted">{row.site.chainageLabel}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-ink-muted text-sm">—</span>
                    )}
                  </td>
                  <td className={cn('text-right tabular-nums', row.materialIndents > 0 && 'font-semibold')}>
                    {row.materialIndents}
                  </td>
                  <td className={cn('text-right tabular-nums', row.safetyIncidents > 0 && 'font-semibold')}>
                    {row.safetyIncidents}
                  </td>
                  <td className="text-right tabular-nums">{row.poVerifications}</td>
                  <td className="text-right tabular-nums">{row.chairmanApprovals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListQueryBoundary>

      {rows && rows.length > 0 && (
        <p className="text-xs text-ink-muted mt-4 flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          Showing {filtered.length} of {rows.length} users · Indents = material requests raised ·
          Incidents = safety/site reports
        </p>
      )}
    </div>
  );
}
