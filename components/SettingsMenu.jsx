'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/context/ThemeContext';
import { notificationPermission, requestNotificationPermission } from '@/lib/notify';
import { enablePush, disablePush } from '@/lib/pushClient';
import { api } from '@/lib/apiClient';
import clsx from 'clsx';

export function SettingsMenu({ open, onClose, me, onMeUpdated, onOpenProfile, onLogout }) {
  const { settings, update } = useSettings();
  const { preference, setTheme } = useTheme();
  // Tracks the theme that was JUST clicked, used to play a one-shot spin.
  const [recentSpin, setRecentSpin] = useState(null);
  function pickTheme(next) {
    setTheme(next);
    setRecentSpin(next);
  }
  useEffect(() => {
    if (recentSpin === null) return;
    const t = setTimeout(() => setRecentSpin(null), 700);
    return () => clearTimeout(t);
  }, [recentSpin]);

  async function toggleNotifications(next) {
    if (!next) {
      update({ notificationsOn: false });
      // Best-effort: also unsubscribe from web push.
      disablePush().catch(() => {});
      return;
    }
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      update({ notificationsOn: true });
      // Subscribe this browser to web push so notifications work even
      // when the tab/browser is closed (requires VAPID keys on server).
      enablePush().catch(() => {});
    } else {
      update({ notificationsOn: false });
      if (result === 'denied') {
        alert('Notifications are blocked in your browser. Re-enable them in site settings to receive alerts.');
      }
    }
  }

  async function patchPrivacy(patch) {
    try {
      const merged = { ...(me?.privacy || {}), ...patch };
      const data = await api('/api/auth/me', { method: 'PATCH', body: { privacy: merged } });
      onMeUpdated?.(data.user);
    } catch (e) {
      alert(e.message);
    }
  }

  const permission = typeof window !== 'undefined' ? notificationPermission() : 'default';
  const privacy = me?.privacy || { showOnline: true, showLastSeen: true };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <SectionLabel>Appearance</SectionLabel>
      <div className="mb-2 grid grid-cols-3 gap-1.5 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
        <ThemeChoice
          active={preference === 'light'}
          spinning={recentSpin === 'light'}
          onClick={() => pickTheme('light')}
          label="Light"
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          }
        />
        <ThemeChoice
          active={preference === 'dark'}
          spinning={recentSpin === 'dark'}
          onClick={() => pickTheme('dark')}
          label="Dark"
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          }
        />
        <ThemeChoice
          active={preference === 'system'}
          spinning={recentSpin === 'system'}
          onClick={() => pickTheme('system')}
          label="System"
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          }
        />
      </div>

      <SectionLabel>Notifications</SectionLabel>
      <Row
        label="Sound on new message"
        desc="Play a soft ding when a message arrives"
        checked={settings.soundOn}
        onChange={(v) => update({ soundOn: v })}
      />
      <Row
        label="Browser notifications"
        desc={
          permission === 'denied'
            ? 'Blocked by your browser — change in site settings'
            : 'Show alerts when this tab is in the background'
        }
        checked={settings.notificationsOn && permission === 'granted'}
        onChange={toggleNotifications}
        disabled={permission === 'denied' || permission === 'unsupported'}
      />

      <SectionLabel>Privacy</SectionLabel>
      <Row
        label="Show me as online"
        desc="When off, friends see you as offline even when you're here."
        checked={privacy.showOnline !== false}
        onChange={(v) => patchPrivacy({ showOnline: v })}
      />
      <Row
        label="Show last seen"
        desc="Friends see when you were last active."
        checked={privacy.showLastSeen !== false}
        onChange={(v) => patchPrivacy({ showLastSeen: v })}
      />

      <div className="my-3 h-px bg-ink-100 dark:bg-ink-800" />
      <button
        onClick={() => { onOpenProfile?.(); onClose?.(); }}
        className="-mx-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink-800 transition active:scale-[0.98] hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-500 dark:text-ink-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        Edit profile
      </button>
      <button
        onClick={() => { onLogout?.(); onClose?.(); }}
        className="-mx-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 transition active:scale-[0.98] hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        Sign out
      </button>
    </Modal>
  );
}

function ThemeChoice({ active, spinning, onClick, label, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition active:scale-95',
        active
          ? 'bg-white text-ink-900 shadow-soft dark:bg-ink-950 dark:text-ink-50'
          : 'text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200'
      )}
    >
      <span className={`inline-block ${spinning ? 'animate-spin-soft' : ''}`}>{icon}</span>
      {label}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500">
      {children}
    </div>
  );
}

function Row({ label, desc, checked, onChange, disabled }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink-800 dark:text-ink-100">{label}</div>
        {desc && <div className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{desc}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-600 dark:bg-brand-500' : 'bg-ink-300 dark:bg-ink-700'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
