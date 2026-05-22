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
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5" />
              <path d="M5 7l7 7 7-7" transform="rotate(180 12 10.5)" />
              <path d="M7 4h10l-1 8H8L7 4z" />
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
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className={danger ? 'text-red-500' : 'text-slate-500'}>{icon}</span>
      {label}
    </button>
  );
}
