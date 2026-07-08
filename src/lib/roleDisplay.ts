import { ROLE_LABELS, UserRole } from '@afios/shared';

/** Site incharge is shown as "Indent raiser" in product UI (not "Site Manager"). */
export function roleDisplayLabel(role: UserRole): string {
  if (role === UserRole.SITE_INCHARGE) return 'Indent raiser';
  return ROLE_LABELS[role];
}
