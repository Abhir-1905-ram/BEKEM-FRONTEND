import { ChevronRight } from 'lucide-react';
import type { MaterialRequestDto } from '@afios/shared';
import { formatDate, ROLE_LABELS, UserRole } from '@afios/shared';
import { StatusBadge, getStatusLabel } from '@/components/ui/StatusBadge';

function roleLabel(role: UserRole | null | undefined) {
  if (role === UserRole.SITE_INCHARGE) return 'Indent raiser';
  return role ? ROLE_LABELS[role] : '';
}

/** Show awaiting first, then latest approver until the next approver acts. */
export function formatIndentQueueStatus(
  status: string,
  _pendingWith?: string,
  _approverNames?: MaterialRequestDto['approverNames']
): string {
  if (['REJECTED', 'CANCELLED', 'COMPLETED', 'CLOSED'].includes(status)) {
    return getStatusLabel(status);
  }

  switch (status) {
    case 'PENDING_STORE':
      return `Awaiting ${roleLabel(UserRole.STORE_INCHARGE)}`;
    case 'ALLOCATED':
    case 'FORWARDED_TO_PM':
    case 'BRANCH_TRANSFER_REQUESTED':
      return `Approved by ${roleLabel(UserRole.STORE_INCHARGE)}`;
    case 'PM_APPROVED':
    case 'PENDING_HO':
    case 'PENDING_EXECUTIVE_DECISION':
      return `Approved by ${roleLabel(UserRole.PROJECT_MANAGER)}`;
    case 'PURCHASE_REQUESTED':
    case 'RFQ_OPEN':
    case 'QUOTED':
    case 'VENDOR_SELECTED':
    case 'PO_CREATED':
    case 'EXECUTIVE_DECISION_PO':
    case 'EXECUTIVE_DECISION_BRANCH_TRANSFER':
      return `Approved by ${roleLabel(UserRole.EXECUTIVE)}`;
    case 'COORDINATOR_PENDING':
    case 'PENDING_REVIEW':
    case 'COORDINATOR_VERIFIED':
      return `Approved by ${roleLabel(UserRole.COORDINATOR)}`;
    case 'CHAIRMAN_PENDING':
      return `Approved by ${roleLabel(UserRole.COORDINATOR)}`;
    case 'CHAIRMAN_APPROVED':
      return `Approved by ${roleLabel(UserRole.CHAIRMAN)}`;
    case 'MATERIAL_RECEIVED':
      return `Approved by ${roleLabel(UserRole.STORE_INCHARGE)}`;
    case 'ISSUED':
      return `Approved by ${roleLabel(UserRole.STORE_INCHARGE)}`;
    default:
      return getStatusLabel(status);
  }
}

type IndentTableRow = {
  requestId: string;
  indentNumber: string;
  date: string;
  purpose: string;
  indentCategory: string;
  requestedByName: string;
  pendingWith?: string;
  approverNames?: MaterialRequestDto['approverNames'];
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
    approverNames: r.approverNames,
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
                  label={formatIndentQueueStatus(row.status, row.pendingWith, row.approverNames)}
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
