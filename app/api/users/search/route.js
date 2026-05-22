import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const User = require('@/lib/models/User');
const Friendship = require('@/lib/models/Friendship');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 1) return NextResponse.json({ results: [] });

  await connectDB();
  const regex = new RegExp(escapeRegex(q), 'i');
  const users = await User.find({ name: regex, _id: { $ne: userId } })
    .sort({ name: 1 })
    .limit(20);

  if (users.length === 0) return NextResponse.json({ results: [] });

  // Look up friendship status for each result.
  const keys = users.map((u) => Friendship.pairKey(userId, u._id));
  const friendships = await Friendship.find({ key: { $in: keys } });
  const byKey = new Map(friendships.map((f) => [f.key, f]));

  const results = users.map((u) => {
    const pub = u.toPublicView();
    const f = byKey.get(Friendship.pairKey(userId, u._id));
    let status = 'none';
    let friendshipId = null;
    if (f) {
      friendshipId = f._id.toString();
      if (f.status === 'accepted') status = 'accepted';
      else if (f.requester.toString() === userId) status = 'pending_outgoing';
      else status = 'pending_incoming';
    }
    return { ...pub, friendshipStatus: status, friendshipId };
  });

  return NextResponse.json({ results });
}
