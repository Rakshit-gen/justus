'use client';

import { useEffect } from 'react';
import { upsertCachedMessage } from '@/lib/messageCache';

// Centralised wiring for all chat-related socket events. Keeps ChatWindow
// from drowning in `socket.on(...)` calls and ensures cache writes happen
// alongside state updates everywhere a message changes.
export function useChatSocket({
  socket,
  me,
  otherUser,
  conversationId,
  setMessages,
  setOtherTyping,
  setOtherPresence,
  onIncomingMessage,
  onConvoUpdate,
}) {
  useEffect(() => {
    if (!socket) return;

    function isThisChat(msg) {
      return (
        (msg.sender === otherUser.id && msg.recipient === me.id) ||
        (msg.sender === me.id && msg.recipient === otherUser.id)
      );
    }

    function onNew(msg) {
      if (!isThisChat(msg)) {
        onConvoUpdate?.({
          otherUserId: msg.sender === me.id ? msg.recipient : msg.sender,
          newMessage: msg,
        });
        return;
      }
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      upsertCachedMessage(msg.conversationId, msg);
      onConvoUpdate?.({
        otherUserId: msg.sender === me.id ? msg.recipient : msg.sender,
        newMessage: msg,
      });
      onIncomingMessage?.(msg);
    }

    function onUpdated(msg) {
      if (!isThisChat(msg)) return;
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
      upsertCachedMessage(msg.conversationId, msg);
    }

    function onDelivered({ messageId, conversationId: cId, deliveredAt }) {
      if (cId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.status === 'sent'
            ? { ...m, status: 'delivered', deliveredAt }
            : m
        )
      );
    }

    function onSeen({ conversationId: cId, seenAt }) {
      if (cId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.sender === me.id && m.status !== 'seen' ? { ...m, status: 'seen', seenAt } : m
        )
      );
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
  }, [
    socket,
    me.id,
    otherUser.id,
    conversationId,
    setMessages,
    setOtherTyping,
    setOtherPresence,
    onIncomingMessage,
    onConvoUpdate,
  ]);
}
