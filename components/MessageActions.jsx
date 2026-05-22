'use client';

import { Modal } from './Modal';

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export function MessageActions({
  open,
  message,
  isMine,
  myReaction,
  onClose,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}) {
  if (!message) return null;

  const canEdit = isMine && !message.deletedAt &&
    Date.now() - new Date(message.createdAt).getTime() < 5 * 60 * 1000;
  const canDelete = isMine && !message.deletedAt;
  const canCopy = !message.deletedAt && message.content;
  const canReply = !message.deletedAt;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="-mt-1 mb-3 flex items-center justify-center gap-1.5">
        {QUICK_REACTIONS.map((e) => {
          const selected = myReaction === e;
          return (
            <button
              key={e}
              type="button"
              onClick={() => { onReact?.(e); onClose?.(); }}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl transition active:scale-90 ${
                selected
                  ? 'bg-brand-100 ring-2 ring-brand-400 dark:bg-brand-500/20 dark:ring-brand-400/60'
                  : 'hover:bg-ink-100 dark:hover:bg-ink-800'
              }`}
            >
              {e}
            </button>
          );
        })}
      </div>
      <div className="space-y-1">
        {canReply && (
          <ActionButton
            label="Reply"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 17 4 12 9 7" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
            }
            onClick={() => { onReply?.(); onClose?.(); }}
          />
        )}
        {canCopy && (
          <ActionButton
            label="Copy"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            }
            onClick={() => { onCopy?.(); onClose?.(); }}
          />
        )}
        {canEdit && (
          <ActionButton
            label="Edit"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
            onClick={() => { onEdit?.(); onClose?.(); }}
          />
        )}
        {canDelete && (
          <ActionButton
            label="Delete"
            danger
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            }
            onClick={() => {
              if (confirm('Delete this message?')) onDelete?.();
              onClose?.();
            }}
          />
        )}
      </div>
    </Modal>
  );
}

function ActionButton({ label, icon, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition active:scale-[0.98] ${
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
          : 'text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800'
      }`}
    >
      <span className={danger ? 'text-red-500 dark:text-red-400' : 'text-ink-500 dark:text-ink-400'}>{icon}</span>
      {label}
    </button>
  );
}
