import { WOQueuePage } from '@/pages/shared/WOQueuePage';

export function ChairmanApproveWOsPage() {
  return (
    <WOQueuePage
      title="Approve work orders"
      subtitle="Final sign-off on verified work orders"
      queue="chairman"
      detailPrefix="/chairman"
      queryKey="wo-queue-chairman"
    />
  );
}
