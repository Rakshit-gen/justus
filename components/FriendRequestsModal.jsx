'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { UserAvatar } from './UserAvatar';
import { api } from '@/lib/apiClient';

export function FriendRequestsModal({
  open,
  onClose,
  incoming,
  outgoing,
  onAccepted,
  onIncomingRemoved,
  onOutgoingRemoved,
}) {
  const [tab, setTab] = useState('incoming');
  const [busyIds, setBusyIds] = useState(new Set());

  useEffect(() => {
    if (!open) setTab(incoming.length ? 'incoming' : 'outgoing');
  }, [open, incoming.length]);

  function mark(id, on) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  async function accept(req) {
    mark(req.id, true);
    try {
      const data = await api(`/api/friends/requests/${req.id}`, { method: 'POST' });
      onAccepted?.(data.friend);
      onIncomingRemoved?.(req.id);
    } catch (e) { alert(e.message); }
    finally { mark(req.id, false); }
  }
  async function decline(req) {
    mark(req.id, true);
    try {
      await api(`/api/friends/requests/${req.id}`, { method: 'DELETE' });
      onIncomingRemoved?.(req.id);
    } catch (e) { alert(e.message); }
    finally { mark(req.id, false); }
  }
  async function cancel(req) {
    mark(req.id, true);
    try {
      await api(`/api/friends/requests/${req.id}`, { method: 'DELETE' });
      onOutgoingRemoved?.(req.id);
    } catch (e) { alert(e.message); }
    finally { mark(req.id, false); }
  }

  const list = tab === 'incoming' ? incoming : outgoing;

  return (
    <Modal open={open} onClose={onClose} title="Friend requests">
      <div className="mb-3 flex rounded-lg bg-ink-100 p-0.5 dark:bg-ink-800">
        <TabButton active={tab === 'incoming'} onClick={() => setTab('incoming')}>
          Incoming{incoming.length ? ` (${incoming.length})` : ''}
        </TabButton>
        <TabButton active={tab === 'outgoing'} onClick={() => setTab('outgoing')}>
          Sent{outgoing.length ? ` (${outgoing.length})` : ''}
        </TabButton>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {list.length === 0 ? (
          <div className="py-8 text-center text-sm text-ink-400 dark:text-ink-500">
            {tab === 'incoming' ? 'No incoming requests.' : 'No sent requests.'}
          </div>
        ) : (
          list.map((req) => {
            const user = tab === 'incoming' ? req.from : req.to;
            const busy = busyIds.has(req.id);
            return (
              <div key={req.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-ink-50 dark:hover:bg-ink-800">
                <UserAvatar name={user.name} color={user.avatarColor} avatarUrl={user.avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink-900 dark:text-ink-100">{user.name}</div>
                  {user.bio && <div className="truncate text-xs text-ink-500 dark:text-ink-400">{user.bio}</div>}
                </div>
                {tab === 'incoming' ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => accept(req)}
                      disabled={busy}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition active:scale-95 hover:bg-emerald-700 disabled:opacity-60"
                    >Accept</button>
                    <button
                      onClick={() => decline(req)}
                      disabled={busy}
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-ink-600 transition active:scale-95 hover:bg-ink-100 disabled:opacity-60 dark:text-ink-300 dark:hover:bg-ink-700"
                    >Decline</button>
                  </div>
                ) : (
                  <button
                    onClick={() => cancel(req)}
                    disabled={busy}
                    className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-red-600 transition active:scale-95 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
                  >Cancel</button>
                )}
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'bg-white text-ink-900 shadow-soft dark:bg-ink-950 dark:text-ink-50'
          : 'text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200'
      }`}
    >
      {children}
    </button>
  );
}
