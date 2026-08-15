import { INDENT_VALUE_CAP_INR, type IndentRequestType } from '@afios/shared';

type CapIndent = {
  indentRequestType?: IndentRequestType | null;
  estimatedValue?: number | null;
};

/** Petty indent: tagged Below ₹5,000, or estimated value is under the cap. */
export function isBelowCapIndent(indent?: CapIndent | null): boolean {
  if (!indent) return false;
  if (indent.indentRequestType === 'BELOW_5000') return true;
  const value = Number(indent.estimatedValue);
  return Number.isFinite(value) && value > 0 && value < INDENT_VALUE_CAP_INR;
}

/** ₹5,000 or more — Head Office, not the PM daily bar. */
export function isOverCapIndent(indent?: CapIndent | null): boolean {
  if (!indent || indent.indentRequestType === 'BELOW_5000') return false;
  const value = Number(indent.estimatedValue);
  return Number.isFinite(value) && value >= INDENT_VALUE_CAP_INR;
}

/** Executive Review & decide only when stock is short. */
export function needsExecutiveDecision(request?: {
  status?: string | null;
  canFullyIssue?: boolean | null;
  storeStockVerified?: boolean | null;
} | null): boolean {
  if (!request) return false;
  if (!['PENDING_HO', 'PENDING_EXECUTIVE_DECISION'].includes(request.status || '')) return false;
  if (request.canFullyIssue || request.storeStockVerified) return false;
  return true;
}
