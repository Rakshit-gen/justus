'use client';

import { Modal } from './Modal';
import { useSettings } from '@/hooks/useSettings';
import { notificationPermission, requestNotificationPermission } from '@/lib/notify';
import { api } from '@/lib/apiClient';

export function SettingsMenu({ open, onClose, me, onMeUpdated, onOpenProfile, onLogout }) {
  const { settings, update } = useSettings();

  async function toggleNotifications(next) {
    if (!next) {
      update({ notificationsOn: false });
      return;
    }
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      update({ notificationsOn: true });
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

      <div className="my-3 h-px bg-slate-100" />
      <button
        onClick={() => { onOpenProfile?.(); onClose?.(); }}
        className="-mx-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        Edit profile
      </button>
      <button
        onClick={() => { onLogout?.(); onClose?.(); }}
        className="-mx-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
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

function SectionLabel({ children }) {
  return (
    <div className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </div>
  );
}

function Row({ label, desc, checked, onChange, disabled }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {desc && <div className="mt-0.5 text-xs text-slate-500">{desc}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-600' : 'bg-slate-300'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
