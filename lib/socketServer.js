const mongoose = require('mongoose');
const { verifyToken } = require('./auth');
const { connectDB } = require('./db');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const ScheduledMessage = require('./models/ScheduledMessage');
const Friendship = require('./models/Friendship');
const { sendToUser: sendPush } = require('./webpush');

const EDIT_WINDOW_MS = 5 * 60 * 1000;
const SCHEDULER_INTERVAL_MS = 30 * 1000;

// userId -> Set of socket ids
const onlineUsers = new Map();

function addSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function removeSocket(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return 0;
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
  return set.size;
}

function isOnline(userId) {
  return onlineUsers.has(String(userId));
}

function emitToUser(io, userId, event, payload) {
  const set = onlineUsers.get(String(userId));
  if (!set) return;
  for (const sid of set) io.to(sid).emit(event, payload);
}

// Deliver a message — persist, update conversation, emit to participants.
// Used by both the real-time send handler and the scheduled-message worker.
async function deliverMessage(io, { senderId, recipientId, content, attachments, replyTo, excludeSocketId }) {
  const convo = await Conversation.findOrCreateBetween(senderId, recipientId);
  const recipientOnline = isOnline(recipientId);
  const now = new Date();

  // Build reply snapshot if replying to a real message in this convo.
  let replyToId = null;
  let replyPreview = null;
  if (replyTo) {
    const original = await Message.findById(replyTo);
    if (
      original &&
      original.conversationId.toString() === convo._id.toString() &&
      !original.deletedAt
    ) {
      replyToId = original._id;
      const hasImg = (original.attachments || []).some((a) => a.mimeType?.startsWith('image/'));
      const hasFile = (original.attachments || []).length > 0;
      const type = original.content
        ? 'text'
        : hasImg
          ? 'image'
          : hasFile
            ? 'file'
            : 'text';
      const snippet = (original.content || '').slice(0, 140);
      replyPreview = {
        sender: original.sender,
        content: snippet,
        type,
      };
    }
  }

  const message = await Message.create({
    conversationId: convo._id,
    sender: senderId,
    recipient: recipientId,
    content: content || '',
    attachments: attachments || [],
    replyTo: replyToId,
    replyPreview,
    status: recipientOnline ? 'delivered' : 'sent',
    deliveredAt: recipientOnline ? now : null,
  });

  const recipUnread = (convo.unread?.get?.(String(recipientId)) || 0) + 1;
  convo.unread.set(String(recipientId), recipUnread);
  const previewContent =
    content || (attachments?.length ? `📎 ${attachments.length === 1 ? 'Attachment' : `${attachments.length} attachments`}` : '');
  convo.lastMessage = {
    content: previewContent,
    sender: senderId,
    createdAt: message.createdAt,
  };
  await convo.save();

  const payload = message.toClient();

  // Emit to sender's other tabs
  const senderSockets = onlineUsers.get(String(senderId));
  if (senderSockets) {
    for (const sid of senderSockets) {
      if (sid === excludeSocketId) continue;
      io.to(sid).emit('message:new', payload);
    }
  }
  // Emit to recipient
  if (recipientOnline) emitToUser(io, recipientId, 'message:new', payload);

  // If recipient is offline, fire a web push so they get an OS-level
  // notification even when the browser is closed.
  if (!recipientOnline) {
    try {
      const senderUser = await User.findById(senderId);
      const senderName = senderUser?.name || 'Someone';
      const preview = content ||
        (attachments?.length ? `📎 ${attachments.length === 1 ? 'Photo or file' : `${attachments.length} attachments`}` : '');
      sendPush(recipientId, {
        title: senderName,
        body: preview.slice(0, 200),
        tag: `chatme-${senderId}`,
        url: '/chat',
      }).catch((err) => console.warn('[push] send failed', err?.message));
    } catch (err) {
      console.warn('[push] dispatch failed', err);
    }
  }

  return { message, payload, recipientOnline };
}

