import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const ChatSetting = require('@/lib/models/ChatSetting');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const otherUserId = params.otherUserId;
  if (!otherUserId || otherUserId === userId) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  try {
    const body = await req.json();
    await connectDB();

    const update = {};
    if (typeof body.pinned === 'boolean') update.pinned = body.pinned;
    if (body.wallpaper && typeof body.wallpaper === 'object') {
      const kind = body.wallpaper.kind;
      const value = body.wallpaper.value;
      if (kind === null || kind === 'none') {
        update.wallpaper = { kind: 'none', value: '' };
      } else if ((kind === 'preset' || kind === 'image') && typeof value === 'string') {
        update.wallpaper = { kind, value };
      } else {
        return NextResponse.json({ error: 'Invalid wallpaper' }, { status: 400 });
      }
    } else if (body.wallpaper === null) {
      update.wallpaper = { kind: 'none', value: '' };
    }

    const doc = await ChatSetting.findOneAndUpdate(
      { user: userId, otherUser: otherUserId },
      { $set: update, $setOnInsert: { user: userId, otherUser: otherUserId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ setting: doc.toClient() });
  } catch (err) {
    console.error('[chat-settings PATCH]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
