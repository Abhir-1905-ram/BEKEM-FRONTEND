import { ChevronRight } from 'lucide-react';
import type { MaterialRequestDto } from '@afios/shared';
import { formatDate, ROLE_LABELS, UserRole } from '@afios/shared';
import { StatusBadge, getStatusLabel } from '@/components/ui/StatusBadge';

/** Fallback next approver when `pendingWith` is missing on the DTO. */
const STATUS_NEXT_ROLE: Record<string, UserRole | null> = {
  PENDING_STORE: UserRole.STORE_INCHARGE,
  ALLOCATED: UserRole.STORE_INCHARGE,
  FORWARDED_TO_PM: UserRole.PROJECT_MANAGER,
  BRANCH_TRANSFER_REQUESTED: UserRole.PROJECT_MANAGER,
  PENDING_HO: UserRole.EXECUTIVE,
  PENDING_EXECUTIVE_DECISION: UserRole.EXECUTIVE,
  EXECUTIVE_DECISION_PO: UserRole.COORDINATOR,
  EXECUTIVE_DECISION_BRANCH_TRANSFER: UserRole.COORDINATOR,
  PM_APPROVED: UserRole.STORE_INCHARGE,
  PURCHASE_REQUESTED: UserRole.EXECUTIVE,
  RFQ_OPEN: UserRole.EXECUTIVE,
  QUOTED: UserRole.EXECUTIVE,
  VENDOR_SELECTED: UserRole.EXECUTIVE,
  // Desk comes from linked PO via `pendingWith` — do not assume Coordinator.
  PO_CREATED: null,
  COORDINATOR_VERIFIED: UserRole.CHAIRMAN,
  COORDINATOR_PENDING: UserRole.COORDINATOR,
  CHAIRMAN_PENDING: UserRole.CHAIRMAN,
  CHAIRMAN_APPROVED: UserRole.STORE_INCHARGE,
  MATERIAL_RECEIVED: UserRole.STORE_INCHARGE,
  ISSUED: UserRole.SITE_INCHARGE,
  COMPLETED: null,
  CLOSED: null,
  REJECTED: null,
  CANCELLED: null,
};

/** Req 58 — status always indicates the next approver. */
export function formatIndentQueueStatus(status: string, pendingWith?: string): string {
  if (['REJECTED', 'CANCELLED', 'COMPLETED', 'CLOSED'].includes(status)) {
    return getStatusLabel(status);
  }

  // Always show next action role for post-approval handoff statuses
  // (do not treat as completed before Indent Raiser confirm-receipt).
  if (status === 'ISSUED') {
    return `Pending at ${ROLE_LABELS[UserRole.SITE_INCHARGE]}`;
  }
  if (status === 'MATERIAL_RECEIVED') {
    return `Pending at ${ROLE_LABELS[UserRole.STORE_INCHARGE]}`;
  }

  const roleKey =
    pendingWith && pendingWith in ROLE_LABELS
      ? (pendingWith as UserRole)
      : STATUS_NEXT_ROLE[status] || null;

  if (roleKey && roleKey in ROLE_LABELS) {
    return `Pending at ${ROLE_LABELS[roleKey]}`;
  }

  return getStatusLabel(status);
}

type IndentTableRow = {
  requestId: string;
  indentNumber: string;
  date: string;
  purpose: string;
  indentCategory: string;
  requestedByName: string;
  pendingWith?: string;
  status: string;
};

function toIndentRows(requests: MaterialRequestDto[]): IndentTableRow[] {
  return requests.map((r) => ({
    requestId: r.id,
    indentNumber: r.indentNumber,
    date: formatDate(r.createdAt),
    purpose: r.purpose?.trim() || '—',
    indentCategory: r.indentCategory?.name || '—',
    requestedByName: r.requestedByName || r.requester?.name || '—',
    pendingWith: r.pendingWith,
    status: r.status,
  }));
}

export function MaterialIndentsTable({
  requests,
  onRowClick,
}: {
  requests: MaterialRequestDto[];
  onRowClick: (requestId: string) => void;
}) {
  const rows = toIndentRows(requests);

  return (
    <div className="table-shell">
      <table className="data-table min-w-[48rem]">
        <thead>
          <tr>
            <th>Indent Number</th>
            <th>Indent Date</th>
            <th>Purpose</th>
            <th>Category</th>
            <th>Raised By</th>
            <th>Status</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.requestId}
              className="cursor-pointer"
              onClick={() => onRowClick(row.requestId)}
            >
              <td className="cell-code whitespace-nowrap">{row.indentNumber}</td>
              <td className="whitespace-nowrap">{row.date}</td>
              <td className="cell-text max-w-[16rem]">{row.purpose}</td>
              <td className="cell-text whitespace-nowrap">{row.indentCategory}</td>
              <td className="cell-text whitespace-nowrap">{row.requestedByName}</td>
              <td>
                <StatusBadge
                  status={row.status}
                  label={formatIndentQueueStatus(row.status, row.pendingWith)}
                />
              </td>
              <td className="text-right">
                <ChevronRight className="h-4 w-4 text-ink-muted inline-block" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
