import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';

let socket: Socket | null = null;

export function connectSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token || socket?.connected) return socket;

  const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function useSocketNotifications() {
  const queryClient = useQueryClient();

  const setup = () => {
    const s = connectSocket();
    if (!s) return;

    s.off('notification');
    s.on('notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
  };

  return { setup, disconnect: disconnectSocket };
}
