import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@afios/shared';
import { getRoleHomePath } from '@/lib/rolePaths';
import axios from 'axios';

export function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

/** Redirect to role home when an API call returns 403 (e.g. wrong deep link). */
export function useRedirectOnForbidden(error: unknown) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined;
  const handledRef = useRef<unknown>(null);

  useEffect(() => {
    if (!isForbiddenError(error) || !role) return;
    if (handledRef.current === error) return;
    handledRef.current = error;

    const home = getRoleHomePath(role);
    const onHome = location.pathname === home || location.pathname.startsWith(`${home}/`);

    if (!onHome) {
      toast.info("That item isn't available for your role. Returned to your dashboard.", {
        duration: 4000,
      });
      navigate(home, { replace: true });
    }
  }, [error, navigate, role, location.pathname]);
}

export const forbiddenQueryOptions = {
  retry: (failureCount: number, error: unknown) => {
    if (isForbiddenError(error)) return false;
    return failureCount < 1;
  },
};
