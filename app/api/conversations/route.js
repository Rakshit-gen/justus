import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const Conversation = require('@/lib/models/Conversation');
const Message = require('@/lib/models/Message'); // required so Mongoose has it registered when findOrCreateBetween runs
const User = require('@/lib/models/User');
const Friendship = require('@/lib/models/Friendship');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const convos = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate('participants', 'name avatarColor avatarFileId bio privacy isOnline lastSeen');

  const items = convos.map((c) => {
    const other = c.participants.find((p) => p._id.toString() !== userId);
    const unread = c.unread?.get?.(userId) || 0;
    const otherView = other && typeof other.toPublicView === 'function' ? other.toPublicView() : null;
    return {
      id: c._id.toString(),
      otherUser: otherView,
      lastMessage: c.lastMessage?.content
        ? {
            content: c.lastMessage.content,
            sender: c.lastMessage.sender?.toString(),
            createdAt: c.lastMessage.createdAt,
          }
        : null,
      unread,
      updatedAt: c.updatedAt,
    };
  });

  // Deduplicate per otherUser — keeps the sidebar clean if pre-key duplicate
  // conversations exist in the DB. Lazy merge in findOrCreateBetween will
  // eventually consolidate them on disk; this just hides the symptom.
  const seen = new Map();
  for (const item of items) {
    if (!item.otherUser) continue;
    const cur = seen.get(item.otherUser.id);
    if (!cur || new Date(item.updatedAt) > new Date(cur.updatedAt)) {
      seen.set(item.otherUser.id, item);
    }
  }

  return NextResponse.json({ conversations: Array.from(seen.values()) });
}

// Open or create a 1-to-1 conversation with another user.
export async function POST(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { otherUserId } = await req.json();
  if (!otherUserId || otherUserId === userId) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  await connectDB();
  const other = await User.findById(otherUserId);
  if (!other) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const friends = await Friendship.areFriends(userId, otherUserId);
  if (!friends) {
    return NextResponse.json({ error: 'You are not friends with this user' }, { status: 403 });
  }

  const convo = await Conversation.findOrCreateBetween(userId, otherUserId);

  return NextResponse.json({
    conversation: {
      id: convo._id.toString(),
      otherUser: other.toPublicView(),
      lastMessage: convo.lastMessage?.content
        ? {
            content: convo.lastMessage.content,
            sender: convo.lastMessage.sender?.toString(),
            createdAt: convo.lastMessage.createdAt,
          }
        : null,
      unread: convo.unread?.get?.(userId) || 0,
      updatedAt: convo.updatedAt,
    },
  });
}
