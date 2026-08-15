import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDto, AuthTokensDto } from '@afios/shared';
import { UserRole } from '@afios/shared';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: UserDto, tokens: AuthTokensDto) => void;
  setTokens: (tokens: AuthTokensDto) => void;
  updateUser: (user: UserDto) => void;
  logout: () => void;
  roleColor: () => string;
}

const ROLE_COLOR_MAP: Record<string, string> = {
  [UserRole.SITE_INCHARGE]: 'site',
  [UserRole.STORE_INCHARGE]: 'store',
  [UserRole.PROJECT_MANAGER]: 'pm',
  [UserRole.EXECUTIVE]: 'executive',
  [UserRole.COORDINATOR]: 'coordinator',
  [UserRole.CHAIRMAN]: 'chairman',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, tokens) =>
        set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      updateUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      roleColor: () => {
        const role = get().user?.role || '';
        return ROLE_COLOR_MAP[role] || 'store';
      },
    }),
    { name: 'afios-auth' }
  )
);
