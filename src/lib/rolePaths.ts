import { UserRole } from '@afios/shared';

/** Canonical home route per role (used for guards and 403 redirects). */
export function getRoleHomePath(role: UserRole | string): string {
  switch (role) {
    case UserRole.SITE_INCHARGE:
      return '/site';
    case UserRole.STORE_INCHARGE:
      return '/store';
    case UserRole.PROJECT_MANAGER:
      return '/pm';
    case UserRole.EXECUTIVE:
      return '/executive';
    case UserRole.COORDINATOR:
      return '/coordinator';
    case UserRole.CHAIRMAN:
      return '/chairman';
    default:
      return '/site';
  }
}
