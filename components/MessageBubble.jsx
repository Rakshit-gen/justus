'use client';

import { useRef } from 'react';
import clsx from 'clsx';
import { useLongPress } from '@/hooks/useLongPress';
import { formatMessageTime } from '@/utils/date';

const DOUBLE_TAP_WINDOW_MS = 350;

function Ticks({ status }) {
  if (status === 'seen') {
    return (
      <svg viewBox="0 0 16 11" className="h-3.5 w-4 text-sky-300" fill="none">
        <path d="M1 6.2l3.2 3.2L11 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 6.2l3.2 3.2L15 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'delivered') {
    return (
      <svg viewBox="0 0 16 11" className="h-3.5 w-4 text-white/70" fill="none">
        <path d="M1 6.2l3.2 3.2L11 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 6.2l3.2 3.2L15 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 11" className="h-3.5 w-3 text-white/70" fill="none">
      <path d="M1 6.2l3.2 3.2L11 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function renderContent(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <a key={match.index} href={match[0]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-90">
        {match[0]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentRender({ att, isMine }) {
  if (att.mimeType?.startsWith('image/')) {
    const ratio = att.width && att.height ? att.width / att.height : null;
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" title={att.name} className="block overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={att.url} alt={att.name || 'image'} loading="lazy" className="max-h-72 w-auto max-w-full object-cover" style={ratio ? { aspectRatio: ratio } : undefined} />
      </a>
    );
  }
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer" download={att.name} title={att.name}
      className={clsx(
        'flex w-full max-w-[260px] items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-sm transition sm:max-w-[320px]',
        isMine
          ? 'bg-white/20 hover:bg-white/25'
          : 'bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700'
      )}>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <div className="min-w-0 w-0 flex-1">
        <div className="block truncate text-xs font-medium">{att.name || 'file'}</div>
        <div className="text-[10px] opacity-70">{formatBytes(att.size)}</div>
      </div>
    </a>
  );
}

function ReplyQuote({ preview, isMine, isFromMe, otherUserName, onClick }) {
  if (!preview) return null;
  const senderLabel = isFromMe ? 'You' : (otherUserName || 'Them');
  const snippet =
    preview.content
      ? preview.content
      : preview.type === 'image'
        ? '📷 Photo'
        : preview.type === 'file'
          ? '📎 Attachment'
          : '(empty)';
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'mb-1.5 -mx-1 block w-full overflow-hidden rounded-lg border-l-2 px-2 py-1 text-left transition active:scale-[0.98]',
        isMine
          ? 'border-white/80 bg-white/15 hover:bg-white/20'
          : 'border-brand-500 bg-brand-50 hover:bg-brand-100 dark:border-brand-400 dark:bg-brand-500/15 dark:hover:bg-brand-500/25'
      )}
    >
      <div className={clsx('text-[10px] font-semibold', isMine ? 'text-white/90' : 'text-brand-700 dark:text-brand-300')}>
        {senderLabel}
      </div>
      <div className={clsx('truncate text-[11px]', isMine ? 'text-white/80' : 'text-ink-600 dark:text-ink-400')}>
        {snippet}
      </div>
    </button>
  );
}

