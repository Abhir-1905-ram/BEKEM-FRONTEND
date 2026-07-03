import { POQueuePage } from '@/pages/shared/POQueuePage';

export function ChairmanApprovePOsPage() {
  return (
    <POQueuePage
      title="Approve purchase orders"
      subtitle="Final sign-off on verified purchase orders"
      queue="chairman"
      detailPrefix="/chairman"
      queryKey="po-queue-chairman"
    />
  );
}
