import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const Message = require('@/lib/models/Message');
const Conversation = require('@/lib/models/Conversation');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversationId } = params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const before = searchParams.get('before');

  await connectDB();

  const convo = await Conversation.findById(conversationId);
  if (!convo || !convo.participants.some((p) => p.toString() === userId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const query = { conversationId };
  if (before) {
    const cursor = await Message.findById(before).select('createdAt');
    if (cursor) query.createdAt = { $lt: cursor.createdAt };
  }

  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit);
  // Return chronological order (oldest first) for easy rendering.
  const ordered = messages.reverse();

  return NextResponse.json({
    messages: ordered.map((m) => m.toClient()),
    hasMore: messages.length === limit,
  });
}