function ReactionsBar({ reactions, myId, onToggle }) {
  if (!reactions || Object.keys(reactions).length === 0) return null;
  const byEmoji = new Map();
  for (const [userId, emoji] of Object.entries(reactions)) {
    if (!byEmoji.has(emoji)) byEmoji.set(emoji, new Set());
    byEmoji.get(emoji).add(userId);
  }
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {Array.from(byEmoji.entries()).map(([emoji, users]) => {
        const mine = users.has(myId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle?.(emoji)}
            className={clsx(
              'animate-pop flex items-center gap-1 rounded-full px-2 py-0.5 text-xs leading-none transition active:scale-90',
              mine
                ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300 dark:bg-brand-500/25 dark:text-brand-200 dark:ring-brand-400/50'
                : 'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50 dark:bg-ink-800 dark:text-ink-200 dark:ring-ink-700 dark:hover:bg-ink-750'
            )}
          >
            <span className="text-sm">{emoji}</span>
            <span className="text-[10px] font-semibold">{users.size}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MessageBubble({
  message,
  isMine,
  myId,
  otherUserName,
  tightenTop,
  tightenBottom,
  onLongPress,
  onToggleReaction,
  onDoubleTap,
  onQuoteClick,
  bubbleRef,
  highlight,
}) {
  const longPressFiredRef = useRef(false);
  const lastTapAtRef = useRef(0);

  const longPress = useLongPress(
    (e, pos) => {
      longPressFiredRef.current = true;
      onLongPress?.(message, pos);
    },
    { delay: 450 }
  );

  function handleClick() {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    const now = Date.now();
    if (lastTapAtRef.current && now - lastTapAtRef.current < DOUBLE_TAP_WINDOW_MS) {
      lastTapAtRef.current = 0;
      onDoubleTap?.(message);
    } else {
      lastTapAtRef.current = now;
    }
  }

  const isDeleted = Boolean(message.deletedAt);
  const isEdited = Boolean(message.editedAt) && !isDeleted;

  const mineCorners = clsx('rounded-2xl', tightenTop && 'rounded-tr-md', !tightenBottom && 'rounded-br-md');
  const theirCorners = clsx('rounded-2xl', tightenTop && 'rounded-tl-md', !tightenBottom && 'rounded-bl-md');

  return (
    <div ref={bubbleRef} className={clsx('flex w-full animate-bubble-in', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[82%] transition-shadow sm:max-w-[65%]',
          highlight && 'ring-2 ring-brand-400 rounded-2xl'
        )}
      >
        <div
          {...(isDeleted ? {} : longPress)}
          onClick={isDeleted ? undefined : handleClick}
          className={clsx(
            'px-3.5 py-2 text-sm leading-relaxed no-select touch-manipulation cursor-default',
            isMine
              ? clsx(
                  'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-brand-glow',
                  mineCorners
                )
              : clsx(
                  'bg-white text-ink-800 ring-1 ring-ink-200 shadow-soft dark:bg-ink-800 dark:text-ink-100 dark:ring-ink-700',
                  theirCorners
                ),
            isDeleted && 'opacity-80 italic'
          )}
        >
          {!isDeleted && message.replyPreview && (
            <ReplyQuote
              preview={message.replyPreview}
              isMine={isMine}
              isFromMe={message.replyPreview.sender === myId}
              otherUserName={otherUserName}
              onClick={() => onQuoteClick?.(message.replyTo)}
            />
          )}
          {isDeleted ? (
            <div className="flex items-center gap-1.5 text-[13px]">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M4.93 4.93l14.14 14.14" />
              </svg>
              This message was deleted
            </div>
          ) : (
            <>
              {message.attachments?.length > 0 && (
                <div className={clsx('mb-1 space-y-1.5', !message.content && '-mx-0.5 -mt-0.5')}>
                  {message.attachments.map((att, i) => (
                    <AttachmentRender key={i} att={att} isMine={isMine} />
                  ))}
                </div>
              )}
              {message.content && (
                <div className="whitespace-pre-wrap [overflow-wrap:anywhere]">{renderContent(message.content)}</div>
              )}
            </>
          )}
          <div
            className={clsx(
              'mt-1 flex items-center justify-end gap-1.5 text-[10px]',
              isMine ? 'text-white/80' : 'text-ink-400 dark:text-ink-500'
            )}
          >
            {isEdited && <span className="opacity-80">edited</span>}
            <span>{formatMessageTime(message.createdAt)}</span>
            {isMine && !isDeleted && <Ticks status={message.status} />}
          </div>
        </div>
        <div className={isMine ? 'flex justify-end' : ''}>
          {!isDeleted && (
            <ReactionsBar reactions={message.reactions} myId={myId} onToggle={onToggleReaction} />
          )}
        </div>
      </div>
    </div>
  );
}
