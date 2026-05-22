import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const Friendship = require('@/lib/models/Friendship');
const User = require('@/lib/models/User');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

function emitToUser(userId, event, payload) {
  try {
    const onlineUsers = global.__chatmeOnlineUsers;
    const set = onlineUsers?.get?.(String(userId));
    if (!set) return;
    for (const sid of set) global.__chatmeIO?.to(sid).emit(event, payload);
  } catch (err) {
    console.warn('[emit]', err);
  }
}

// POST /api/friends/requests
// Body: { recipientId } OR { name }
export async function POST(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { recipientId, name } = await req.json();
    await connectDB();

    let recipient = null;
    if (recipientId) {
      recipient = await User.findById(recipientId);
    } else if (name) {
      recipient = await User.findOne({ name: String(name).trim() });
    }
    if (!recipient) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (recipient._id.toString() === userId) {
      return NextResponse.json({ error: "You can't friend yourself" }, { status: 400 });
    }

    const key = Friendship.pairKey(userId, recipient._id);
    const existing = await Friendship.findOne({ key });

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json({ error: 'You are already friends' }, { status: 409 });
      }
      // If the OTHER side already sent me a request, auto-accept it.
      if (existing.recipient.toString() === userId) {
        existing.status = 'accepted';
        existing.acceptedAt = new Date();
        await existing.save();

        const me = await User.findById(userId);
        // Tell both sides we're now friends
        emitToUser(existing.requester, 'friend:accepted', { friend: me.toPublicView() });
        emitToUser(userId, 'friend:accepted', { friend: recipient.toPublicView() });

        return NextResponse.json({
          friendship: { id: existing._id.toString(), status: 'accepted' },
          friend: recipient.toPublicView(),
          autoAccepted: true,
        });
      }
      // Else I already requested them — idempotent.
      return NextResponse.json({ error: 'Request already sent' }, { status: 409 });
    }

    const doc = await Friendship.create({
      key,
      requester: userId,
      recipient: recipient._id,
      status: 'pending',
    });

    const me = await User.findById(userId);
    emitToUser(recipient._id, 'friend:request:incoming', {
      id: doc._id.toString(),
      from: me.toPublicView(),
      createdAt: doc.createdAt,
    });

    return NextResponse.json({
      request: {
        id: doc._id.toString(),
        to: recipient.toPublicView(),
        status: 'pending',
        createdAt: doc.createdAt,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[friend req POST]', err);
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
  }
}

// GET /api/friends/requests
// Returns { incoming, outgoing }
export async function GET(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const pending = await Friendship.find({
    status: 'pending',
    $or: [{ requester: userId }, { recipient: userId }],
  }).sort({ createdAt: -1 });

  const userIds = new Set();
  for (const f of pending) {
    userIds.add(f.requester.toString());
    userIds.add(f.recipient.toString());
  }
  userIds.delete(userId);

  const users = userIds.size
    ? await User.find({ _id: { $in: Array.from(userIds) } })
    : [];
  const byId = new Map(users.map((u) => [u._id.toString(), u.toPublicView()]));

  const incoming = [];
  const outgoing = [];
  for (const f of pending) {
    if (f.recipient.toString() === userId) {
      incoming.push({
        id: f._id.toString(),
        from: byId.get(f.requester.toString()),
        createdAt: f.createdAt,
      });
    } else {
      outgoing.push({
        id: f._id.toString(),
        to: byId.get(f.recipient.toString()),
        createdAt: f.createdAt,
      });
    }
  }

  return NextResponse.json({ incoming, outgoing });
}
