import type { MaterialRequestDto } from '@afios/shared';
import { UserRole } from '@afios/shared';
import { formatIndentQueueStatus } from '@/components/MaterialIndentsTable';

/** Title-side quick filters for common pending queues. */
export type IndentQueueQuickFilter = 'store' | 'pm' | 'ho';

export const INDENT_QUEUE_QUICK_FILTERS: Array<{
  id: IndentQueueQuickFilter;
  label: string;
}> = [
  { id: 'store', label: 'Pending at Store Incharge' },
  { id: 'pm', label: 'Pending at Project Manager' },
  { id: 'ho', label: 'Pending at HO' },
];

const STORE_STATUSES = new Set(['PENDING_STORE', 'ALLOCATED', 'MATERIAL_RECEIVED', 'CHAIRMAN_APPROVED']);
const PM_STATUSES = new Set(['FORWARDED_TO_PM', 'BRANCH_TRANSFER_REQUESTED']);
const HO_STATUSES = new Set([
  'PENDING_HO',
  'PENDING_EXECUTIVE_DECISION',
  'EXECUTIVE_DECISION_PO',
  'EXECUTIVE_DECISION_BRANCH_TRANSFER',
  'PM_APPROVED',
  'PURCHASE_REQUESTED',
  'RFQ_OPEN',
  'QUOTED',
  'VENDOR_SELECTED',
  'PO_CREATED',
  'COORDINATOR_VERIFIED',
  'COORDINATOR_PENDING',
  'CHAIRMAN_PENDING',
]);

export function matchesIndentQueueQuickFilter(
  request: MaterialRequestDto,
  filter: IndentQueueQuickFilter | ''
): boolean {
  if (!filter) return true;
  const status = request.status;
  const pending = request.pendingWith;

  if (filter === 'store') {
    if (pending === UserRole.STORE_INCHARGE) return true;
    return STORE_STATUSES.has(status);
  }
  if (filter === 'pm') {
    if (pending === UserRole.PROJECT_MANAGER) return true;
    return PM_STATUSES.has(status);
  }
  // ho
  if (
    pending === UserRole.EXECUTIVE ||
    pending === UserRole.COORDINATOR ||
    pending === UserRole.CHAIRMAN
  ) {
    return true;
  }
  return HO_STATUSES.has(status);
}

export type IndentDaysFilter = '' | '7' | '30' | '90';

export function matchesIndentDaysFilter(request: MaterialRequestDto, days: IndentDaysFilter): boolean {
  if (!days) return true;
  const created = new Date(request.createdAt).getTime();
  if (!Number.isFinite(created)) return true;
  const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
  return created >= cutoff;
}

/** Free-text match across indent no, raised by, category, status, purpose, date. */
export function matchesIndentSearch(request: MaterialRequestDto, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const statusLabel = formatIndentQueueStatus(request.status, request.pendingWith);
  const haystack = [
    request.indentNumber,
    request.requestedByName,
    request.requester?.name,
    request.indentCategory?.name,
    request.purpose,
    request.status,
    statusLabel,
    request.createdAt,
    new Date(request.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}

export function filterMaterialIndents(
  requests: MaterialRequestDto[],
  opts: {
    search?: string;
    queue?: IndentQueueQuickFilter | '';
    category?: string;
    days?: IndentDaysFilter;
  }
): MaterialRequestDto[] {
  const search = opts.search ?? '';
  const queue = opts.queue ?? '';
  const category = (opts.category ?? '').trim().toLowerCase();
  const days = opts.days ?? '';

  return requests.filter((r) => {
    if (!matchesIndentSearch(r, search)) return false;
    if (!matchesIndentQueueQuickFilter(r, queue)) return false;
    if (!matchesIndentDaysFilter(r, days)) return false;
    if (category) {
      const cat = (r.indentCategory?.name || '').toLowerCase();
      if (cat !== category) return false;
    }
    return true;
  });
}

export function uniqueIndentCategories(requests: MaterialRequestDto[]): string[] {
  const set = new Set<string>();
  for (const r of requests) {
    const name = r.indentCategory?.name?.trim();
    if (name) set.add(name);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
