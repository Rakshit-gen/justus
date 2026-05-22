'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UserAvatar } from './UserAvatar';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { MessageActions } from './MessageActions';
import { ScheduleSendModal, ScheduledList } from './ScheduleSendModal';
import { SearchMessagesModal } from './SearchMessagesModal';
import { MediaGalleryModal } from './MediaGalleryModal';
import { WallpaperModal, wallpaperStyle } from './WallpaperModal';
import { Modal } from './Modal';
import { ConfettiBurst, isCelebration } from './Confetti';
import { api } from '@/lib/apiClient';
import { uploadFile, readImageDimensions } from '@/lib/uploadClient';
import { useSocket } from '@/context/SocketContext';
import { formatDayDivider, formatLastSeen, sameDay } from '@/utils/date';

const NEAR_BOTTOM_PX = 120;
const TOP_FETCH_THRESHOLD_PX = 80;

export function ChatWindow({ me, otherUser, conversationId, chatSetting, onBack, onConvoUpdate, onChatSettingUpdate }) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [otherPresence, setOtherPresence] = useState({
    isOnline: otherUser.isOnline,
    lastSeen: otherUser.lastSeen,
  });

  const [pending, setPending] = useState([]);
  const [editing, setEditing] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0); // increment to trigger
  const [highlightId, setHighlightId] = useState(null);
  const [scheduleDraft, setScheduleDraft] = useState('');
  const [clearSignal, setClearSignal] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState([]); // [{ id, x, y }] tap-relative to scroll container

  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const celebratedIdsRef = useRef(new Set());
  const messageRefs = useRef(new Map());

  // Reset on chat switch
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setOtherTyping(false);
    setHasMore(false);
    setPending([]);
    setEditing(null);
    setReplyingTo(null);
    setActionsFor(null);
    setMoreOpen(false);
    setOtherPresence({ isOnline: otherUser.isOnline, lastSeen: otherUser.lastSeen });
    isAtBottomRef.current = true;
    celebratedIdsRef.current = new Set();
    messageRefs.current = new Map();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUser.id]);

  // History load
  useEffect(() => {
    if (!conversationId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await api(`/api/messages/${conversationId}`);
        if (cancelled) return;
        setMessages((current) => {
          const merged = [...data.messages];
          for (const m of current) if (!merged.some((f) => f.id === m.id)) merged.push(m);
          merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          return merged;
        });
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId]);

  // Mark seen (visibility-gated)
  useEffect(() => {
    if (!socket || !conversationId) return;
    const isVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';
    function tryMark() {
      if (!isVisible()) return;
      const hasUnseen = messages.some((m) => m.sender === otherUser.id && m.status !== 'seen');
      if (!hasUnseen) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.sender === otherUser.id && m.status !== 'seen'
            ? { ...m, status: 'seen', seenAt: new Date().toISOString() }
            : m
        )
      );
      socket.emit('message:seen', { conversationId });
      onConvoUpdate?.({ otherUserId: otherUser.id, resetUnread: true });
    }
    tryMark();
    document.addEventListener('visibilitychange', tryMark);
    return () => document.removeEventListener('visibilitychange', tryMark);
  }, [socket, conversationId, messages, otherUser.id, onConvoUpdate]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    function onNew(msg) {
      const involvesThisChat =
        (msg.sender === otherUser.id && msg.recipient === me.id) ||
        (msg.sender === me.id && msg.recipient === otherUser.id);
      if (!involvesThisChat) {
        onConvoUpdate?.({ otherUserId: msg.sender === me.id ? msg.recipient : msg.sender, newMessage: msg });
        return;
      }
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      onConvoUpdate?.({ otherUserId: msg.sender === me.id ? msg.recipient : msg.sender, newMessage: msg });
      maybeCelebrate(msg);
    }

    function onUpdated(msg) {
      const involvesThisChat =
        (msg.sender === otherUser.id && msg.recipient === me.id) ||
        (msg.sender === me.id && msg.recipient === otherUser.id);
      if (!involvesThisChat) return;
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
    }

    function onDelivered({ messageId, conversationId: cId, deliveredAt }) {
      if (cId !== conversationId) return;
      setMessages((prev) => prev.map((m) =>
        m.id === messageId && m.status === 'sent' ? { ...m, status: 'delivered', deliveredAt } : m
      ));
    }

    function onSeen({ conversationId: cId, seenAt }) {
      if (cId !== conversationId) return;
      setMessages((prev) => prev.map((m) =>
        m.sender === me.id && m.status !== 'seen' ? { ...m, status: 'seen', seenAt } : m
      ));
    }

    function onTyping({ userId, isTyping }) {
      if (userId !== otherUser.id) return;
      setOtherTyping(isTyping);
    }

    function onPresence({ userId, isOnline, lastSeen }) {
      if (userId !== otherUser.id) return;
      setOtherPresence((prev) => ({ isOnline, lastSeen: lastSeen ?? prev.lastSeen }));
      if (!isOnline) setOtherTyping(false);
    }

    socket.on('message:new', onNew);
    socket.on('message:updated', onUpdated);
    socket.on('message:delivered', onDelivered);
    socket.on('message:seen', onSeen);
    socket.on('typing', onTyping);
    socket.on('presence', onPresence);

    return () => {
      socket.off('message:new', onNew);
      socket.off('message:updated', onUpdated);
      socket.off('message:delivered', onDelivered);
      socket.off('message:seen', onSeen);
      socket.off('typing', onTyping);
      socket.off('presence', onPresence);
    };
  }, [socket, otherUser.id, me.id, conversationId, onConvoUpdate]);

  // After history loads or new messages arrive, scan for celebration triggers.
  useEffect(() => {
    for (const m of messages) maybeCelebrateInitial(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  function maybeCelebrate(msg) {
    if (!msg || msg.deletedAt || !msg.content) return;
    if (celebratedIdsRef.current.has(msg.id)) return;
    if (!isCelebration(msg.content)) return;
    celebratedIdsRef.current.add(msg.id);
    setConfettiKey((k) => k + 1);
  }
  function maybeCelebrateInitial(msg) {
    // For initial history load, don't fire — only mark as already-celebrated so
    // future arrivals don't duplicate. Confetti only fires for new arrivals.
    if (msg && msg.id) celebratedIdsRef.current.add(msg.id);
  }

  // Smart auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    const mineLast = last && last.sender === me.id;
    if (isAtBottomRef.current || mineLast) el.scrollTop = el.scrollHeight;
  }, [messages.length, otherTyping, me.id]);

  // Older history
  const loadOlder = useCallback(async () => {
    if (!conversationId || loadingMore || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    setLoadingMore(true);
    try {
      const data = await api(`/api/messages/${conversationId}?before=${oldest.id}`);
      setMessages((prev) => {
        const incoming = data.messages.filter((m) => !prev.some((p) => p.id === m.id));
        return [...incoming, ...prev];
      });
      setHasMore(Boolean(data.hasMore));
      requestAnimationFrame(() => {
        if (!el) return;
        el.scrollTop = el.scrollHeight - prevHeight;
      });
    } catch (err) {
      console.error('[loadOlder]', err);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, loadingMore, messages]);

  function handleScroll(e) {
    const el = e.currentTarget;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distFromBottom < NEAR_BOTTOM_PX;
    if (el.scrollTop < TOP_FETCH_THRESHOLD_PX && hasMore && !loadingMore) loadOlder();
  }

  // Files
  const addFiles = useCallback(async (files) => {
    const next = [];
    for (const f of files) {
      const dims = f.type?.startsWith('image/') ? await readImageDimensions(f) : null;
      next.push({
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        previewUrl: f.type?.startsWith('image/') ? URL.createObjectURL(f) : null,
        name: f.name,
        mimeType: f.type,
        size: f.size,
        width: dims?.width,
        height: dims?.height,
        uploading: true,
        fileId: null,
      });
    }
    setPending((prev) => [...prev, ...next]);
    for (const att of next) {
      uploadFile(att.file)
        .then((res) => {
          setPending((prev) => prev.map((p) => p.id === att.id ? { ...p, uploading: false, fileId: res.fileId, width: res.width || p.width, height: res.height || p.height } : p));
        })
        .catch((err) => {
          console.error('[upload]', err);
          setPending((prev) => prev.filter((p) => p.id !== att.id));
          alert(`Failed to upload ${att.name}: ${err.message}`);
        });
    }
  }, []);

  const removeAttachment = useCallback((idx) => {
    setPending((prev) => {
      const out = [...prev];
      const [removed] = out.splice(idx, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return out;
    });
  }, []);

  function handleSend(content) {
    if (editing) {
      socket.emit('message:edit', { messageId: editing.id, content }, (ack) => {
        if (ack?.error) { alert(ack.error); return; }
      });
      setEditing(null);
      return;
    }
    if (!socket) return;
    const attachmentsForServer = pending
      .filter((p) => p.fileId)
      .map((p) => ({ fileId: p.fileId, name: p.name, mimeType: p.mimeType, size: p.size, width: p.width, height: p.height }));
    if (!content && attachmentsForServer.length === 0) return;

    const replyToId = replyingTo?.id || null;
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const optimisticReplyPreview = replyingTo
      ? {
          sender: replyingTo.sender,
          content: (replyingTo.content || '').slice(0, 140),
          type: replyingTo.attachments?.some?.((a) => a.mimeType?.startsWith('image/'))
            ? 'image'
            : (replyingTo.attachments?.length ? 'file' : 'text'),
        }
      : null;
    const optimistic = {
      id: tempId,
      conversationId: conversationId || null,
      sender: me.id,
      recipient: otherUser.id,
      content: content || '',
      attachments: pending.filter((p) => p.fileId).map((p) => ({
        fileId: p.fileId, url: `/api/files/${p.fileId}`, name: p.name, mimeType: p.mimeType, size: p.size, width: p.width, height: p.height,
      })),
      replyTo: replyToId,
      replyPreview: optimisticReplyPreview,
      status: 'sent',
      reactions: {},
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    isAtBottomRef.current = true;
    setMessages((prev) => [...prev, optimistic]);

    for (const p of pending) if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    setPending([]);
    setReplyingTo(null);

    // Self-celebrate when you're the one typing the celebration message :)
    if (content && isCelebration(content)) {
      celebratedIdsRef.current.add(tempId);
      setConfettiKey((k) => k + 1);
    }

    socket.emit('message:send',
      { recipientId: otherUser.id, content, attachments: attachmentsForServer, replyTo: replyToId },
      (ack) => {
        if (ack?.error) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          alert(ack.error);
          return;
        }
        const saved = ack.message;
        // Remember any celebration we already fired against the temp id so we
        // don't double-fire when the saved id replaces it.
        if (celebratedIdsRef.current.has(tempId)) {
          celebratedIdsRef.current.delete(tempId);
          celebratedIdsRef.current.add(saved.id);
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === tempId)) return prev.map((m) => (m.id === tempId ? saved : m));
          if (prev.some((m) => m.id === saved.id)) return prev;
          return [...prev, saved];
        });
        onConvoUpdate?.({ otherUserId: otherUser.id, newMessage: saved, conversationId: saved.conversationId });
      }
    );
  }

  function handleTypingChange(isTyping) {
    if (!socket) return;
    if (isTyping) {
      socket.emit('typing:start', { recipientId: otherUser.id });
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => socket.emit('typing:stop', { recipientId: otherUser.id }), 2000);
    } else {
      clearTimeout(typingTimerRef.current);
      socket.emit('typing:stop', { recipientId: otherUser.id });
    }
  }

  useEffect(() => () => {
    clearTimeout(typingTimerRef.current);
    if (socket) socket.emit('typing:stop', { recipientId: otherUser.id });
  }, [socket, otherUser.id]);

  function toggleReaction(message, emoji) {
    if (!socket) return;
    socket.emit('message:react', { messageId: message.id, emoji });
  }
  function copyMessage(message) {
    if (!message.content) return;
    navigator.clipboard?.writeText(message.content).catch(() => {});
  }
  function deleteMessage(message) {
    if (!socket) return;
    socket.emit('message:delete', { messageId: message.id }, (ack) => {
      if (ack?.error) alert(ack.error);
    });
  }
  function startEdit(message) {
    if (Date.now() - new Date(message.createdAt).getTime() > 5 * 60 * 1000) {
      alert('Edit window expired (5 minutes).');
      return;
    }
    setEditing(message);
  }
  function startReply(message) {
    setReplyingTo(message);
  }
  function handleDoubleTap(message, pos) {
    if (message.deletedAt) return;
    toggleReaction(message, '❤️');
    // Spawn a floating heart from the tap position (relative to chat scroller).
    if (pos && scrollRef.current) {
      const rect = scrollRef.current.getBoundingClientRect();
      const x = pos.x - rect.left;
      const y = pos.y - rect.top;
      const id = `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setFloatingHearts((prev) => [...prev, { id, x, y }]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
      }, 1200);
    }
  }
  function scrollToMessage(id) {
    if (!id) return;
    const el = messageRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 1500);
  }

  // Drag and drop
  function onDragEnter(e) { e.preventDefault(); if (e.dataTransfer?.types?.includes('Files')) setDragOver(true); }
  function onDragOver(e) { e.preventDefault(); }
  function onDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOver(false);
  }
  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) addFiles(files);
  }

  const grouped = useMemo(() => {
    const out = [];
    let lastDate = null;
    let prevSender = null;
    messages.forEach((m, i) => {
      if (!lastDate || !sameDay(lastDate, m.createdAt)) {
        out.push({ type: 'divider', key: `d-${i}-${m.id}`, date: m.createdAt });
        lastDate = m.createdAt;
        prevSender = null;
      }
      const tightenTop = prevSender === m.sender;
      const next = messages[i + 1];
      const tightenBottom = next && next.sender === m.sender && sameDay(m.createdAt, next.createdAt);
      out.push({ type: 'msg', key: m.id, message: m, tightenTop, tightenBottom });
      prevSender = m.sender;
    });
    return out;
  }, [messages]);

  const presenceLabel = otherTyping
    ? 'typing…'
    : otherPresence.isOnline
    ? 'online'
    : formatLastSeen(otherPresence.lastSeen);

  const inputDisabled = !socket || !connected;
  const uploadingAny = pending.some((p) => p.uploading);
  const myReaction = actionsFor ? actionsFor.reactions?.[me.id] : null;

  const wp = wallpaperStyle(chatSetting?.wallpaper);

  return (
    <section className="flex h-full flex-1 flex-col" onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-ink-200 bg-white/80 backdrop-blur px-3 py-3 sm:px-4 dark:border-ink-800 dark:bg-ink-900/80">
        {onBack && (
          <button onClick={onBack} className="md:hidden -ml-1 rounded-md p-1.5 text-ink-500 hover:bg-ink-100 active:scale-90 dark:text-ink-400 dark:hover:bg-ink-800" aria-label="Back">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <UserAvatar name={otherUser.name} color={otherUser.avatarColor} avatarUrl={otherUser.avatarUrl} size={40} online={otherPresence.isOnline} showDot />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">{otherUser.name}</div>
          <div className={`text-xs transition-colors ${otherTyping ? 'text-brand-600 dark:text-brand-400' : otherPresence.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400 dark:text-ink-500'}`}>
            {presenceLabel}
          </div>
        </div>
        {!connected && socket && (
          <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
            reconnecting…
          </span>
        )}
        <button
          onClick={() => setScheduledOpen(true)}
          className="rounded-md p-1.5 text-ink-500 transition active:scale-90 hover:bg-ink-100 hover:text-ink-700 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          aria-label="Scheduled"
          title="Scheduled"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
        <button
          onClick={() => setMoreOpen(true)}
          className="rounded-md p-1.5 text-ink-500 transition active:scale-90 hover:bg-ink-100 hover:text-ink-700 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          aria-label="More"
          title="More"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>

      {/* Messages with optional custom wallpaper */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`relative flex-1 overflow-y-auto px-3 py-4 sm:px-6 ${wp.className}`}
        style={{ overscrollBehavior: 'contain', ...wp.style }}
      >
        {loadingMore && (
          <div className="mb-2 flex justify-center">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-ink-500 shadow-soft ring-1 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700">
              Loading older…
            </span>
          </div>
        )}
        {loading ? (
          <MessagesSkeleton />
        ) : grouped.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-ink-400 dark:text-ink-500">
            <div className="mb-2 text-4xl">👋</div>
            <div className="text-sm">Say hi to {otherUser.name}</div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {grouped.map((item) =>
              item.type === 'divider' ? (
                <div key={item.key} className="my-3 flex items-center justify-center">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-ink-500 shadow-soft ring-1 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700">
                    {formatDayDivider(item.date)}
                  </span>
                </div>
              ) : (
                <div key={item.key} className={item.tightenTop ? 'mt-0.5' : 'mt-2.5'}>
                  <MessageBubble
                    message={item.message}
                    isMine={item.message.sender === me.id}
                    myId={me.id}
                    otherUserName={otherUser.name}
                    tightenTop={item.tightenTop}
                    tightenBottom={item.tightenBottom}
                    bubbleRef={(el) => {
                      if (el) messageRefs.current.set(item.message.id, el);
                      else messageRefs.current.delete(item.message.id);
                    }}
                    highlight={highlightId === item.message.id}
                    onLongPress={(m) => setActionsFor(m)}
                    onToggleReaction={(emoji) => toggleReaction(item.message, emoji)}
                    onDoubleTap={(m, pos) => handleDoubleTap(m, pos)}
                    onQuoteClick={(id) => scrollToMessage(id)}
                  />
                </div>
              )
            )}
            {otherTyping && <div className="pt-2"><TypingIndicator /></div>}
          </div>
        )}

        {/* Floating hearts spawned by double-tap. Positioned absolutely
            relative to the scroll container; pointer-events-none so they
            never block clicks. */}
        {floatingHearts.map((h) => (
          <span
            key={h.id}
            className="pointer-events-none absolute select-none text-3xl animate-heart-float"
            style={{ left: h.x, top: h.y }}
            aria-hidden
          >
            ❤️
          </span>
        ))}

        {dragOver && (
          <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50/80 text-brand-700 backdrop-blur-sm dark:border-brand-400/70 dark:bg-brand-500/15 dark:text-brand-200">
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="mt-2 text-sm font-medium">Drop to attach</div>
            </div>
          </div>
        )}
      </div>

      {/* Reply banner above input */}
      {replyingTo && (
        <div className="flex items-start gap-2 border-t border-ink-200 bg-brand-50 px-4 py-2 text-xs dark:border-ink-800 dark:bg-brand-500/10">
          <div className="mt-0.5 h-full w-1 shrink-0 rounded bg-brand-500 dark:bg-brand-400" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold text-brand-700 dark:text-brand-300">
              Replying to {replyingTo.sender === me.id ? 'yourself' : otherUser.name}
            </div>
            <div className="truncate text-ink-600 dark:text-ink-300">
              {replyingTo.content ||
                (replyingTo.attachments?.some((a) => a.mimeType?.startsWith('image/'))
                  ? '📷 Photo'
                  : replyingTo.attachments?.length ? '📎 Attachment' : '(empty)')}
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="shrink-0 rounded-md p-1 text-ink-500 transition active:scale-90 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
            aria-label="Cancel reply"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <MessageInput
        onSend={handleSend}
        onSchedule={(currentValue) => {
          setScheduleDraft(currentValue || '');
          setScheduleOpen(true);
        }}
        onTypingChange={handleTypingChange}
        disabled={inputDisabled}
        attachments={pending}
        onAddFiles={addFiles}
        onRemoveAttachment={removeAttachment}
        uploading={uploadingAny}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        clearSignal={clearSignal}
      />

      <MessageActions
        open={Boolean(actionsFor)}
        message={actionsFor}
        isMine={actionsFor ? actionsFor.sender === me.id : false}
        myReaction={myReaction}
        onClose={() => setActionsFor(null)}
        onReact={(emoji) => toggleReaction(actionsFor, emoji)}
        onReply={() => startReply(actionsFor)}
        onCopy={() => copyMessage(actionsFor)}
        onEdit={() => startEdit(actionsFor)}
        onDelete={() => deleteMessage(actionsFor)}
      />

      <ScheduleSendModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        otherUser={otherUser}
        content={scheduleDraft}
        attachments={pending.filter((p) => p.fileId).map((p) => ({ fileId: p.fileId, name: p.name, mimeType: p.mimeType, size: p.size, width: p.width, height: p.height }))}
        onClear={() => {
          setPending([]);
          setScheduleDraft('');
          setClearSignal((c) => c + 1);
        }}
      />
      <ScheduledList open={scheduledOpen} onClose={() => setScheduledOpen(false)} otherUser={otherUser} />

      {/* Chat header more menu */}
      <ChatMore
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onSearch={() => { setMoreOpen(false); setSearchOpen(true); }}
        onMedia={() => { setMoreOpen(false); setMediaOpen(true); }}
        onWallpaper={() => { setMoreOpen(false); setWallpaperOpen(true); }}
      />

      <SearchMessagesModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        conversationId={conversationId}
        otherUserName={otherUser.name}
        myId={me.id}
        onJump={(id) => scrollToMessage(id)}
      />
      <MediaGalleryModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        conversationId={conversationId}
      />
      <WallpaperModal
        open={wallpaperOpen}
        onClose={() => setWallpaperOpen(false)}
        otherUser={otherUser}
        current={chatSetting}
        onSaved={(setting) => onChatSettingUpdate?.(setting)}
      />

      {confettiKey > 0 && (
        <ConfettiBurst key={confettiKey} onDone={() => { /* will unmount via key bump */ }} />
      )}
    </section>
  );
}

function ChatMore({ open, onClose, onSearch, onMedia, onWallpaper }) {
  return (
    <ModalHeaderMenu open={open} onClose={onClose}>
      <MenuItem
        label="Search messages"
        icon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        }
        onClick={onSearch}
      />
      <MenuItem
        label="Photos & files"
        icon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        }
        onClick={onMedia}
      />
      <MenuItem
        label="Wallpaper"
        icon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19.4 15a1.65 1.65 0 0 1-1.4-1.55v-3.9c0-.85.6-1.55 1.4-1.55h.6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h.6c.8 0 1.4.7 1.4 1.55v3.9C6 14.3 5.4 15 4.6 15H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z" />
          </svg>
        }
        onClick={onWallpaper}
      />
    </ModalHeaderMenu>
  );
}

// Small action-sheet helper — just an unlabeled Modal.
function ModalHeaderMenu({ open, onClose, children }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-1">{children}</div>
    </Modal>
  );
}

function MenuItem({ label, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink-700 transition active:scale-[0.98] hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
    >
      <span className="text-ink-500 dark:text-ink-400">{icon}</span>
      {label}
    </button>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex justify-start"><div className="h-9 w-40 rounded-2xl skeleton ring-1 ring-ink-200 dark:ring-ink-700" /></div>
      <div className="flex justify-end"><div className="h-9 w-56 rounded-2xl skeleton opacity-70" /></div>
      <div className="flex justify-start"><div className="h-9 w-32 rounded-2xl skeleton ring-1 ring-ink-200 dark:ring-ink-700" /></div>
      <div className="flex justify-end"><div className="h-9 w-44 rounded-2xl skeleton opacity-70" /></div>
    </div>
  );
}
