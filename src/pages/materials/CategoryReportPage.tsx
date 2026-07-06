import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type MaterialCategoryReportDto } from '@afios/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ListQueryBoundary } from '@/components/ListQueryBoundary';

export function CategoryReportPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['material-category-report'],
    queryFn: async () => {
      const res = await api.get<{ data: MaterialCategoryReportDto[] }>('/materials/reports/by-category');
      return res.data.data;
    },
  });

  const remap = useMutation({
    mutationFn: async () => {
      await api.post('/materials/admin/remap-categories');
    },
    onSuccess: () => {
      toast.success('Categories remapped from legacy seed values');
      queryClient.invalidateQueries({ queryKey: ['material-category-report'] });
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Remap failed');
    },
  });

  const total = (data ?? []).reduce((s, r) => s + r.count, 0);

  return (
    <div className="page-container max-w-5xl">
      <PageHeader
        title="Materials by category"
        subtitle={`${total} active materials grouped by procurement category`}
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={remap.isPending}
            onClick={() => remap.mutate()}
          >
            Remap legacy categories
          </Button>
        }
      />

      <ListQueryBoundary
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        retrying={isFetching && !isLoading}
        isEmpty={!data?.length}
        empty={<p className="text-sm text-ink-muted">No materials in catalog.</p>}
      >
        <div className="space-y-4">
          {(data ?? []).map((group) => (
            <div key={group.category} className="panel overflow-hidden">
              <div className="px-3 py-2 border-b border-surface-border bg-surface-muted/50 flex justify-between items-center">
                <p className="font-semibold text-ink">{group.category}</p>
                <span className="text-xs text-ink-muted tabular-nums">{group.count} items</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {group.materials.map((m) => (
                    <tr key={m.id}>
                      <td className="font-mono text-xs">{m.code}</td>
                      <td>{m.name}</td>
                      <td>{m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {group.count > group.materials.length && (
                <p className="text-[11px] text-ink-muted px-3 py-2">
                  Showing {group.materials.length} of {group.count}
                </p>
              )}
            </div>
          ))}
        </div>
      </ListQueryBoundary>
    </div>
  );
}
