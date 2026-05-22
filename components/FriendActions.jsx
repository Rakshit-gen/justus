'use client';

import { Modal } from './Modal';

export function FriendActions({ open, onClose, friend, isPinned, onTogglePin }) {
  if (!friend) return null;
  return (
    <Modal open={open} onClose={onClose} title={friend.name}>
      <div className="space-y-1">
        <ActionButton
          label={isPinned ? 'Unpin from top' : 'Pin to top'}
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" stroke="none">
              <path d="M16 12V4h1a1 1 0 0 0 0-2H7a1 1 0 0 0 0 2h1v8l-3 3v2h6v6l1 1 1-1v-6h6v-2l-3-3z" />
            </svg>
          }
          onClick={() => { onTogglePin?.(); onClose?.(); }}
        />
      </div>
    </Modal>
  );
}

function ActionButton({ label, icon, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition active:scale-[0.98] ${
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
          : 'text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800'
      }`}
    >
      <span className={danger ? 'text-red-500 dark:text-red-400' : 'text-ink-500 dark:text-ink-400'}>{icon}</span>
      {label}
    </button>
  );
}
