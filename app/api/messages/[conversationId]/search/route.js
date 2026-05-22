import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const Message = require('@/lib/models/Message');
const Conversation = require('@/lib/models/Conversation');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req, { params }) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversationId } = params;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ results: [] });

  await connectDB();
  const convo = await Conversation.findById(conversationId);
  if (!convo || !convo.participants.some((p) => p.toString() === userId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const regex = new RegExp(escapeRegex(q), 'i');
  const messages = await Message.find({
    conversationId,
    deletedAt: null,
    content: regex,
  })
    .sort({ createdAt: -1 })
    .limit(50);

  return NextResponse.json({
    results: messages.map((m) => m.toClient()),
    query: q,
  });
}
