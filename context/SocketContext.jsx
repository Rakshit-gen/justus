'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { auth } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!auth?.token) {
      setSocket(null);
      setConnected(false);
      return;
    }

    const s = io({
      path: '/socket.io',
      auth: { token: auth.token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (err) => {
      console.warn('[socket] connect_error', err.message);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [auth?.token]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}
