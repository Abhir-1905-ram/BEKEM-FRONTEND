import { cn } from '@/lib/utils';

const STATUS_DOT: Record<string, string> = {
  PENDING_STORE: 'bg-warning',
  ALLOCATED: 'bg-bekem-accent',
  FORWARDED_TO_PM: 'bg-bekem-accent',
  PM_APPROVED: 'bg-success',
  PURCHASE_REQUESTED: 'bg-bekem-accent',
  PO_CREATED: 'bg-bekem-accent',
  CHAIRMAN_APPROVED: 'bg-success',
  APPROVED: 'bg-success',
  REJECTED: 'bg-danger',
  CANCELLED: 'bg-ink-muted',
  PENDING_REVIEW: 'bg-warning',
  PENDING_APPROVAL: 'bg-warning',
  COORDINATOR_PENDING: 'bg-warning',
  PM_PENDING: 'bg-warning',
  CHAIRMAN_PENDING: 'bg-warning',
  PENDING_ACCEPTANCE: 'bg-warning',
  ACCEPTED: 'bg-success',
  IN_PROGRESS: 'bg-bekem-accent',
  MATERIAL_RECEIVED: 'bg-success',
  ISSUED: 'bg-bekem-accent',
  COMPLETED: 'bg-success',
  CLOSED: 'bg-success',
  RUNNING: 'bg-bekem-accent',
  COMPLETED_MILESTONE: 'bg-success',
  PENDING: 'bg-warning',
  PENDING_PM: 'bg-warning',
  PM_VERIFIED: 'bg-success',
  OPEN: 'bg-danger',
  IN_REVIEW: 'bg-warning',
  RESOLVED: 'bg-success',
  ACTIVE: 'bg-success',
  ON_HOLD: 'bg-warning',
  PENDING_DESTINATION_PM: 'bg-warning',
  PENDING_SOURCE_FINAL: 'bg-warning',
  DISPATCHED: 'bg-bekem-accent',
  RECEIVED: 'bg-success',
  REQUESTED: 'bg-warning',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING_STORE: 'bg-warning-light text-warning-dark border-warning/20',
  ALLOCATED: 'bg-bekem-accent-soft text-bekem-accent border-bekem-accent/15',
  FORWARDED_TO_PM: 'bg-bekem-accent-soft text-bekem-accent border-bekem-accent/15',
  PM_APPROVED: 'bg-success-light text-success-dark border-success/20',
  PURCHASE_REQUESTED: 'bg-bekem-accent-soft text-bekem-accent border-bekem-accent/15',
  PO_CREATED: 'bg-bekem-accent-soft text-bekem-accent border-bekem-accent/15',
  CHAIRMAN_APPROVED: 'bg-success-light text-success-dark border-success/20',
  COORDINATOR_PENDING: 'bg-warning-light text-warning-dark border-warning/20',
  PM_PENDING: 'bg-warning-light text-warning-dark border-warning/20',
  CHAIRMAN_PENDING: 'bg-warning-light text-warning-dark border-warning/20',
  PENDING_REVIEW: 'bg-warning-light text-warning-dark border-warning/20',
  PENDING_APPROVAL: 'bg-warning-light text-warning-dark border-warning/20',
  APPROVED: 'bg-success-light text-success-dark border-success/20',
  REJECTED: 'bg-danger-light text-danger-dark border-danger/20',
  CANCELLED: 'bg-slate-50 text-slate-500 border-slate-200',
  PENDING_ACCEPTANCE: 'bg-warning-light text-warning-dark border-warning/20',
  ACCEPTED: 'bg-success-light text-success-dark border-success/20',
  IN_PROGRESS: 'bg-bekem-accent-soft text-bekem-accent border-bekem-accent/15',
  CLOSED: 'bg-success-light text-success-dark border-success/20',
  RUNNING: 'bg-bekem-accent-soft text-bekem-accent border-bekem-accent/15',
  COMPLETED: 'bg-success-light text-success-dark border-success/20',
  PENDING: 'bg-warning-light text-warning-dark border-warning/20',
  PENDING_PM: 'bg-warning-light text-warning-dark border-warning/20',
  PM_VERIFIED: 'bg-success-light text-success-dark border-success/20',
  MATERIAL_RECEIVED: 'bg-success-light text-success-dark border-success/20',
  ISSUED: 'bg-bekem-accent-soft text-bekem-accent border-bekem-accent/15',
  ACTIVE: 'bg-success-light text-success-dark border-success/20',
  ON_HOLD: 'bg-warning-light text-warning-dark border-warning/20',
  OPEN: 'bg-danger-light text-danger-dark border-danger/20',
  IN_REVIEW: 'bg-warning-light text-warning-dark border-warning/20',
  RESOLVED: 'bg-success-light text-success-dark border-success/20',
  PENDING_DESTINATION_PM: 'bg-warning-light text-warning-dark border-warning/20',
  PENDING_SOURCE_FINAL: 'bg-amber-50 text-amber-800 border-amber-200',
  DISPATCHED: 'bg-bekem-accent-soft text-bekem-accent border-bekem-accent/15',
  RECEIVED: 'bg-success-light text-success-dark border-success/20',
  REQUESTED: 'bg-warning-light text-warning-dark border-warning/20',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_STORE: 'Pending',
  ALLOCATED: 'Store accepted',
  FORWARDED_TO_PM: 'With PM',
  PM_APPROVED: 'Approved',
  PURCHASE_REQUESTED: 'Purchase request created',
  CHAIRMAN_APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  PO_CREATED: 'Processing',
  CHAIRMAN_PENDING: 'Pending approval',
  COORDINATOR_PENDING: 'Pending review',
  PENDING_REVIEW: 'Pending review',
  PENDING_APPROVAL: 'Pending approval',
  PENDING_ACCEPTANCE: 'Awaiting contractor',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In progress',
  CLOSED: 'Closed',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  PENDING_PM: 'Pending PM',
  PM_VERIFIED: 'Verified',
  MATERIAL_RECEIVED: 'Received',
  ISSUED: 'Issued',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  PENDING_DESTINATION_PM: 'Awaiting destination PM',
  PENDING_SOURCE_FINAL: 'Awaiting your final approval',
  DISPATCHED: 'Dispatched',
  RECEIVED: 'Received',
  REQUESTED: 'Requested',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const dot = STATUS_DOT[status] || 'bg-ink-muted';
  const label = STATUS_LABELS[status] || status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border',
        STATUS_STYLES[status] || 'bg-slate-50 text-slate-700 border-slate-200',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} aria-hidden />
      {label}
    </span>
  );
}
