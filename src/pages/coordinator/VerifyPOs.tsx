import { POQueuePage } from '@/pages/shared/POQueuePage';

export function CoordinatorVerifyPOsPage() {
  return (
    <POQueuePage
      title="Verify purchase orders"
      subtitle="₹5k–₹10k: you approve. Above ₹10k: send to Chairman, or approve if Chairman is not on premises."
      queue="coordinator"
      detailPrefix="/coordinator"
      queryKey="po-queue-coordinator"
    />
  );
}
