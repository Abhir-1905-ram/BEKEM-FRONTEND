import { POQueuePage } from '@/pages/shared/POQueuePage';

export function CoordinatorVerifyPOsPage() {
  return (
    <POQueuePage
      title="Verify purchase orders"
      subtitle="Up to coordinator limit: you approve. Above that: send to Chairman, or approve if Chairman is not on premises."
      queue="coordinator"
      detailPrefix="/coordinator"
      queryKey="po-queue-coordinator"
    />
  );
}
