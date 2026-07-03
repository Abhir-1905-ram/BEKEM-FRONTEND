import { WOQueuePage } from '@/pages/shared/WOQueuePage';

export function CoordinatorVerifyWOsPage() {
  return (
    <WOQueuePage
      title="Approve work orders"
      subtitle="Final approval for work orders"
      queue="coordinator"
      detailPrefix="/coordinator"
      queryKey="wo-queue-coordinator"
    />
  );
}
