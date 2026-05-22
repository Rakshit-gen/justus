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

// POST /api/friends/requests/[id]   → accept
export async function POST(req, { params }) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const f = await Friendship.findById(params.id);
    if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (f.recipient.toString() !== userId) {
      return NextResponse.json({ error: 'Only the recipient can accept' }, { status: 403 });
    }
    if (f.status === 'accepted') {
      return NextResponse.json({ ok: true });
    }
    f.status = 'accepted';
    f.acceptedAt = new Date();
    await f.save();

    const [me, them] = await Promise.all([
      User.findById(userId),
      User.findById(f.requester),
    ]);

    if (them) emitToUser(them._id, 'friend:accepted', { friend: me.toPublicView() });
    emitToUser(userId, 'friend:accepted', { friend: them?.toPublicView?.() });

    return NextResponse.json({
      friendship: { id: f._id.toString(), status: 'accepted' },
      friend: them?.toPublicView?.() || null,
    });
  } catch (err) {
    console.error('[req accept]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE /api/friends/requests/[id]   → decline (recipient) or cancel (requester)
export async function DELETE(req, { params }) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const f = await Friendship.findById(params.id);
    if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (f.status !== 'pending') {
      return NextResponse.json({ error: 'Already accepted — use unfriend' }, { status: 409 });
    }
    const isRequester = f.requester.toString() === userId;
    const isRecipient = f.recipient.toString() === userId;
    if (!isRequester && !isRecipient) {
      return NextResponse.json({ error: 'Not your request' }, { status: 403 });
    }
    await f.deleteOne();

    const otherId = isRequester ? f.recipient : f.requester;
    emitToUser(otherId, 'friend:request:cancelled', {
      id: f._id.toString(),
      byUserId: userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[req delete]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
