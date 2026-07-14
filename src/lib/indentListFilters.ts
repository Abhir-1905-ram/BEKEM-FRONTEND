import type { MaterialRequestDto } from '@afios/shared';
import { UserRole } from '@afios/shared';
import { formatIndentQueueStatus } from '@/components/MaterialIndentsTable';

/** Title-side / dropdown queue filters. Labels vary by role. */
export type IndentQueueQuickFilter =
  | 'pm'
  | 'ho'
  | 'store'
  | 'coordinator'
  | 'chairman'
  | 'executive';

export type IndentQueueFilterOption = {
  id: IndentQueueQuickFilter;
  label: string;
};

const STORE_STATUSES = new Set([
  'PENDING_STORE',
  'ALLOCATED',
  'MATERIAL_RECEIVED',
  'CHAIRMAN_APPROVED',
  'PM_APPROVED',
]);
const PM_STATUSES = new Set(['FORWARDED_TO_PM', 'BRANCH_TRANSFER_REQUESTED']);
const COORDINATOR_STATUSES = new Set([
  'EXECUTIVE_DECISION_PO',
  'EXECUTIVE_DECISION_BRANCH_TRANSFER',
  'COORDINATOR_PENDING',
  'COORDINATOR_VERIFIED',
  'PO_CREATED',
]);
const CHAIRMAN_STATUSES = new Set(['CHAIRMAN_PENDING']);
/** Executive desk only — not Coordinator / Chairman. */
const EXECUTIVE_STATUSES = new Set([
  'PENDING_HO',
  'PENDING_EXECUTIVE_DECISION',
  'PURCHASE_REQUESTED',
  'RFQ_OPEN',
  'QUOTED',
  'VENDOR_SELECTED',
]);
/** Broad HO bucket for Store / PM role chips (Exec + Coord + Chairman). */
const HO_STATUSES = new Set([
  ...EXECUTIVE_STATUSES,
  ...COORDINATOR_STATUSES,
  ...CHAIRMAN_STATUSES,
]);

/** Role-specific quick tabs next to the Material Indents / Pending Indents title. */
export function getIndentQueueFiltersForRole(role: UserRole): IndentQueueFilterOption[] {
  switch (role) {
    case UserRole.SITE_INCHARGE:
      // One chip per distinct pending color Site tracks on their indents
      return [
        { id: 'store', label: 'Pending at Store Incharge' },
        { id: 'pm', label: 'Pending at PM' },
        { id: 'executive', label: 'Pending at Executive' },
        { id: 'coordinator', label: 'Pending at Coordinator' },
        { id: 'chairman', label: 'Pending at MD/Chairman' },
      ];
    case UserRole.STORE_INCHARGE:
      return [
        { id: 'pm', label: 'Pending at Project Manager' },
        { id: 'ho', label: 'Pending at HO' },
      ];
    case UserRole.PROJECT_MANAGER:
      return [
        { id: 'ho', label: 'Pending at HO' },
        { id: 'store', label: 'Stock Allocation Pending at Store Incharge' },
      ];
    case UserRole.EXECUTIVE:
      return [
        { id: 'coordinator', label: 'Pending at Coordinator' },
        { id: 'chairman', label: 'Pending at MD/Chairman' },
        { id: 'store', label: 'Stock Allocation Pending at Store Incharge' },
      ];
    case UserRole.COORDINATOR:
      return [
        { id: 'chairman', label: 'Pending at MD/Chairman' },
        { id: 'store', label: 'Stock Allocation Pending at Store Incharge' },
      ];
    default:
      return [
        { id: 'pm', label: 'Pending at Project Manager' },
        { id: 'ho', label: 'Pending at HO' },
        { id: 'store', label: 'Stock Allocation Pending at Store Incharge' },
      ];
  }
}

export function matchesIndentQueueQuickFilter(
  request: MaterialRequestDto,
  filter: IndentQueueQuickFilter | ''
): boolean {
  if (!filter) return true;
  const status = request.status;
  const pending = request.pendingWith;

  if (filter === 'store') {
    if (pending === UserRole.STORE_INCHARGE) return true;
    // Don't treat HO roles as store even if status is in STORE_STATUSES
    if (
      pending === UserRole.PROJECT_MANAGER ||
      pending === UserRole.EXECUTIVE ||
      pending === UserRole.COORDINATOR ||
      pending === UserRole.CHAIRMAN
    ) {
      return false;
    }
    return STORE_STATUSES.has(status);
  }
  if (filter === 'pm') {
    if (pending === UserRole.PROJECT_MANAGER) return true;
    return PM_STATUSES.has(status);
  }
  if (filter === 'coordinator') {
    if (pending === UserRole.COORDINATOR) return true;
    return COORDINATOR_STATUSES.has(status);
  }
  if (filter === 'chairman') {
    if (pending === UserRole.CHAIRMAN) return true;
    return CHAIRMAN_STATUSES.has(status);
  }
  if (filter === 'executive') {
    if (pending === UserRole.EXECUTIVE) return true;
    if (
      pending === UserRole.COORDINATOR ||
      pending === UserRole.CHAIRMAN ||
      pending === UserRole.STORE_INCHARGE ||
      pending === UserRole.PROJECT_MANAGER
    ) {
      return false;
    }
    return EXECUTIVE_STATUSES.has(status);
  }
  // Broad Head Office bucket (Executive + Coordinator + Chairman workflows)
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

export function isIndentQueueFilterId(value: string): value is IndentQueueQuickFilter {
  return ['pm', 'ho', 'store', 'coordinator', 'chairman', 'executive'].includes(value);
}

/** Count indents matching each quick-queue chip (for badges). */
export function countIndentQueueFilters(
  requests: MaterialRequestDto[],
  options: IndentQueueFilterOption[]
): Partial<Record<IndentQueueQuickFilter, number>> {
  const counts: Partial<Record<IndentQueueQuickFilter, number>> = {};
  for (const opt of options) {
    counts[opt.id] = requests.reduce(
      (n, r) => n + (matchesIndentQueueQuickFilter(r, opt.id) ? 1 : 0),
      0
    );
  }
  return counts;
}
