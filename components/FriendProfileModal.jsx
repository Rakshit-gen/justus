'use client';

import { Modal } from './Modal';
import { UserAvatar } from './UserAvatar';
import { formatLastSeen } from '@/utils/date';
import { api } from '@/lib/apiClient';

export function FriendProfileModal({ open, onClose, user, onUnfriended }) {
  if (!user) return null;

  async function handleUnfriend() {
    if (!confirm(`Unfriend ${user.name}? You'll need to send a new friend request to chat again.`)) return;
    try {
      await api(`/api/friends/${user.id}`, { method: 'DELETE' });
      onUnfriended?.(user.id);
      onClose?.();
    } catch (e) {
      alert(e.message);
    }
  }

  const presence = user.isOnline ? (
    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
      <span className="relative inline-block h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ring-pulse" aria-hidden />
        <span className="absolute inset-0 rounded-full bg-emerald-500" />
      </span>
      online
    </span>
  ) : (
    <span className="text-ink-500 dark:text-ink-400">{formatLastSeen(user.lastSeen)}</span>
  );

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col items-center pt-2">
        <UserAvatar
          name={user.name}
          color={user.avatarColor}
          avatarUrl={user.avatarUrl}
          size={120}
        />
        <h2 className="mt-4 text-xl font-semibold text-ink-900 dark:text-ink-50">
          {user.name}
        </h2>
        <div className="mt-1 text-sm">{presence}</div>

        {user.bio ? (
          <div className="mt-4 w-full rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-700 dark:bg-ink-800 dark:text-ink-200">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500">
              About
            </div>
            <div className="whitespace-pre-wrap break-words leading-relaxed">{user.bio}</div>
          </div>
        ) : (
          <div className="mt-4 w-full rounded-xl bg-ink-50 px-4 py-3 text-center text-xs italic text-ink-400 dark:bg-ink-800 dark:text-ink-500">
            No bio yet
          </div>
        )}

        <div className="mt-5 w-full space-y-1">
          <button
            type="button"
            onClick={handleUnfriend}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition active:scale-[0.98] hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="18" y1="8" x2="23" y2="13" />
              <line x1="23" y1="8" x2="18" y2="13" />
            </svg>
            Unfriend
          </button>
        </div>
      </div>
    </Modal>
  );
}
