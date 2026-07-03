import { POQueuePage } from '@/pages/shared/POQueuePage';

export function PMPOApprovalsPage() {
  return (
    <POQueuePage
      title="Approve low-value POs"
      subtitle="POs under ₹5,000 — Project Manager final approval"
      queue="pm"
      detailPrefix="/pm"
      queryKey="po-queue-pm"
    />
  );
}
