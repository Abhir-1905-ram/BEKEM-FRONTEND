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
  PENDING_EXECUTIVE_DECISION: PENDING,
  EXECUTIVE_DECISION_PO: REVIEW,
  EXECUTIVE_DECISION_BRANCH_TRANSFER: REVIEW,
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
  PO_CREATED: REVIEW,
  RAISE_PO_INSTEAD: PENDING,
  COORDINATOR_PENDING: REVIEW,
  PM_PENDING: PENDING,
  CHAIRMAN_PENDING: PENDING,
  EXECUTIVE_PENDING: REVIEW,
  IN_REVIEW: REVIEW,
  ALLOCATED: REVIEW,
  FORWARDED_TO_PM: REVIEW,
  BRANCH_TRANSFER_REQUESTED: REVIEW,
  PURCHASE_REQUESTED: REVIEW,
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
  MATERIAL_RECEIVED: REVIEW,
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
  PENDING_EXECUTIVE_DECISION: PENDING_DOT,
  EXECUTIVE_DECISION_PO: REVIEW_DOT,
  EXECUTIVE_DECISION_BRANCH_TRANSFER: REVIEW_DOT,
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
  BRANCH_TRANSFER_REQUESTED: REVIEW_DOT,
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
  MATERIAL_RECEIVED: REVIEW_DOT,
  COMPLETED: APPROVED_DOT,
  CLOSED: APPROVED_DOT,
  RECEIVED: APPROVED_DOT,
  TRANSFERRED: APPROVED_DOT,
  ACTIVE: APPROVED_DOT,
  RESOLVED: APPROVED_DOT,
  REJECTED: REJECTED_DOT,
  CANCELLED: REJECTED_DOT,
};

/** Req 58 — prefer next-approver phrasing over "Accepted at Store" style labels. */
const STATUS_LABELS: Record<string, string> = {
  PENDING_STORE: 'Pending at Store',
  ALLOCATED: 'Pending at Store',
  FORWARDED_TO_PM: 'Pending at PM',
  BRANCH_TRANSFER_REQUESTED: 'Pending at PM',
  PENDING_HO: 'Pending at Executive',
  PENDING_EXECUTIVE_DECISION: 'Pending at Executive',
  EXECUTIVE_DECISION_PO: 'Pending at Coordinator',
  EXECUTIVE_DECISION_BRANCH_TRANSFER: 'Pending at Coordinator',
  PM_APPROVED: 'Pending at Store Incharge',
  PURCHASE_REQUESTED: 'Pending at Executive',
  RFQ_OPEN: 'Pending at Executive',
  QUOTED: 'Pending at Executive',
  VENDOR_SELECTED: 'Pending at Executive',
  PO_CREATED: 'PO created',
  COORDINATOR_VERIFIED: 'Pending at Chairman',
  CHAIRMAN_APPROVED: 'Pending at Store',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CHAIRMAN_PENDING: 'Pending at Chairman',
  COORDINATOR_PENDING: 'Pending at Coordinator',
  PENDING_REVIEW: 'Pending at Coordinator',
  PENDING_APPROVAL: 'Pending at Chairman',
  PENDING_ACCEPTANCE: 'Awaiting contractor',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In progress',
  CLOSED: 'Closed',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  PENDING_PM: 'Pending at PM',
  PM_VERIFIED: 'Verified',
  MATERIAL_RECEIVED: 'Material received',
  ISSUED: 'Issued',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  PENDING_DESTINATION_PM: 'Pending at PM',
  PENDING_SOURCE_FINAL: 'Pending at PM',
  DISPATCHED: 'Dispatched',
  RECEIVED: 'Received',
  REQUESTED: 'Requested',
  COORDINATOR_DECIDED: 'Ready to transfer',
  TRANSFERRED: 'Transferred',
  RAISE_PO_INSTEAD: 'Raise PO instead',
  EXECUTIVE_PENDING: 'Pending at Executive',
  PM_PENDING: 'Pending at PM',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const dot = STATUS_DOT[status] || NEUTRAL_DOT;
  const displayLabel = label ?? STATUS_LABELS[status] ?? status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'enterprise-chip',
        STATUS_STYLES[status] || NEUTRAL,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} aria-hidden />
      {displayLabel}
    </span>
  );
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
}
