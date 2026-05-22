import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const ScheduledMessage = require('@/lib/models/ScheduledMessage');
const User = require('@/lib/models/User');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { recipientId, content, attachments, scheduledFor } = await req.json();

    if (!recipientId || recipientId === userId) {
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }
    const hasContent = content && String(content).trim();
    const hasAtt = Array.isArray(attachments) && attachments.length > 0;
    if (!hasContent && !hasAtt) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }
    const when = new Date(scheduledFor);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    if (when.getTime() < Date.now() + 30 * 1000) {
      return NextResponse.json({ error: 'Schedule at least 30 seconds in the future' }, { status: 400 });
    }

    await connectDB();
    const recipient = await User.findById(recipientId);
    if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });

    const doc = await ScheduledMessage.create({
      sender: userId,
      recipient: recipientId,
      content: hasContent ? String(content).trim() : '',
      attachments: hasAtt ? attachments : [],
      scheduledFor: when,
    });

    return NextResponse.json({ scheduled: doc.toClient() }, { status: 201 });
  } catch (err) {
    console.error('[schedule POST]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const docs = await ScheduledMessage.find({ sender: userId, status: 'pending' })
    .sort({ scheduledFor: 1 });
  return NextResponse.json({ scheduled: docs.map((d) => d.toClient()) });
}
