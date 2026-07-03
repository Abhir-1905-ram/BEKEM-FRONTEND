import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { disconnectSocket } from '@/lib/socket';

/** Clear session, socket, cached queries, and return to login. */
export function useSignOut() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      disconnectSocket();
      queryClient.clear();
      logout();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  }, [logout, navigate, queryClient, signingOut]);

  return { signOut, signingOut };
}
