import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import type { ApiErrorDto, AuthTokensDto } from '@afios/shared';
import { useAuthStore } from '@/stores/authStore';

// Dev: /api (Vite proxy → localhost:4000). Prod: set in .env.production (Railway).
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<AuthTokensDto> | null = null;

async function refreshAccessToken(): Promise<AuthTokensDto> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  const res = await axios.post<{ tokens: AuthTokensDto }>(`${API_BASE}/auth/refresh`, {
    refreshToken,
  });
  useAuthStore.getState().setTokens(res.data.tokens);
  return res.data.tokens;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorDto>) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    const text = Array.isArray(message)
      ? message.join(', ')
      : message || error.message || 'Something went wrong';
    const original = error.config as RetryConfig | undefined;
    const isAuthRoute =
      original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          original._retry = true;
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken().finally(() => {
              refreshPromise = null;
            });
          }
          const tokens = await refreshPromise;
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return api(original);
        } catch {
          useAuthStore.getState().logout();
          toast.error('Session expired. Please log in again.');
          return Promise.reject(error);
        }
      }
      useAuthStore.getState().logout();
      toast.error('Session expired. Please log in again.');
    } else if (status !== 403) {
      toast.error(text);
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return 'Something went wrong';
}
