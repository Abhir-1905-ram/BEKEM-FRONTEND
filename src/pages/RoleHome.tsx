import { UserRole } from '@afios/shared';
import { useAuthStore } from '@/stores/authStore';
import { SiteHomePage } from '@/pages/site/SiteHome';
import { StoreHomePage } from '@/pages/store/StoreHome';
import { PMHomePage } from '@/pages/pm/PMHome';
import { ExecutiveHomePage } from '@/pages/executive/ExecutiveHome';
import { CoordinatorHomePage } from '@/pages/coordinator/CoordinatorHome';
import { ChairmanHomePage } from '@/pages/chairman/ChairmanHome';

export function RoleHomePage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  switch (user.role) {
    case UserRole.SITE_INCHARGE:
      return <SiteHomePage />;
    case UserRole.STORE_INCHARGE:
      return <StoreHomePage />;
    case UserRole.PROJECT_MANAGER:
      return <PMHomePage />;
    case UserRole.EXECUTIVE:
      return <ExecutiveHomePage />;
    case UserRole.COORDINATOR:
      return <CoordinatorHomePage />;
    case UserRole.CHAIRMAN:
      return <ChairmanHomePage />;
    default:
      return <SiteHomePage />;
  }
}
