import { useQuery } from '@tanstack/react-query';
import { POQueuePage } from '@/pages/shared/POQueuePage';
import { api } from '@/lib/api';
import type { ApprovalLimitsDto } from '@afios/shared';

function fmtInr(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function PMPOApprovalsPage() {
  const { data: limits } = useQuery({
    queryKey: ['approval-limits'],
    queryFn: async () => {
      const res = await api.get<{ data: ApprovalLimitsDto }>('/admin/org-settings/approval-limits');
      return res.data.data;
    },
  });

  const subtitle = limits
    ? `POs under ${fmtInr(limits.poPmMaxInr)} — Project Manager final approval`
    : 'Low-value PO final approval';

  return (
    <POQueuePage
      title="Approve low-value POs"
      subtitle={subtitle}
      queue="pm"
      detailPrefix="/pm"
      queryKey="po-queue-pm"
      mobileDetailPath={(id) => `/pm/mobile-po-approve/${id}`}
    />
  );
}
