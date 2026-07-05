import { cn } from '@/lib/utils';

/** Enterprise semantic chips: Pending=Orange, Approved=Green, Rejected=Red, Review=Blue */
const PENDING = 'bg-warning-light text-warning-dark border-warning/25';
const APPROVED = 'bg-success-light text-success-dark border-success/25';
const REJECTED = 'bg-danger-light text-danger-dark border-danger/25';
const REVIEW = 'bg-review-light text-review-dark border-review/25';
const NEUTRAL = 'bg-surface-muted text-ink-secondary border-surface-border';

const PENDING_DOT = 'bg-warning';
const APPROVED_DOT = 'bg-success';
const REJECTED_DOT = 'bg-danger';
const REVIEW_DOT = 'bg-review';
const NEUTRAL_DOT = 'bg-ink-muted';

const STATUS_STYLES: Record<string, string> = {
  PENDING_STORE: PENDING,
  PENDING_HO: PENDING,
  PENDING_REVIEW: REVIEW,
  PENDING_APPROVAL: PENDING,
  PENDING_ACCEPTANCE: PENDING,
  PENDING: PENDING,
  PENDING_PM: PENDING,
  PENDING_DESTINATION_PM: PENDING,
  PENDING_SOURCE_FINAL: PENDING,
  REQUESTED: PENDING,
  ON_HOLD: PENDING,
  OPEN: PENDING,
  RAISE_PO_INSTEAD: PENDING,
  COORDINATOR_PENDING: REVIEW,
  PM_PENDING: PENDING,
  CHAIRMAN_PENDING: PENDING,
  EXECUTIVE_PENDING: REVIEW,
  IN_REVIEW: REVIEW,
  ALLOCATED: REVIEW,
  FORWARDED_TO_PM: REVIEW,
  PURCHASE_REQUESTED: REVIEW,
  PO_CREATED: REVIEW,
  IN_PROGRESS: REVIEW,
  RUNNING: REVIEW,
  ISSUED: REVIEW,
  DISPATCHED: REVIEW,
  COORDINATOR_DECIDED: REVIEW,
  PM_APPROVED: APPROVED,
  CHAIRMAN_APPROVED: APPROVED,
  APPROVED: APPROVED,
  ACCEPTED: APPROVED,
  PM_VERIFIED: APPROVED,
  MATERIAL_RECEIVED: APPROVED,
  COMPLETED: APPROVED,
  CLOSED: APPROVED,
  RECEIVED: APPROVED,
  TRANSFERRED: APPROVED,
  ACTIVE: APPROVED,
  RESOLVED: APPROVED,
  REJECTED: REJECTED,
  CANCELLED: REJECTED,
};

const STATUS_DOT: Record<string, string> = {
  PENDING_STORE: PENDING_DOT,
  PENDING_HO: PENDING_DOT,
  PENDING_REVIEW: REVIEW_DOT,
  PENDING_APPROVAL: PENDING_DOT,
  PENDING_ACCEPTANCE: PENDING_DOT,
  PENDING: PENDING_DOT,
  PENDING_PM: PENDING_DOT,
  PENDING_DESTINATION_PM: PENDING_DOT,
  PENDING_SOURCE_FINAL: PENDING_DOT,
  REQUESTED: PENDING_DOT,
  ON_HOLD: PENDING_DOT,
  OPEN: PENDING_DOT,
  RAISE_PO_INSTEAD: PENDING_DOT,
  COORDINATOR_PENDING: REVIEW_DOT,
  PM_PENDING: PENDING_DOT,
  CHAIRMAN_PENDING: PENDING_DOT,
  EXECUTIVE_PENDING: REVIEW_DOT,
  IN_REVIEW: REVIEW_DOT,
  ALLOCATED: REVIEW_DOT,
  FORWARDED_TO_PM: REVIEW_DOT,
  PURCHASE_REQUESTED: REVIEW_DOT,
  PO_CREATED: REVIEW_DOT,
  IN_PROGRESS: REVIEW_DOT,
  RUNNING: REVIEW_DOT,
  ISSUED: REVIEW_DOT,
  DISPATCHED: REVIEW_DOT,
  COORDINATOR_DECIDED: REVIEW_DOT,
  PM_APPROVED: APPROVED_DOT,
  CHAIRMAN_APPROVED: APPROVED_DOT,
  APPROVED: APPROVED_DOT,
  ACCEPTED: APPROVED_DOT,
  PM_VERIFIED: APPROVED_DOT,
  MATERIAL_RECEIVED: APPROVED_DOT,
  COMPLETED: APPROVED_DOT,
  CLOSED: APPROVED_DOT,
  RECEIVED: APPROVED_DOT,
  TRANSFERRED: APPROVED_DOT,
  ACTIVE: APPROVED_DOT,
  RESOLVED: APPROVED_DOT,
  REJECTED: REJECTED_DOT,
  CANCELLED: REJECTED_DOT,
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_STORE: 'Pending',
  ALLOCATED: 'Store accepted',
  FORWARDED_TO_PM: 'With PM',
  PENDING_HO: 'Head Office',
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
  COORDINATOR_DECIDED: 'Ready to transfer',
  TRANSFERRED: 'Transferred',
  RAISE_PO_INSTEAD: 'Raise PO instead',
  EXECUTIVE_PENDING: 'Executive review',
  PM_PENDING: 'PM approval',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const dot = STATUS_DOT[status] || NEUTRAL_DOT;
  const label = STATUS_LABELS[status] || status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'enterprise-chip',
        STATUS_STYLES[status] || NEUTRAL,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} aria-hidden />
      {label}
    </span>
  );
}
