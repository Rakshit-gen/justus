import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const ChatSetting = require('@/lib/models/ChatSetting');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const docs = await ChatSetting.find({ user: userId });
  const map = {};
  for (const d of docs) map[d.otherUser.toString()] = d.toClient();
  return NextResponse.json({ settings: map });
}
