'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { useLongPress } from '@/hooks/useLongPress';
import { SmartImage } from './SmartImage';
import { formatMessageTime } from '@/utils/date';

const DOUBLE_TAP_WINDOW_MS = 350;
const SWIPE_TRIGGER_PX = 60;     // horizontal travel that fires "reply"
const SWIPE_MAX_PX = 80;         // beyond this we rubber-band
const AXIS_LOCK_PX = 8;          // px before we decide horizontal vs vertical

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

function AttachmentRender({ att, isMine, onImageClick }) {
  if (att.mimeType?.startsWith('image/')) {
    return (
      <SmartImage
        src={att.url}
        alt={att.name || 'image'}
        width={att.width}
        height={att.height}
        onClick={() => onImageClick?.(att)}
      />
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
  onImageClick,
  onSwipeReply,
  bubbleRef,
  highlight,
}) {
  const longPressFiredRef = useRef(false);
  const lastTapAtRef = useRef(0);
  const swipeRef = useRef({ active: false, startX: 0, startY: 0, axis: null });
  const swipeFiredRef = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isDeleted = Boolean(message.deletedAt);

  const longPress = useLongPress(
    (e, pos) => {
      longPressFiredRef.current = true;
      onLongPress?.(message, pos);
    },
    { delay: 450 }
  );

  function handleClick(e) {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (swipeFiredRef.current) {
      // Suppress the click that follows a swipe-to-reply gesture.
      swipeFiredRef.current = false;
      return;
    }
    const now = Date.now();
    if (lastTapAtRef.current && now - lastTapAtRef.current < DOUBLE_TAP_WINDOW_MS) {
      lastTapAtRef.current = 0;
      // Pass the tap viewport coordinates so the parent can spawn a floating heart.
      onDoubleTap?.(message, { x: e.clientX, y: e.clientY });
    } else {
      lastTapAtRef.current = now;
    }
  }

  // Pointer-based swipe-to-reply. Sent messages (right-aligned) swipe LEFT,
  // received messages swipe RIGHT — same direction as the bubble's "free"
  // edge in both cases. Threshold + rubber-band match the iMessage feel.
  const swipeDirection = isMine ? -1 : 1;

  function onPointerDown(e) {
    if (isDeleted || !onSwipeReply) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipeRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      axis: null,
      pointerId: e.pointerId,
      captured: false,
      target: e.currentTarget,
    };
  }

  function onPointerMove(e) {
    const s = swipeRef.current;
    if (!s.active || e.pointerId !== s.pointerId) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.axis) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      // Capture once we've decided this is a horizontal swipe so the bubble
      // keeps receiving move/up events even as it slides under the finger.
      if (s.axis === 'x' && !s.captured) {
        try { s.target.setPointerCapture?.(s.pointerId); s.captured = true; } catch {}
      }
    }
    if (s.axis !== 'x') return; // vertical → let the scroller take over
    // Only allow swipe in the direction matching this bubble's side.
    const allowed = swipeDirection > 0 ? Math.max(0, dx) : Math.min(0, dx);
    const abs = Math.abs(allowed);
    const capped = abs > SWIPE_MAX_PX ? SWIPE_MAX_PX + (abs - SWIPE_MAX_PX) * 0.2 : abs;
    setSwipeOffset(swipeDirection * capped);
  }

  function onPointerEnd(e) {
    const s = swipeRef.current;
    if (!s.active) return;
    if (e?.pointerId != null && e.pointerId !== s.pointerId) return;
    s.active = false;
    if (s.captured) {
      try { s.target?.releasePointerCapture?.(s.pointerId); } catch {}
    }
    if (Math.abs(swipeOffset) >= SWIPE_TRIGGER_PX) {
      swipeFiredRef.current = true;
      try { navigator.vibrate?.(12); } catch {}
      onSwipeReply?.(message);
    }
    setSwipeOffset(0);
  }

  const isEdited = Boolean(message.editedAt) && !isDeleted;

  const mineCorners = clsx('rounded-2xl', tightenTop && 'rounded-tr-md', !tightenBottom && 'rounded-br-md');
  const theirCorners = clsx('rounded-2xl', tightenTop && 'rounded-tl-md', !tightenBottom && 'rounded-bl-md');

  const swipeProgress = Math.min(1, Math.abs(swipeOffset) / SWIPE_TRIGGER_PX);
  const swipeArmed = Math.abs(swipeOffset) >= SWIPE_TRIGGER_PX;
  const isSwiping = swipeOffset !== 0;

  return (
    <div
      ref={bubbleRef}
      className={clsx(
        'relative flex w-full animate-bubble-in',
        isMine ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Reply icon revealed as the bubble is dragged. Sits on the bubble's
          original side (opposite to the drag direction). */}
      {isSwiping && (
        <span
          aria-hidden
          className={clsx(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full transition-colors',
            isMine ? 'right-2' : 'left-2',
            swipeArmed
              ? 'bg-brand-500 text-white shadow-brand-glow'
              : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'
          )}
          style={{ opacity: swipeProgress, transform: `translateY(-50%) scale(${0.7 + 0.3 * swipeProgress})` }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </svg>
        </span>
      )}
      <div
        className={clsx(
          'max-w-[82%] transition-shadow sm:max-w-[65%]',
          !isSwiping && 'transition-transform duration-200',
          highlight && 'ring-2 ring-brand-400 rounded-2xl'
        )}
        style={{ transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined, touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
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
                    <AttachmentRender key={i} att={att} isMine={isMine} onImageClick={onImageClick} />
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
