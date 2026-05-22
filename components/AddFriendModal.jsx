'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { UserAvatar } from './UserAvatar';
import { api } from '@/lib/apiClient';

export function AddFriendModal({ open, onClose, onRequestSent, onAutoAccepted }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [pendingIds, setPendingIds] = useState(new Set());
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) { setQ(''); setResults([]); setErr(''); }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!open) return;
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setErr('');
      try {
        const data = await api(`/api/users/search?q=${encodeURIComponent(trimmed)}`);
        setResults(data.results || []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [q, open]);

  async function sendRequest(user) {
    setPendingIds((prev) => new Set(prev).add(user.id));
    try {
      const data = await api('/api/friends/requests', {
        method: 'POST',
        body: { recipientId: user.id },
      });
      if (data.autoAccepted) {
        onAutoAccepted?.(data.friend);
        setResults((prev) =>
          prev.map((r) => (r.id === user.id ? { ...r, friendshipStatus: 'accepted' } : r))
        );
      } else {
        onRequestSent?.({ id: data.request.id, to: data.request.to, createdAt: data.request.createdAt });
        setResults((prev) =>
          prev.map((r) =>
            r.id === user.id
              ? { ...r, friendshipStatus: 'pending_outgoing', friendshipId: data.request.id }
              : r
          )
        );
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a friend">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-300">Search by name</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            placeholder="Start typing…"
            className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:placeholder:text-ink-500 dark:focus:bg-ink-850 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
          />
        </label>

        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</div>}

        <div className="min-h-[6rem] max-h-72 overflow-y-auto">
          {loading ? (
            <div className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">Searching…</div>
          ) : q.trim() === '' ? (
            <div className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">Type a name to find people.</div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">No matches.</div>
          ) : (
            results.map((u) => (
              <Row
                key={u.id}
                user={u}
                isPending={pendingIds.has(u.id)}
                onSend={() => sendRequest(u)}
              />
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

function Row({ user, isPending, onSend }) {
  let actionLabel = 'Add';
  let actionDisabled = false;
  let actionColor = 'bg-brand-600 text-white hover:bg-brand-700';

  if (user.friendshipStatus === 'accepted') {
    actionLabel = 'Friends';
    actionDisabled = true;
    actionColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
  } else if (user.friendshipStatus === 'pending_outgoing') {
    actionLabel = 'Requested';
    actionDisabled = true;
    actionColor = 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400';
  } else if (user.friendshipStatus === 'pending_incoming') {
    actionLabel = 'Accept';
    actionColor = 'bg-emerald-600 text-white hover:bg-emerald-700';
  }

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-ink-50 dark:hover:bg-ink-800">
      <UserAvatar name={user.name} color={user.avatarColor} avatarUrl={user.avatarUrl} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink-900 dark:text-ink-100">{user.name}</div>
        {user.bio && <div className="truncate text-xs text-ink-500 dark:text-ink-400">{user.bio}</div>}
      </div>
      <button
        onClick={onSend}
        disabled={actionDisabled || isPending}
        className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition active:scale-95 ${actionColor} disabled:cursor-not-allowed disabled:opacity-80 disabled:active:scale-100`}
      >
        {isPending ? '…' : actionLabel}
      </button>
    </div>
  );
}
