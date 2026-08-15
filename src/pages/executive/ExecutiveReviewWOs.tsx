import { WOQueuePage } from '@/pages/shared/WOQueuePage';

export function ExecutiveReviewWOsPage() {
  return (
    <WOQueuePage
      title="Review work orders"
      subtitle="Process PM-approved work orders before coordinator verification"
      queue="executive"
      detailPrefix="/work-orders"
      queryKey="wo-queue-executive"
    />
  );
}
