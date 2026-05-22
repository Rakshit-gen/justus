'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'chatme.theme';

// 'system' follows OS preference; 'light'/'dark' are user-pinned.
function resolveEffectiveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyToDom(effective) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', effective === 'dark');
  // Update the theme-color meta so mobile status bars match.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', effective === 'dark' ? '#0f172a' : '#ffffff');
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState('system'); // 'light' | 'dark' | 'system'
  const [effective, setEffective] = useState('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let pref = 'system';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') pref = stored;
    } catch {}
    setPreference(pref);
    const next = resolveEffectiveTheme(pref);
    setEffective(next);
    applyToDom(next);
    setHydrated(true);
  }, []);

  // React to OS-level theme changes when user is on 'system'.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onChange() {
      if (preference === 'system') {
        const next = mq.matches ? 'dark' : 'light';
        setEffective(next);
        applyToDom(next);
      }
    }
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [preference]);

  const setTheme = useCallback((next) => {
    setPreference(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    const eff = resolveEffectiveTheme(next);
    setEffective(eff);
    applyToDom(eff);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, effective, hydrated, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
