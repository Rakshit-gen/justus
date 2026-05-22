import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const Friendship = require('@/lib/models/Friendship');
const User = require('@/lib/models/User');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const friendships = await Friendship.find({
    status: 'accepted',
    $or: [{ requester: userId }, { recipient: userId }],
  });

  const friendIds = friendships.map((f) =>
    f.requester.toString() === userId ? f.recipient : f.requester
  );

  const users = friendIds.length ? await User.find({ _id: { $in: friendIds } }) : [];
  return NextResponse.json({ friends: users.map((u) => u.toPublicView()) });
}
