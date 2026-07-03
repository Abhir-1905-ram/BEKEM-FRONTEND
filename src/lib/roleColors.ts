import { UserRole } from '@afios/shared';

export type RoleTone =
  | 'site'
  | 'store'
  | 'pm'
  | 'executive'
  | 'coordinator'
  | 'chairman';

export const ROLE_TONE: Record<UserRole, RoleTone> = {
  [UserRole.SITE_INCHARGE]: 'site',
  [UserRole.STORE_INCHARGE]: 'store',
  [UserRole.PROJECT_MANAGER]: 'pm',
  [UserRole.EXECUTIVE]: 'executive',
  [UserRole.COORDINATOR]: 'coordinator',
  [UserRole.CHAIRMAN]: 'chairman',
};

export const STAT_TONES = ['amber', 'blue', 'violet', 'teal', 'rose', 'emerald'] as const;
export type StatTone = (typeof STAT_TONES)[number] | RoleTone;

export function getRoleTone(role?: UserRole | string): RoleTone {
  if (role && role in ROLE_TONE) return ROLE_TONE[role as UserRole];
  return 'site';
}

/** Solid icon badge colors for stat widgets */
export const STAT_ICON_BG: Record<string, string> = {
  amber: 'bg-warning',
  blue: 'bg-bekem-accent',
  violet: 'bg-violet-600',
  teal: 'bg-coordinator',
  rose: 'bg-danger',
  emerald: 'bg-success',
  site: 'bg-site',
  store: 'bg-store',
  pm: 'bg-pm',
  executive: 'bg-executive',
  coordinator: 'bg-coordinator',
  chairman: 'bg-chairman',
};
