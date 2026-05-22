import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const ScheduledMessage = require('@/lib/models/ScheduledMessage');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const doc = await ScheduledMessage.findById(params.id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (doc.sender.toString() !== userId) {
      return NextResponse.json({ error: 'Not your message' }, { status: 403 });
    }
    if (doc.status !== 'pending') {
      return NextResponse.json({ error: 'Cannot cancel — already processed' }, { status: 409 });
    }
    await doc.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[schedule DELETE]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
