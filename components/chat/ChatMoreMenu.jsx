'use client';

import { Modal } from '../Modal';

export function ChatMoreMenu({
  open,
  onClose,
  onSearch,
  onMedia,
  onWallpaper,
  onDisappearing,
  disappearingTtl = 0,
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-1">
        <MenuItem
          label="Search messages"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          }
          onClick={onSearch}
        />
        <MenuItem
          label="Photos & files"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          }
          onClick={onMedia}
        />
        <MenuItem
          label="Wallpaper"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.4 15a1.65 1.65 0 0 1-1.4-1.55v-3.9c0-.85.6-1.55 1.4-1.55h.6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h.6c.8 0 1.4.7 1.4 1.55v3.9C6 14.3 5.4 15 4.6 15H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z" />
            </svg>
          }
          onClick={onWallpaper}
        />
        <MenuItem
          label={
            disappearingTtl > 0
              ? `Disappearing messages · ${ttlLabel(disappearingTtl)}`
              : 'Disappearing messages'
          }
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          onClick={onDisappearing}
        />
      </div>
    </Modal>
  );
}

function ttlLabel(t) {
  if (t >= 2592000) return '30 days';
  if (t >= 604800) return '7 days';
  if (t >= 86400) return '24h';
  return `${Math.round(t / 60)}m`;
}

function MenuItem({ label, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink-700 transition active:scale-[0.98] hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
    >
      <span className="text-ink-500 dark:text-ink-400">{icon}</span>
      {label}
    </button>
  );
}
