'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'chatme.settings.v1';
const DEFAULTS = { soundOn: true, notificationsOn: false };

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { settings, update, hydrated };
}
