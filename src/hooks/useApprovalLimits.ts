import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApprovalLimitsDto } from '@afios/shared';

export function useApprovalLimits() {
  return useQuery({
    queryKey: ['approval-limits'],
    queryFn: async () => {
      const res = await api.get<{ data: ApprovalLimitsDto }>('/admin/org-settings/approval-limits');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export function fmtInrLimit(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}
