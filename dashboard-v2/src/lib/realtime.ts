import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectRealtime(token: string): Socket {
  if (socket?.connected) return socket;

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  socket = io(`${apiUrl}/realtime`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Realtime] connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Realtime] disconnected:', reason);
  });

  socket.on('error', (err) => {
    console.warn('[Realtime] error:', err);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Realtime] connect error:', err.message);
  });

  return socket;
}

export function disconnectRealtime(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToEvent(event: string, handler: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on(event, handler);
  return () => {
    socket?.off(event, handler);
  };
}
