'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { UserAvatar } from './UserAvatar';
import { formatLastSeen } from '@/utils/date';
import { api } from '@/lib/apiClient';

export function FriendProfileModal({ open, onClose, user, chatSetting, onUnfriended, onChatSettingUpdate }) {
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickInput, setNickInput] = useState('');
  const [savingNick, setSavingNick] = useState(false);

  useEffect(() => {
    if (!open) {
      setEditingNickname(false);
      setNickInput('');
    } else {
      setNickInput(chatSetting?.nickname || '');
    }
  }, [open, chatSetting?.nickname]);

  if (!user) return null;

  const displayName = chatSetting?.nickname || user.name;

  async function handleUnfriend() {
    if (!confirm(`Unfriend ${displayName}? You'll need to send a new friend request to chat again.`)) return;
    try {
      await api(`/api/friends/${user.id}`, { method: 'DELETE' });
      onUnfriended?.(user.id);
      onClose?.();
    } catch (e) {
      alert(e.message);
    }
  }

  async function saveNickname() {
    const next = nickInput.trim().slice(0, 40);
    if (next === (chatSetting?.nickname || '')) {
      setEditingNickname(false);
      return;
    }
    setSavingNick(true);
    try {
      const data = await api(`/api/chat-settings/${user.id}`, {
        method: 'PATCH',
        body: { nickname: next },
      });
      onChatSettingUpdate?.(data.setting);
      setEditingNickname(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingNick(false);
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
          name={displayName}
          color={user.avatarColor}
          avatarUrl={user.avatarUrl}
          size={120}
        />
        <h2 className="mt-4 text-xl font-semibold text-ink-900 dark:text-ink-50">
          {displayName}
        </h2>
        {chatSetting?.nickname && (
          <div className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">
            real name: {user.name}
          </div>
        )}
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

        {/* Nickname — private to you. The other person never sees it. */}
        <div className="mt-3 w-full rounded-xl bg-ink-50 px-4 py-3 dark:bg-ink-800">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500">
              Your nickname for them
            </span>
            {!editingNickname && (
              <button
                type="button"
                onClick={() => setEditingNickname(true)}
                className="text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-300"
              >
                {chatSetting?.nickname ? 'Edit' : 'Add'}
              </button>
            )}
          </div>
          {editingNickname ? (
            <div className="flex items-center gap-2">
              <input
                value={nickInput}
                onChange={(e) => setNickInput(e.target.value.slice(0, 40))}
                autoFocus
                maxLength={40}
                placeholder={user.name}
                className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
              />
              <button
                onClick={saveNickname}
                disabled={savingNick}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition active:scale-[0.97] hover:bg-brand-700 disabled:opacity-60"
              >
                Save
              </button>
              <button
                onClick={() => { setEditingNickname(false); setNickInput(chatSetting?.nickname || ''); }}
                className="rounded-lg px-2 py-2 text-xs text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="text-sm text-ink-700 dark:text-ink-200">
              {chatSetting?.nickname || (
                <span className="italic text-ink-400 dark:text-ink-500">
                  none — they show up as {user.name}
                </span>
              )}
            </div>
          )}
        </div>

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
