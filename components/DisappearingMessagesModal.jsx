'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Modal } from './Modal';

const OPTIONS = [
  { ttl: 0, label: 'Off', sub: 'Messages stay forever' },
  { ttl: 86400, label: '24 hours', sub: 'Each message vanishes a day after sending' },
  { ttl: 604800, label: '7 days', sub: 'A week of history, then gone' },
  { ttl: 2592000, label: '30 days', sub: 'Rolling 30-day window' },
];

export function DisappearingMessagesModal({ open, onClose, otherUser, socket, currentTtl = 0 }) {
  const [selected, setSelected] = useState(currentTtl);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelected(currentTtl || 0);
  }, [open, currentTtl]);

  function save(ttl) {
    if (!socket) return;
    setSelected(ttl);
    setSaving(true);
    socket.emit(
      'convo:disappearing:set',
      { otherUserId: otherUser?.id, ttlSeconds: ttl },
      (ack) => {
        setSaving(false);
        if (ack?.error) {
          alert(ack.error);
          setSelected(currentTtl); // revert
          return;
        }
        onClose?.();
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">
            Disappearing messages
          </h3>
          <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
            Affects both you and {otherUser?.name || 'them'}. Existing messages aren't changed.
          </p>
        </div>
        <div className="space-y-1">
          {OPTIONS.map((opt) => (
            <button
              key={opt.ttl}
              type="button"
              disabled={saving}
              onClick={() => save(opt.ttl)}
              className={clsx(
                'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition active:scale-[0.98]',
                selected === opt.ttl
                  ? 'bg-brand-50 ring-1 ring-brand-300 dark:bg-brand-500/15 dark:ring-brand-400/40'
                  : 'hover:bg-ink-50 dark:hover:bg-ink-800',
                saving && 'opacity-60'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className={clsx(
                  'text-sm font-medium',
                  selected === opt.ttl ? 'text-brand-700 dark:text-brand-200' : 'text-ink-800 dark:text-ink-100'
                )}>
                  {opt.label}
                </div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400">{opt.sub}</div>
              </div>
              {selected === opt.ttl && (
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-300" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function formatTtlShort(ttlSeconds) {
  if (!ttlSeconds) return '';
  if (ttlSeconds >= 2592000) return '30d';
  if (ttlSeconds >= 604800) return '7d';
  if (ttlSeconds >= 86400) return '24h';
  return `${Math.round(ttlSeconds / 60)}m`;
}
