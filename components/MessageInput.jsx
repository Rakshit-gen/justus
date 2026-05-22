'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { EmojiPicker } from './EmojiPicker';

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageInput({
  onSend,
  onSchedule,
  onTypingChange,
  disabled,
  attachments,
  onAddFiles,
  onRemoveAttachment,
  uploading,
  editing,
  onCancelEdit,
  clearSignal = 0,
}) {
  const [value, setValue] = useState('');
  const [swooshKey, setSwooshKey] = useState(0); // bump to replay send animation

  // Parent can ask us to clear by bumping `clearSignal`.
  useEffect(() => {
    if (clearSignal > 0) setValue('');
  }, [clearSignal]);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const onTypingRef = useRef(onTypingChange);

  useEffect(() => { onTypingRef.current = onTypingChange; }, [onTypingChange]);

  // When entering edit mode, prefill input with the message's content.
  useEffect(() => {
    if (editing) {
      setValue(editing.content || '');
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [editing]);

  // Auto-grow
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  }, [value]);

  useEffect(() => () => {
    clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingRef.current?.(false);
    }
  }, []);

  function setTyping(next) {
    if (isTypingRef.current === next) return;
    isTypingRef.current = next;
    onTypingChange?.(next);
  }

  function handleChange(e) {
    setValue(e.target.value);
    if (editing) return; // don't broadcast typing during edits
    if (e.target.value.trim()) {
      setTyping(true);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTyping(false), 1500);
    } else {
      setTyping(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape' && editing) onCancelEdit?.();
    if (e.key === 'Enter' && !e.shiftKey) {
      // On touch-primary devices (phones, most tablets) the keyboard has no
      // Shift, so Enter-to-send leaves no way to type multiple lines. Let
      // Enter insert a newline natively; users send via the send button.
      const isCoarse =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(pointer: coarse)').matches;
      if (isCoarse) return;
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = value.trim();
    if (editing) {
      if (!trimmed) return;
      onSend(trimmed); // parent handles edit via the `editing` flag
      setValue('');
      return;
    }
    const hasContent = Boolean(trimmed);
    const hasAtt = (attachments?.length || 0) > 0;
    if (!hasContent && !hasAtt) return;
    if (disabled) return;
    onSend(trimmed);
    setValue('');
    setTyping(false);
    clearTimeout(typingTimerRef.current);
    setSwooshKey((k) => k + 1);
  }

  function insertEmoji(e) {
    setValue((v) => v + e);
    textareaRef.current?.focus();
  }

  const canSchedule = !editing && !disabled && (value.trim() || (attachments?.length || 0) > 0);

  return (
    <div className="border-t border-ink-200 bg-white/85 backdrop-blur pb-safe dark:border-ink-800 dark:bg-ink-900/90">
      {editing && (
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-2 text-xs text-ink-600 dark:border-ink-800 dark:text-ink-300">
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Editing message</span>
          </div>
          <button onClick={onCancelEdit} className="text-ink-500 underline hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200">cancel</button>
        </div>
      )}

      {attachments && attachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative shrink-0" title={att.name}>
              {att.mimeType?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={att.previewUrl || att.url}
                  alt={att.name}
                  className="h-16 w-16 rounded-lg object-cover ring-1 ring-ink-200 dark:ring-ink-700"
                />
              ) : (
                <div className="flex h-16 w-32 items-center gap-2 overflow-hidden rounded-lg bg-ink-100 px-2 ring-1 ring-ink-200 dark:bg-ink-800 dark:ring-ink-700">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-500 dark:text-ink-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <div className="min-w-0 w-0 flex-1">
                    <div className="block truncate text-[11px] font-medium dark:text-ink-100">{att.name}</div>
                    <div className="text-[10px] text-ink-500 dark:text-ink-400">{formatBytes(att.size)}</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => onRemoveAttachment(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow"
                aria-label="Remove"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              {att.uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="relative px-2 py-3 sm:px-3">
        {showEmoji && (
          <div className="absolute bottom-full left-2 right-2 z-30 mb-2 sm:right-auto sm:w-80">
            <EmojiPicker onSelect={insertEmoji} />
            <div className="mt-1 text-right">
              <button onClick={() => setShowEmoji(false)} className="rounded-md bg-white px-2 py-1 text-[11px] text-ink-500 shadow ring-1 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700">
                close
              </button>
            </div>
          </div>
        )}
        <div className="flex items-end gap-1 min-w-0 sm:gap-1.5">
          {!editing && (
            <>
              <IconButton
                ariaLabel="Attach"
                onClick={() => fileRef.current?.click()}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" opacity="0" />
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                }
              />
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) onAddFiles?.(files);
                  e.target.value = '';
                }}
              />
            </>
          )}
          <IconButton
            ariaLabel="Emoji"
            onClick={() => setShowEmoji((v) => !v)}
            active={showEmoji}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            }
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={disabled ? 'Reconnecting…' : editing ? 'Edit your message…' : 'Type a message…'}
            disabled={disabled}
            className="min-w-0 w-0 flex-1 resize-none rounded-2xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm leading-relaxed text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60 sm:px-4 sm:py-2.5 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:placeholder:text-ink-500 dark:focus:border-brand-400 dark:focus:bg-ink-850 dark:focus:ring-brand-400/20"
          />
          {canSchedule && (
            <IconButton
              ariaLabel="Schedule send"
              onClick={() => onSchedule?.(value)}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
            />
          )}
          <button
            onClick={submit}
            disabled={!(value.trim() || (attachments?.length || 0) > 0) || disabled || uploading}
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-brand-glow transition active:scale-95 hover:shadow-soft-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:h-10 sm:w-10"
            aria-label={editing ? 'Save' : 'Send'}
          >
            {editing ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                key={swooshKey}
                viewBox="0 0 24 24"
                className={`h-5 w-5 ${swooshKey > 0 ? 'animate-send-swoosh' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function IconButton({ icon, onClick, ariaLabel, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={clsx(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition hover:bg-ink-100 hover:text-ink-800 active:scale-90 sm:h-10 sm:w-10 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100',
        active && 'bg-ink-100 text-brand-600 dark:bg-ink-800 dark:text-brand-300'
      )}
    >
      <span className="h-5 w-5 block">{icon}</span>
    </button>
  );
}