function initSocket(io) {
  global.__chatmeIO = io;
  global.__chatmeOnlineUsers = onlineUsers;
  global.__chatmeDeliverMessage = (args) => deliverMessage(io, args);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    const payload = verifyToken(token);
    if (!payload?.sub) return next(new Error('Unauthorized'));
    socket.userId = payload.sub;
    next();
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    addSocket(userId, socket.id);

    try {
      await connectDB();
      const meUser = await User.findByIdAndUpdate(userId, { isOnline: true }, { new: true });
      // Respect privacy.showOnline — if they've turned it off, others see them as offline.
      const broadcastOnline = meUser?.privacy?.showOnline !== false;
      socket.broadcast.emit('presence', { userId, isOnline: broadcastOnline });

      const undelivered = await Message.find({ recipient: userId, status: 'sent' });
      if (undelivered.length) {
        const now = new Date();
        await Message.updateMany(
          { _id: { $in: undelivered.map((m) => m._id) } },
          { $set: { status: 'delivered', deliveredAt: now } }
        );
        for (const m of undelivered) {
          emitToUser(io, m.sender, 'message:delivered', {
            messageId: m._id.toString(),
            conversationId: m.conversationId.toString(),
            deliveredAt: now,
          });
        }
      }
    } catch (err) {
      console.error('[socket connect]', err);
    }

    socket.on('message:send', async ({ recipientId, content, attachments, replyTo }, ack) => {
      try {
        if (!recipientId) return ack?.({ error: 'No recipient' });
        const hasContent = content && String(content).trim();
        const hasAtt = Array.isArray(attachments) && attachments.length > 0;
        if (!hasContent && !hasAtt) return ack?.({ error: 'Empty message' });

        await connectDB();

        // Friendship gate: both parties must be accepted friends.
        const friends = await Friendship.areFriends(userId, recipientId);
        if (!friends) return ack?.({ error: 'You are not friends with this user' });

        const { payload } = await deliverMessage(io, {
          senderId: userId,
          recipientId,
          content: hasContent ? String(content).trim() : '',
          attachments: hasAtt ? attachments : [],
          replyTo: replyTo || null,
          excludeSocketId: socket.id,
        });
        ack?.({ message: payload });
      } catch (err) {
        console.error('[message:send]', err);
        ack?.({ error: 'Failed to send' });
      }
    });

    socket.on('message:edit', async ({ messageId, content }, ack) => {
      try {
        if (!content || !String(content).trim()) return ack?.({ error: 'Empty' });
        await connectDB();
        const msg = await Message.findById(messageId);
        if (!msg) return ack?.({ error: 'Not found' });
        if (msg.sender.toString() !== userId) return ack?.({ error: 'Not your message' });
        if (msg.deletedAt) return ack?.({ error: 'Deleted' });
        if (Date.now() - new Date(msg.createdAt).getTime() > EDIT_WINDOW_MS) {
          return ack?.({ error: 'Edit window expired' });
        }
        msg.content = String(content).trim();
        msg.editedAt = new Date();
        await msg.save();
        const payload = msg.toClient();
        ack?.({ message: payload });
        emitToUser(io, msg.sender, 'message:updated', payload);
        emitToUser(io, msg.recipient, 'message:updated', payload);
      } catch (err) {
        console.error('[edit]', err);
        ack?.({ error: 'Edit failed' });
      }
    });

    socket.on('message:delete', async ({ messageId }, ack) => {
      try {
        await connectDB();
        const msg = await Message.findById(messageId);
        if (!msg) return ack?.({ error: 'Not found' });
        if (msg.sender.toString() !== userId) return ack?.({ error: 'Not your message' });
        if (msg.deletedAt) { ack?.({ message: msg.toClient() }); return; }
        msg.deletedAt = new Date();
        msg.content = '';
        msg.attachments = [];
        msg.reactions = new Map();
        await msg.save();
        const payload = msg.toClient();
        ack?.({ message: payload });
        emitToUser(io, msg.sender, 'message:updated', payload);
        emitToUser(io, msg.recipient, 'message:updated', payload);
      } catch (err) {
        console.error('[delete]', err);
        ack?.({ error: 'Delete failed' });
      }
    });

    socket.on('message:react', async ({ messageId, emoji }, ack) => {
      try {
        if (!emoji) return ack?.({ error: 'No emoji' });
        await connectDB();
        const msg = await Message.findById(messageId);
        if (!msg || msg.deletedAt) return ack?.({ error: 'Not found' });
        if (
          msg.sender.toString() !== userId &&
          msg.recipient.toString() !== userId
        ) return ack?.({ error: 'Not allowed' });

        // Friendship gate
        const otherId = msg.sender.toString() === userId ? msg.recipient : msg.sender;
        const friends = await Friendship.areFriends(userId, otherId);
        if (!friends) return ack?.({ error: 'You are no longer friends' });

        const existing = msg.reactions.get(userId);
        if (existing === emoji) {
          msg.reactions.delete(userId);
        } else {
          msg.reactions.set(userId, emoji);
        }
        await msg.save();
        const payload = msg.toClient();
        ack?.({ message: payload });
        emitToUser(io, msg.sender, 'message:updated', payload);
        if (msg.recipient.toString() !== msg.sender.toString()) {
          emitToUser(io, msg.recipient, 'message:updated', payload);
        }
      } catch (err) {
        console.error('[react]', err);
        ack?.({ error: 'React failed' });
      }
    });

    socket.on('message:seen', async ({ conversationId }) => {
      try {
        await connectDB();
        const convo = await Conversation.findById(conversationId);
        if (!convo || !convo.participants.some((p) => p.toString() === userId)) return;

        const now = new Date();
        const result = await Message.updateMany(
          { conversationId, recipient: userId, status: { $ne: 'seen' } },
          [
            {
              $set: {
                status: 'seen',
                seenAt: now,
                deliveredAt: { $ifNull: ['$deliveredAt', now] },
              },
            },
          ]
        );

        if (result.modifiedCount > 0) {
          convo.unread.set(String(userId), 0);
          await convo.save();

          const otherId = convo.participants
            .map(String)
            .find((p) => p !== String(userId));
          if (otherId) {
            emitToUser(io, otherId, 'message:seen', {
              conversationId: String(conversationId),
              seenAt: now,
              byUserId: userId,
            });
          }
        }
      } catch (err) {
        console.error('[message:seen]', err);
      }
    });

    socket.on('typing:start', ({ recipientId }) => {
      if (!recipientId) return;
      emitToUser(io, recipientId, 'typing', { userId, isTyping: true });
    });
    socket.on('typing:stop', ({ recipientId }) => {
      if (!recipientId) return;
      emitToUser(io, recipientId, 'typing', { userId, isTyping: false });
    });

    socket.on('disconnect', async () => {
      const remaining = removeSocket(userId, socket.id);
      if (remaining === 0) {
        try {
          await connectDB();
          const lastSeen = new Date();
          const meUser = await User.findByIdAndUpdate(
            userId,
            { isOnline: false, lastSeen },
            { new: true }
          );
          // Only include lastSeen in the broadcast if the user opted in.
          const exposeLastSeen = meUser?.privacy?.showLastSeen !== false;
          socket.broadcast.emit('presence', {
            userId,
            isOnline: false,
            lastSeen: exposeLastSeen ? lastSeen : null,
          });
        } catch (err) {
          console.error('[disconnect]', err);
        }
      }
    });
  });

  // Scheduled message worker — every 30 s, promote any due scheduled messages
  // into real messages via the shared deliverMessage path.
  setInterval(async () => {
    try {
      await connectDB();
      const due = await ScheduledMessage.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() },
      });
      for (const s of due) {
        try {
          const { message } = await deliverMessage(io, {
            senderId: s.sender.toString(),
            recipientId: s.recipient.toString(),
            content: s.content,
            attachments: s.attachments || [],
          });
          s.status = 'sent';
          s.sentMessageId = message._id;
          await s.save();
          emitToUser(io, s.sender, 'scheduled:sent', { id: s._id.toString(), messageId: message._id.toString() });
        } catch (err) {
          console.error('[scheduler] failed to deliver', err);
          s.status = 'failed';
          s.error = err.message;
          await s.save();
        }
      }
    } catch (err) {
      console.error('[scheduler tick]', err);
    }
  }, SCHEDULER_INTERVAL_MS);
}

module.exports = { initSocket };
