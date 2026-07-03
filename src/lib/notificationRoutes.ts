import { UserRole } from '@afios/shared';
import type { NotificationDto } from '@afios/shared';

/** Role-safe destination when tapping a notification. Returns null if no in-app view exists. */
export function getNotificationPath(
  n: NotificationDto,
  role: UserRole
): string | null {
  if (n.relatedEntityType === 'MaterialRequest') {
    if (
      [
        UserRole.SITE_INCHARGE,
        UserRole.STORE_INCHARGE,
        UserRole.PROJECT_MANAGER,
      ].includes(role)
    ) {
      return `/requests/${n.relatedEntityId}`;
    }
    return null;
  }

  if (n.relatedEntityType === 'PurchaseOrder') {
    if (role === UserRole.EXECUTIVE) return `/purchase-orders/${n.relatedEntityId}`;
    if (role === UserRole.COORDINATOR) return `/coordinator/po/${n.relatedEntityId}`;
    if (role === UserRole.CHAIRMAN) return `/chairman/po/${n.relatedEntityId}`;
    return null;
  }

  if (n.relatedEntityType === 'WorkOrder') {
    if (role === UserRole.EXECUTIVE) return `/work-orders/${n.relatedEntityId}`;
    if (role === UserRole.COORDINATOR) return `/coordinator/wo/${n.relatedEntityId}`;
    if (role === UserRole.CHAIRMAN) return `/chairman/wo/${n.relatedEntityId}`;
    if (role === UserRole.PROJECT_MANAGER) return `/work-orders/${n.relatedEntityId}`;
    return null;
  }

  return null;
}
