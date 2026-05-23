'use client';

import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { UserAvatar } from './UserAvatar';
import { useLongPress } from '@/hooks/useLongPress';
import { formatSidebarTime } from '@/utils/date';

export function Sidebar({
  me,
  friends,
  conversations,
  chatSettings = {},
  activeOtherUserId,
  onSelectUser,
  onOpenSettings,
  onOpenAddFriend,
  onOpenRequests,
  onLongPressFriend,
  incomingCount = 0,
  connected = true,
  loading = false,
}) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const convoByOther = new Map();
    for (const c of conversations) {
      if (!c.otherUser) continue;
      const cur = convoByOther.get(c.otherUser.id);
      if (!cur) { convoByOther.set(c.otherUser.id, c); continue; }
      const curTime = cur.updatedAt ? new Date(cur.updatedAt).getTime() : 0;
      const newTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
      if (newTime > curTime) convoByOther.set(c.otherUser.id, c);
    }
    const list = friends.map((u) => {
      const c = convoByOther.get(u.id);
      const s = chatSettings[u.id] || {};
      const displayName = s.nickname || u.name;
      return {
        user: u,
        displayName,
        pinned: Boolean(s.pinned),
        lastMessage: c?.lastMessage || null,
        unread: c?.unread || 0,
        updatedAt: c?.updatedAt || null,
      };
    });
    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.updatedAt && b.updatedAt) return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (a.updatedAt) return -1;
      if (b.updatedAt) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [friends, conversations, chatSettings]);

  const filtered = query
    ? rows.filter((r) => r.displayName.toLowerCase().includes(query.toLowerCase()))
    : rows;

  return (
    <aside className="flex h-full w-full flex-col border-r border-ink-200 bg-white md:w-80 dark:border-ink-800 dark:bg-ink-900">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-ink-200 px-3 py-3 sm:px-4 dark:border-ink-800">
        <button
          onClick={onOpenSettings}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 -m-1 text-left transition active:scale-[0.98] hover:bg-ink-50 dark:hover:bg-ink-800"
        >
          <UserAvatar name={me.name} color={me.avatarColor} avatarUrl={me.avatarUrl} size={36} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">{me.name}</div>
            <div className="flex items-center gap-1.5">
              <span className={clsx('h-1.5 w-1.5 rounded-full', connected ? 'bg-emerald-500' : 'bg-amber-500')} />
              <span className={clsx('text-[11px]', connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                {connected ? 'online' : 'reconnecting…'}
              </span>
            </div>
          </div>
        </button>
        <button
          onClick={onOpenAddFriend}
          className="rounded-md p-2 text-ink-500 transition active:scale-90 hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          aria-label="Add friend"
          title="Add friend"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </button>
        <button
          onClick={onOpenSettings}
          className="rounded-md p-2 text-ink-500 transition active:scale-90 hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          aria-label="Settings"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3 sm:px-4">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends"
            className="w-full rounded-lg border border-ink-200 bg-ink-50 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:placeholder:text-ink-500 dark:focus:bg-ink-850 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
          />
        </div>
      </div>

      {/* Requests pill */}
      {incomingCount > 0 && (
        <button
          onClick={onOpenRequests}
          className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 px-3 py-2.5 text-left ring-1 ring-amber-200 transition active:scale-[0.99] hover:from-amber-100 hover:to-orange-100 sm:mx-4 dark:from-amber-500/10 dark:to-orange-500/10 dark:ring-amber-500/30 dark:hover:from-amber-500/15 dark:hover:to-orange-500/15"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 11h-6" />
                <path d="M19 8v6" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">Friend requests</div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300/80">{incomingCount} pending</div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-2" style={{ overscrollBehavior: 'contain' }}>
        {loading ? (
          <SidebarSkeleton />
        ) : filtered.length === 0 ? (
          <EmptySidebar query={query} hasFriends={friends.length > 0} onAdd={onOpenAddFriend} />
        ) : (
          filtered.map((row) => (
            <SidebarRow
              key={row.user.id}
              row={row}
              active={row.user.id === activeOtherUserId}
              onSelect={() => onSelectUser(row.user)}
              onLongPress={() => onLongPressFriend?.(row.user, row.pinned)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function SidebarRow({ row, active, onSelect, onLongPress }) {
  const longPressFiredRef = useRef(false);
  const longPress = useLongPress(() => {
    longPressFiredRef.current = true;
    onLongPress?.();
  }, { delay: 450 });

  function handleClick() {
    if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
    onSelect?.();
  }

  const u = row.user;
  return (
    <div
      {...longPress}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      className={clsx(
        'flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition active:bg-ink-100 sm:px-4 dark:active:bg-ink-800',
        active
          ? 'bg-gradient-to-r from-brand-50 to-brand-100/40 dark:from-brand-500/15 dark:to-brand-500/5'
          : 'hover:bg-ink-50 dark:hover:bg-ink-800/60'
      )}
    >
      <UserAvatar name={row.displayName || u.name} color={u.avatarColor} avatarUrl={u.avatarUrl} size={44} online={u.isOnline} showDot />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className={clsx('flex min-w-0 items-center gap-1.5', active ? 'text-brand-700 dark:text-brand-300' : 'text-ink-900 dark:text-ink-100')}>
            <span className="truncate text-sm font-medium">{row.displayName || u.name}</span>
            {row.pinned && (
              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-ink-400 dark:text-ink-500" fill="currentColor" stroke="none" aria-label="Pinned">
                <path d="M16 12V4h1a1 1 0 0 0 0-2H7a1 1 0 0 0 0 2h1v8l-3 3v2h6v6l1 1 1-1v-6h6v-2l-3-3z" />
              </svg>
            )}
          </div>
          {row.updatedAt && (
            <span className={clsx(
              'shrink-0 text-[11px]',
              row.unread > 0
                ? 'text-brand-600 font-medium dark:text-brand-300'
                : 'text-ink-400 dark:text-ink-500'
            )}>
              {formatSidebarTime(row.updatedAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className={clsx(
            'truncate text-xs',
            row.unread > 0
              ? 'text-ink-700 font-medium dark:text-ink-200'
              : 'text-ink-500 dark:text-ink-400'
          )}>
            {row.lastMessage?.content || u.bio || (u.isOnline ? 'online' : 'tap to start chatting')}
          </div>
          {row.unread > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 px-1.5 text-[11px] font-semibold text-white shadow-brand-glow">
              {row.unread > 99 ? '99+' : row.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-1 px-2 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3">
          <div className="h-11 w-11 rounded-full skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded skeleton" />
            <div className="h-2.5 w-3/4 rounded skeleton opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptySidebar({ query, hasFriends, onAdd }) {
  if (query) {
    return <div className="px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">No matches for “{query}”</div>;
  }
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      </div>
      <div className="text-sm text-ink-500 dark:text-ink-400">No friends yet.</div>
      <button
        onClick={onAdd}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition active:scale-[0.97] hover:bg-brand-700"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add a friend
      </button>
    </div>
  );
}
