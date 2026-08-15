import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TodayActionDto } from '@afios/shared';

export function useTodayActions() {
  return useQuery({
    queryKey: ['dashboard-today'],
    queryFn: async () => {
      const res = await api.get<{ data: TodayActionDto[] }>('/dashboard/today');
      return Array.isArray(res.data.data) ? res.data.data : [];
    },
    staleTime: 60_000,
  });
}
