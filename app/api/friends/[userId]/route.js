import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const Friendship = require('@/lib/models/Friendship');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

// Unfriend / cancel relationship in either direction.
export async function DELETE(req, { params }) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const otherId = params.userId;
  if (!otherId || otherId === userId) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  await connectDB();
  const key = Friendship.pairKey(userId, otherId);
  const removed = await Friendship.findOneAndDelete({ key });
  if (!removed) return NextResponse.json({ error: 'No friendship found' }, { status: 404 });

  try {
    global.__chatmeIO?.to?.(/* no-op */);
    const onlineUsers = global.__chatmeOnlineUsers;
    const set = onlineUsers?.get?.(String(otherId));
    if (set) {
      for (const sid of set) global.__chatmeIO?.to(sid).emit('friend:removed', { userId, friendshipId: removed._id.toString() });
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
