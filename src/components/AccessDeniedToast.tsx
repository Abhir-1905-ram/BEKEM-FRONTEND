import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { consumeAccessDenied } from '@/lib/accessDenied';

/** Shows a toast after RoleGuard redirects an unauthorised deep link. */
export function AccessDeniedToast() {
  const location = useLocation();

  useEffect(() => {
    if (consumeAccessDenied()) {
      toast.info("That page isn't available for your role. Redirected to your dashboard.", {
        duration: 5000,
      });
    }
  }, [location.pathname]);

  return null;
}
