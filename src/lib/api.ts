import axios, { type AxiosError } from 'axios';
import { toast } from 'sonner';
import type { ApiErrorDto } from '@afios/shared';
import { useAuthStore } from '@/stores/authStore';

const API_BASE =
  import.meta.env.VITE_API_URL || 'https://bekem-backend-production.up.railway.app/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

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

    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
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
