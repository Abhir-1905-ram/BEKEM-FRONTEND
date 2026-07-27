import { ROLE_LABELS, UserRole } from '@afios/shared';

/** Site incharge nav/home label is "New indent". */
export function roleDisplayLabel(role: UserRole): string {
  if (role === UserRole.SITE_INCHARGE) return 'New indent';
  return ROLE_LABELS[role];
}
