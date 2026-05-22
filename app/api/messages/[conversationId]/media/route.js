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
  await connectDB();
  const convo = await Conversation.findById(conversationId);
  if (!convo || !convo.participants.some((p) => p.toString() === userId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const messages = await Message.find({
    conversationId,
    deletedAt: null,
    'attachments.0': { $exists: true },
  })
    .sort({ createdAt: -1 })
    .limit(200);

  // Flatten to one record per attachment for easy gallery rendering.
  const items = [];
  for (const m of messages) {
    for (const a of m.attachments || []) {
      items.push({
        messageId: m._id.toString(),
        sender: m.sender.toString(),
        fileId: a.fileId?.toString(),
        url: a.fileId ? `/api/files/${a.fileId}` : null,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
        width: a.width,
        height: a.height,
        createdAt: m.createdAt,
      });
    }
  }

  return NextResponse.json({ items });
}
