'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { api } from '@/lib/apiClient';

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ScheduleSendModal({ open, onClose, otherUser, content, attachments, onScheduled, onClear }) {
  const minDate = useMemo(() => {
    const d = new Date(Date.now() + 60 * 1000);
    return toLocalInputValue(d);
  }, []);
  const defaultDate = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return toLocalInputValue(d);
  }, []);
  const [when, setWhen] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function schedule() {
    setErr('');
    setBusy(true);
    try {
      const data = await api('/api/scheduled-messages', {
        method: 'POST',
        body: {
          recipientId: otherUser.id,
          content,
          attachments,
          scheduledFor: new Date(when).toISOString(),
        },
      });
      onScheduled?.(data.scheduled);
      onClear?.();
      onClose?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule send">
      <div className="space-y-3">
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <div className="text-xs text-slate-500">To {otherUser?.name}</div>
          <div className="mt-1 line-clamp-3 whitespace-pre-wrap">{content || (attachments?.length ? `📎 ${attachments.length} attachment(s)` : '(empty)')}</div>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Deliver at</span>
          <input
            type="datetime-local"
            value={when}
            min={minDate}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
          />
        </label>
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
        <button
          onClick={schedule}
          disabled={busy || !when || (!content && !attachments?.length)}
          className="w-full rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-600/30 transition active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? 'Scheduling…' : 'Schedule send'}
        </button>
      </div>
    </Modal>
  );
}

export function ScheduledList({ open, onClose, otherUser }) {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');

  // Load when the modal opens; reset when it closes so we always fetch fresh.
  useEffect(() => {
    if (!open) {
      setItems(null);
      setErr('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api('/api/scheduled-messages');
        if (cancelled) return;
        const filtered = otherUser
          ? data.scheduled.filter((s) => s.recipient === otherUser.id)
          : data.scheduled;
        setItems(filtered);
      } catch (e) {
        if (cancelled) return;
        setErr(e.message);
        setItems([]); // exit the loading state even on error
      }
    })();
    return () => { cancelled = true; };
  }, [open, otherUser?.id]);

  async function cancel(id) {
    try {
      await api(`/api/scheduled-messages/${id}`, { method: 'DELETE' });
      setItems((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Scheduled${otherUser ? ` for ${otherUser.name}` : ''}`}>
      <div className="space-y-2">
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
        {items === null ? (
          <div className="py-6 text-center text-sm text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">No scheduled messages.</div>
        ) : (
          items.map((s) => (
            <div key={s.id} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">
                    {new Date(s.scheduledFor).toLocaleString()}
                  </div>
                  <div className="mt-1 line-clamp-3 break-words whitespace-pre-wrap text-sm text-slate-800">
                    {s.content || `📎 ${s.attachments.length} attachment(s)`}
                  </div>
                </div>
                <button
                  onClick={() => cancel(s.id)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
