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
    } catch (e) {
      alert(e.message);
    } finally {
      mark(req.id, false);
    }
  }

  async function decline(req) {
    mark(req.id, true);
    try {
      await api(`/api/friends/requests/${req.id}`, { method: 'DELETE' });
      onIncomingRemoved?.(req.id);
    } catch (e) {
      alert(e.message);
    } finally {
      mark(req.id, false);
    }
  }

  async function cancel(req) {
    mark(req.id, true);
    try {
      await api(`/api/friends/requests/${req.id}`, { method: 'DELETE' });
      onOutgoingRemoved?.(req.id);
    } catch (e) {
      alert(e.message);
    } finally {
      mark(req.id, false);
    }
  }

  const list = tab === 'incoming' ? incoming : outgoing;

  return (
    <Modal open={open} onClose={onClose} title="Friend requests">
      <div className="mb-3 flex rounded-lg bg-slate-100 p-0.5">
        <TabButton active={tab === 'incoming'} onClick={() => setTab('incoming')}>
          Incoming{incoming.length ? ` (${incoming.length})` : ''}
        </TabButton>
        <TabButton active={tab === 'outgoing'} onClick={() => setTab('outgoing')}>
          Sent{outgoing.length ? ` (${outgoing.length})` : ''}
        </TabButton>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {list.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            {tab === 'incoming' ? 'No incoming requests.' : 'No sent requests.'}
          </div>
        ) : (
          list.map((req) => {
            const user = tab === 'incoming' ? req.from : req.to;
            const busy = busyIds.has(req.id);
            return (
              <div key={req.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                <UserAvatar name={user.name} color={user.avatarColor} avatarUrl={user.avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{user.name}</div>
                  {user.bio && <div className="truncate text-xs text-slate-500">{user.bio}</div>}
                </div>
                {tab === 'incoming' ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => accept(req)}
                      disabled={busy}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => decline(req)}
                      disabled={busy}
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => cancel(req)}
                    disabled={busy}
                    className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
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
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
