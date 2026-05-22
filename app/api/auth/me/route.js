import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const User = require('@/lib/models/User');
const Friendship = require('@/lib/models/Friendship');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

async function emitProfileUpdateToFriends(userId, payload) {
  try {
    const friendships = await Friendship.find({
      status: 'accepted',
      $or: [{ requester: userId }, { recipient: userId }],
    });
    const onlineUsers = global.__chatmeOnlineUsers;
    const io = global.__chatmeIO;
    if (!onlineUsers || !io) return;
    for (const f of friendships) {
      const friendId =
        f.requester.toString() === String(userId) ? f.recipient : f.requester;
      const set = onlineUsers.get(String(friendId));
      if (!set) continue;
      for (const sid of set) io.to(sid).emit('user:update', payload);
    }
  } catch (err) {
    console.warn('[emit user:update]', err);
  }
}

export async function GET(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ user: user.toPublic() });
}

export async function PATCH(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim();
      if (trimmed.length < 2 || trimmed.length > 30) {
        return NextResponse.json({ error: 'Name must be 2–30 characters' }, { status: 400 });
      }
      if (trimmed !== user.name) {
        const exists = await User.findOne({ name: trimmed });
        if (exists) {
          return NextResponse.json({ error: 'That name is already taken' }, { status: 409 });
        }
        user.name = trimmed;
      }
    }

    if (typeof body.bio === 'string') {
      user.bio = body.bio.trim().slice(0, 140);
    }

    if (body.privacy && typeof body.privacy === 'object') {
      const p = user.privacy || {};
      if (typeof body.privacy.showOnline === 'boolean') p.showOnline = body.privacy.showOnline;
      if (typeof body.privacy.showLastSeen === 'boolean') p.showLastSeen = body.privacy.showLastSeen;
      user.privacy = p;
    }

    await user.save();
    // Broadcast privacy-masked view to friends (they don't see private fields).
    await emitProfileUpdateToFriends(userId, user.toPublicView());
    return NextResponse.json({ user: user.toPublic() });
  } catch (err) {
    console.error('[me PATCH]', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
