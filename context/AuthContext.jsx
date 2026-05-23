'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import { clearMessageCache } from '@/lib/messageCache';

const AuthContext = createContext(null);
const STORAGE_KEY = 'chatme.auth';

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    let initial = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.token && parsed?.user) {
          initial = parsed;
          setAuth(parsed);
        }
      } catch {}
    }
    setLoading(false);

    // Refetch the current user in the background — catches profile changes
    // made on another device while this one was closed.
    if (initial?.token) {
      api('/api/auth/me')
        .then((data) => {
          if (!data?.user) return;
          setAuth((prev) => {
            if (!prev) return prev;
            const next = { ...prev, user: { ...prev.user, ...data.user } };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
            return next;
          });
        })
        .catch(() => { /* ignore — stale state is acceptable */ });
    }
  }, []);

  const persist = useCallback((next) => {
    setAuth(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(async (name, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: { name, password } });
    persist({ token: data.token, user: data.user });
    return data.user;
  }, [persist]);

  const signup = useCallback(async (name, password) => {
    const data = await api('/api/auth/signup', { method: 'POST', body: { name, password } });
    persist({ token: data.token, user: data.user });
    return data.user;
  }, [persist]);

  const logout = useCallback(() => {
    clearMessageCache();
    persist(null);
    router.push('/login');
  }, [persist, router]);

  const updateUser = useCallback((patch) => {
    setAuth((prev) => {
      if (!prev) return prev;
      const nextUser = typeof patch === 'function' ? patch(prev.user) : { ...prev.user, ...patch };
      const next = { ...prev, user: nextUser };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ auth, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
