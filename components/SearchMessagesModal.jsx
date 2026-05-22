'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { api } from '@/lib/apiClient';
import { formatMessageTime, formatDayDivider } from '@/utils/date';

export function SearchMessagesModal({ open, onClose, conversationId, otherUserName, myId, onJump }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) { setQ(''); setResults([]); setErr(''); }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!open || !conversationId) return;
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setErr('');
      try {
        const data = await api(`/api/messages/${conversationId}/search?q=${encodeURIComponent(trimmed)}`);
        setResults(data.results || []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [q, open, conversationId]);

  function highlight(text, q) {
    if (!q) return text;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(re);
    return parts.map((p, i) =>
      re.test(p)
        ? <mark key={i} className="bg-yellow-200 text-ink-900 rounded px-0.5 dark:bg-yellow-500/40 dark:text-yellow-100">{p}</mark>
        : <span key={i}>{p}</span>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Search messages">
      <div className="space-y-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type to search…"
          className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:placeholder:text-ink-500 dark:focus:bg-ink-850 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
        />
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</div>}
        <div className="max-h-80 min-h-[6rem] overflow-y-auto">
          {loading ? (
            <div className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">Searching…</div>
          ) : q.trim() === '' ? (
            <div className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">Find any message in this chat.</div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">No matches.</div>
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => { onJump?.(m.id); onClose?.(); }}
                    className="block w-full rounded-lg px-2 py-2 text-left transition hover:bg-ink-50 active:scale-[0.99] dark:hover:bg-ink-800"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-ink-400 dark:text-ink-500">
                      <span>{m.sender === myId ? 'You' : (otherUserName || 'Them')}</span>
                      <span>{formatDayDivider(m.createdAt)} · {formatMessageTime(m.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 break-words whitespace-pre-wrap text-sm text-ink-800 line-clamp-3 dark:text-ink-100">
                      {highlight(m.content, q.trim())}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
