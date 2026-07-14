import { useEffect, useCallback, useState } from 'react';
import { connectRealtime, disconnectRealtime, subscribeToEvent, getSocket } from './realtime';

export interface RealtimeEvent {
  id: string;
  type: string;
  source?: string;
  entityType?: string;
  entityId?: string;
  leadId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export function useRealtime(token: string | null) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    const socket = connectRealtime(token);
    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      disconnectRealtime();
    };
  }, [token]);

  const onEvent = useCallback((event: string, handler: (data: RealtimeEvent) => void) => {
    return subscribeToEvent(event, handler);
  }, []);

  const onAnyEvent = useCallback((handler: (event: string, data: RealtimeEvent) => void) => {
    const socket = getSocket();
    if (!socket) return () => {};
    socket.onAny((event: string, data: RealtimeEvent) => handler(event, data));
    return () => { socket?.offAny(handler as any); };
  }, []);

  return { connected, onEvent, onAnyEvent };
}
