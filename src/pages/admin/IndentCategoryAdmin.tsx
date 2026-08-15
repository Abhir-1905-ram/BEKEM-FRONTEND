import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { ExecutiveAssignmentsDto, IndentCategoryDto } from '@afios/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';

export function IndentCategoryAdminPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string[]>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['executive-assignments'],
    queryFn: async () => {
      const res = await api.get<{ data: ExecutiveAssignmentsDto }>('/admin/executive-assignments');
      const payload = res.data.data;
      const next: Record<string, string[]> = {};
      for (const exec of payload.executives) {
        next[exec.id] = exec.assignedIndentCategoryIds || [];
      }
      setDraftAssignments(next);
      return payload;
    },
  });

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<{ data: IndentCategoryDto }>('/indent-categories', { name });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Category created');
      setNewName('');
      queryClient.invalidateQueries({ queryKey: ['executive-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['indent-categories'] });
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Could not create category');
    },
  });

  const saveAssignments = useMutation({
    mutationFn: async () => {
      if (!data) return;
      await Promise.all(
        data.executives.map((exec) =>
          api.patch(`/admin/executive-assignments/${exec.id}`, {
            assignedIndentCategoryIds: draftAssignments[exec.id] || [],
          })
        )
      );
    },
    onSuccess: () => {
      toast.success('Executive assignments saved');
      queryClient.invalidateQueries({ queryKey: ['executive-assignments'] });
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Save failed');
    },
  });

  const toggleAssignment = (executiveId: string, categoryId: string) => {
    setDraftAssignments((prev) => {
      const current = new Set(prev[executiveId] || []);
      if (current.has(categoryId)) current.delete(categoryId);
      else current.add(categoryId);
      return { ...prev, [executiveId]: [...current] };
    });
  };

  const activeCategories = (data?.categories || []).filter((c) => c.isActive !== false);

  return (
    <div className="page-container max-w-5xl">
      <PageHeader
        title="Indent categories"
        subtitle="One category per indent — only assigned executives receive those indents"
      />

      <ListQueryBoundary isLoading={isLoading} isError={isError} onRetry={() => refetch()} empty={<></>}>
        {data && (
          <div className="space-y-3">
            <section className="panel p-3 space-y-3">
              <h2 className="text-sm font-semibold text-ink">Manage categories</h2>
              <p className="text-xs text-ink-muted">
                Coordinator and MD create categories here. Site selects one when raising an indent.
              </p>
              <div className="flex flex-wrap gap-2">
                {data.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      cat.isActive === false
                        ? 'bg-surface-muted text-ink-muted line-through'
                        : 'bg-bekem-accent/10 text-bekem-accent'
                    }`}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <label className="text-[11px] font-medium text-ink-muted mb-1 block">New category</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Electrical"
                  />
                </div>
                <Button
                  variant="accent"
                  disabled={!newName.trim() || createCategory.isPending}
                  onClick={() => createCategory.mutate(newName.trim())}
                >
                  <Plus className="h-4 w-4" />
                  Add category
                </Button>
              </div>
            </section>

            <section className="panel p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assign categories to executives
                </h2>
                <Button
                  variant="accent"
                  size="sm"
                  disabled={saveAssignments.isPending || !data.executives.length}
                  onClick={() => saveAssignments.mutate()}
                >
                  <Save className="h-4 w-4" />
                  {saveAssignments.isPending ? 'Saving…' : 'Save assignments'}
                </Button>
              </div>
              {!data.executives.length ? (
                <p className="text-sm text-ink-secondary">No executives found.</p>
              ) : (
                <div className="procurement-landscape-scroll">
                  <table className="data-table min-w-[640px]">
                    <thead>
                      <tr>
                        <th>Executive</th>
                        {activeCategories.map((cat) => (
                          <th key={cat.id} className="text-center">
                            {cat.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.executives.map((exec) => (
                        <tr key={exec.id}>
                          <td className="font-medium">{exec.name}</td>
                          {activeCategories.map((cat) => {
                            const checked = (draftAssignments[exec.id] || []).includes(cat.id);
                            return (
                              <td key={cat.id} className="text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleAssignment(exec.id, cat.id)}
                                  className="rounded border-surface-border"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </ListQueryBoundary>
    </div>
  );
}
