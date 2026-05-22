'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useSettings } from '@/hooks/useSettings';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { SettingsMenu } from '@/components/SettingsMenu';
import { ProfileEditor } from '@/components/ProfileEditor';
import { AddFriendModal } from '@/components/AddFriendModal';
import { FriendRequestsModal } from '@/components/FriendRequestsModal';
import { FriendActions } from '@/components/FriendActions';
import { api } from '@/lib/apiClient';
import { playMessageSound, showNotification, notificationPermission } from '@/lib/notify';

const DEFAULT_TITLE = 'chatme';

export default function ChatPage() {
  const { auth, loading, logout, updateUser } = useAuth();
  const { socket, connected } = useSocket();
  const { settings } = useSettings();
  const router = useRouter();

  const [friends, setFriends] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [chatSettings, setChatSettings] = useState({});  // { [otherUserId]: { pinned, wallpaper } }
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [activeOther, setActiveOther] = useState(null);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [friendActionsTarget, setFriendActionsTarget] = useState(null);

  const activeOtherIdRef = useRef(null);
  useEffect(() => { activeOtherIdRef.current = activeOther?.id || null; }, [activeOther?.id]);

  useEffect(() => {
    if (!loading && !auth?.token) router.replace('/login');
  }, [auth, loading, router]);

  useEffect(() => {
    if (!auth?.token) return;
    let cancelled = false;
    setBootLoading(true);
    (async () => {
      try {
        const [f, c, r, s] = await Promise.all([
          api('/api/friends'),
          api('/api/conversations'),
          api('/api/friends/requests'),
          api('/api/chat-settings'),
        ]);
        if (cancelled) return;
        setFriends(f.friends);
        setConversations(c.conversations);
        setIncoming(r.incoming);
        setOutgoing(r.outgoing);
        setChatSettings(s.settings || {});
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.token]);

  const totalUnread = useMemo(() => {
    const friendIds = new Set(friends.map((f) => f.id));
    return conversations.reduce(
      (s, c) => (friendIds.has(c.otherUser?.id) ? s + (c.unread || 0) : s),
      0
    );
  }, [conversations, friends]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const tag = incoming.length > 0 ? ` • ${incoming.length} req` : '';
    document.title = totalUnread > 0 ? `(${totalUnread})${tag} ${DEFAULT_TITLE}` : `${tag.trim() ? tag.trim() + ' • ' : ''}${DEFAULT_TITLE}`;
    return () => { document.title = DEFAULT_TITLE; };
  }, [totalUnread, incoming.length]);

  useEffect(() => {
    if (!socket || !auth?.user) return;
    const meId = auth.user.id;

    function onNew(msg) {
      const otherId = msg.sender === meId ? msg.recipient : msg.sender;
      const isActive = activeOtherIdRef.current === otherId;
      const incomingMsg = msg.sender !== meId;
      const tabHidden = typeof document !== 'undefined' && document.visibilityState !== 'visible';
      const bumpUnread = incomingMsg && (!isActive || tabHidden);

      if (incomingMsg) {
        if (settings.soundOn) { try { playMessageSound(); } catch {} }
        if (settings.notificationsOn && tabHidden && notificationPermission() === 'granted') {
          const senderName = friends.find((u) => u.id === otherId)?.name || 'Someone';
          const preview = msg.content || (msg.attachments?.length ? '📎 Attachment' : '');
          showNotification(senderName, { body: preview, tag: `chatme-${otherId}` });
        }
      }

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.otherUser?.id === otherId);
        const previewContent = msg.content || (msg.attachments?.length ? '📎 Attachment' : '');
        if (idx >= 0) {
          const next = [...prev];
          const existing = next[idx];
          next[idx] = {
            ...existing,
            id: msg.conversationId,
            lastMessage: { content: previewContent, sender: msg.sender, createdAt: msg.createdAt },
            unread: bumpUnread ? (existing.unread || 0) + 1 : (existing.unread || 0),
            updatedAt: msg.createdAt,
          };
          const [updated] = next.splice(idx, 1);
          return [updated, ...next];
        }
        const otherFriend = friends.find((u) => u.id === otherId);
        if (!otherFriend) return prev;
        return [
          {
            id: msg.conversationId,
            otherUser: otherFriend,
            lastMessage: { content: previewContent, sender: msg.sender, createdAt: msg.createdAt },
            unread: bumpUnread ? 1 : 0,
            updatedAt: msg.createdAt,
          },
          ...prev,
        ];
      });
    }

    function onUpdated(msg) {
      setConversations((prev) =>
        prev.map((c) => {
          if (!c.lastMessage || new Date(c.lastMessage.createdAt).getTime() !== new Date(msg.createdAt).getTime()) return c;
          if (c.otherUser?.id !== msg.sender && c.otherUser?.id !== msg.recipient) return c;
          const preview = msg.deletedAt ? 'Message deleted' : msg.content || (msg.attachments?.length ? '📎 Attachment' : '');
          return { ...c, lastMessage: { ...c.lastMessage, content: preview } };
        })
      );
    }

    function onPresence({ userId, isOnline, lastSeen }) {
      setFriends((prev) => prev.map((u) =>
        u.id === userId ? { ...u, isOnline, lastSeen: lastSeen ?? u.lastSeen } : u
      ));
      setActiveOther((prev) => (prev && prev.id === userId ? { ...prev, isOnline, lastSeen: lastSeen ?? prev.lastSeen } : prev));
    }

    function onUserUpdate(updatedUser) {
      if (!updatedUser) return;
      if (updatedUser.id === meId) { updateUser(updatedUser); return; }
      setFriends((prev) => prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u)));
      setActiveOther((prev) => (prev && prev.id === updatedUser.id ? { ...prev, ...updatedUser } : prev));
    }

    function onFriendRequestIncoming(req) {
      setIncoming((prev) => (prev.some((r) => r.id === req.id) ? prev : [req, ...prev]));
    }
    function onFriendRequestCancelled({ id }) {
      setIncoming((prev) => prev.filter((r) => r.id !== id));
      setOutgoing((prev) => prev.filter((r) => r.id !== id));
    }
    function onFriendAccepted({ friend }) {
      if (!friend) return;
      setFriends((prev) => (prev.some((f) => f.id === friend.id) ? prev : [...prev, friend]));
      setIncoming((prev) => prev.filter((r) => r.from?.id !== friend.id));
      setOutgoing((prev) => prev.filter((r) => r.to?.id !== friend.id));
    }
    function onFriendRemoved({ userId: removedId }) {
      setFriends((prev) => prev.filter((u) => u.id !== removedId));
      setActiveOther((prev) => (prev && prev.id === removedId ? null : prev));
    }

    socket.on('message:new', onNew);
    socket.on('message:updated', onUpdated);
    socket.on('presence', onPresence);
    socket.on('user:update', onUserUpdate);
    socket.on('friend:request:incoming', onFriendRequestIncoming);
    socket.on('friend:request:cancelled', onFriendRequestCancelled);
    socket.on('friend:accepted', onFriendAccepted);
    socket.on('friend:removed', onFriendRemoved);

    return () => {
      socket.off('message:new', onNew);
      socket.off('message:updated', onUpdated);
      socket.off('presence', onPresence);
      socket.off('user:update', onUserUpdate);
      socket.off('friend:request:incoming', onFriendRequestIncoming);
      socket.off('friend:request:cancelled', onFriendRequestCancelled);
      socket.off('friend:accepted', onFriendAccepted);
      socket.off('friend:removed', onFriendRemoved);
    };
  }, [socket, auth?.user, friends, updateUser, settings.soundOn, settings.notificationsOn]);

  const handleSelectUser = useCallback(async (user) => {
    setActiveOther(user);
    setActiveConvoId(null);
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.otherUser?.id === user.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], unread: 0 };
      return next;
    });
    try {
      const data = await api('/api/conversations', { method: 'POST', body: { otherUserId: user.id } });
      const convo = data.conversation;
      setActiveConvoId(convo.id);
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.otherUser?.id === user.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...convo, unread: 0 };
          return next;
        }
        return [{ ...convo, unread: 0 }, ...prev];
      });
    } catch (err) {
      alert(err.message);
      setActiveOther(null);
    }
  }, []);

  const handleConvoUpdate = useCallback(({ otherUserId, newMessage, resetUnread, conversationId }) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.otherUser?.id === otherUserId);
      if (idx === -1) return prev;
      const next = [...prev];
      const existing = next[idx];
      const updated = { ...existing };
      if (conversationId) updated.id = conversationId;
      if (newMessage) {
        const preview = newMessage.content || (newMessage.attachments?.length ? '📎 Attachment' : '');
        updated.lastMessage = { content: preview, sender: newMessage.sender, createdAt: newMessage.createdAt };
        updated.updatedAt = newMessage.createdAt;
      }
      if (resetUnread) updated.unread = 0;
      next[idx] = updated;
      const [u] = next.splice(idx, 1);
      return [u, ...next];
    });
  }, []);

  const handleTogglePin = useCallback(async (user, currentlyPinned) => {
    const next = !currentlyPinned;
    // Optimistic update
    setChatSettings((prev) => ({
      ...prev,
      [user.id]: { ...(prev[user.id] || {}), otherUserId: user.id, pinned: next },
    }));
    try {
      const data = await api(`/api/chat-settings/${user.id}`, { method: 'PATCH', body: { pinned: next } });
      setChatSettings((prev) => ({ ...prev, [user.id]: data.setting }));
    } catch (e) {
      alert(e.message);
      setChatSettings((prev) => ({
        ...prev,
        [user.id]: { ...(prev[user.id] || {}), pinned: currentlyPinned },
      }));
    }
  }, []);

  const handleChatSettingUpdate = useCallback((setting) => {
    if (!setting?.otherUserId) return;
    setChatSettings((prev) => ({ ...prev, [setting.otherUserId]: setting }));
  }, []);

  if (loading || !auth?.user) return <FullPageSpinner />;

  return (
    <div className="flex h-full w-full overflow-hidden bg-ink-50 dark:bg-ink-950">
      <div className={`${activeOther ? 'hidden md:flex' : 'flex'} h-full w-full md:w-80 flex-col`}>
        <Sidebar
          me={auth.user}
          friends={friends}
          conversations={conversations}
          chatSettings={chatSettings}
          activeOtherUserId={activeOther?.id}
          onSelectUser={handleSelectUser}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenAddFriend={() => setAddFriendOpen(true)}
          onOpenRequests={() => setRequestsOpen(true)}
          onLongPressFriend={(user, isPinned) => setFriendActionsTarget({ user, isPinned })}
          incomingCount={incoming.length}
          connected={connected}
          loading={bootLoading}
        />
      </div>

      <div className={`${activeOther ? 'flex' : 'hidden md:flex'} h-full flex-1 flex-col`}>
        {activeOther ? (
          <ChatWindow
            key={activeOther.id}
            me={auth.user}
            otherUser={activeOther}
            conversationId={activeConvoId}
            chatSetting={chatSettings[activeOther.id]}
            onBack={() => setActiveOther(null)}
            onConvoUpdate={handleConvoUpdate}
            onChatSettingUpdate={handleChatSettingUpdate}
          />
        ) : (
          <EmptyChatState onAdd={() => setAddFriendOpen(true)} hasFriends={friends.length > 0} />
        )}
      </div>

      <SettingsMenu
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        me={auth.user}
        onMeUpdated={(u) => updateUser(u)}
        onOpenProfile={() => setProfileOpen(true)}
        onLogout={logout}
      />
      <ProfileEditor open={profileOpen} onClose={() => setProfileOpen(false)} me={auth.user} onUpdated={(u) => updateUser(u)} />
      <AddFriendModal
        open={addFriendOpen}
        onClose={() => setAddFriendOpen(false)}
        onRequestSent={(req) => setOutgoing((prev) => [req, ...prev])}
        onAutoAccepted={(friend) => {
          if (!friend) return;
          setFriends((prev) => (prev.some((f) => f.id === friend.id) ? prev : [...prev, friend]));
        }}
      />
      <FriendRequestsModal
        open={requestsOpen}
        onClose={() => setRequestsOpen(false)}
        incoming={incoming}
        outgoing={outgoing}
        onAccepted={(friend) => { if (friend) setFriends((prev) => (prev.some((f) => f.id === friend.id) ? prev : [...prev, friend])); }}
        onIncomingRemoved={(id) => setIncoming((prev) => prev.filter((r) => r.id !== id))}
        onOutgoingRemoved={(id) => setOutgoing((prev) => prev.filter((r) => r.id !== id))}
      />
      <FriendActions
        open={Boolean(friendActionsTarget)}
        friend={friendActionsTarget?.user}
        isPinned={friendActionsTarget?.isPinned}
        onClose={() => setFriendActionsTarget(null)}
        onTogglePin={() => handleTogglePin(friendActionsTarget.user, friendActionsTarget.isPinned)}
      />
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="flex h-full items-center justify-center bg-white dark:bg-ink-950">
      <div className="flex items-center gap-2 text-sm text-ink-400 dark:text-ink-500">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-500" />
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-500" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-500" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

function EmptyChatState({ onAdd, hasFriends }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center chat-bg px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-brand-glow">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-ink-800 dark:text-ink-100">
          {hasFriends ? 'Your conversations live here' : 'No friends yet'}
        </h2>
        <p className="mt-1 max-w-xs text-sm text-ink-500 dark:text-ink-400">
          {hasFriends
            ? 'Pick someone from the sidebar to start chatting.'
            : 'Add a friend to start chatting. Both sides need to accept before any messages go through.'}
        </p>
        {!hasFriends && (
          <button
            onClick={onAdd}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 px-4 py-2 text-sm font-medium text-white shadow-brand-glow transition active:scale-[0.99]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add a friend
          </button>
        )}
      </div>
    </div>
  );
}
