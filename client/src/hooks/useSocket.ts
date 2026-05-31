import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { LiveAlert } from '../types';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('new-alert', (alert: LiveAlert) => {
      setLiveAlerts(prev => [alert, ...prev].slice(0, 50));
    });

    return () => { socket.disconnect(); };
  }, []);

  return { liveAlerts, connected };
}
