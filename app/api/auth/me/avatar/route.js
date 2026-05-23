import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const User = require('@/lib/models/User');
const Friendship = require('@/lib/models/Friendship');
const { requireUserId } = require('@/lib/auth');
const { uploadBuffer, deleteFile } = require('@/lib/gridfs');

export const dynamic = 'force-dynamic';

// Friends get the privacy-masked view; my own other sessions get the full one.
async function emitProfileUpdate(userId, publicViewPayload, selfPayload) {
  try {
    const onlineUsers = global.__chatmeOnlineUsers;
    const io = global.__chatmeIO;
    if (!onlineUsers || !io) return;

    const friendships = await Friendship.find({
      status: 'accepted',
      $or: [{ requester: userId }, { recipient: userId }],
    });
    for (const f of friendships) {
      const friendId =
        f.requester.toString() === String(userId) ? f.recipient : f.requester;
      const set = onlineUsers.get(String(friendId));
      if (!set) continue;
      for (const sid of set) io.to(sid).emit('user:update', publicViewPayload);
    }

    const ownSockets = onlineUsers.get(String(userId));
    if (ownSockets) {
      for (const sid of ownSockets) io.to(sid).emit('user:update', selfPayload);
    }
  } catch (err) {
    console.warn('[emit user:update]', err);
  }
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.type?.startsWith('image/')) {
      return NextResponse.json({ error: 'Avatar must be an image' }, { status: 400 });
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 5 MB)' }, { status: 413 });
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = await uploadBuffer(buffer, {
      filename: `avatar-${userId}-${Date.now()}`,
      contentType: file.type,
      metadata: { kind: 'avatar', userId },
    });

    const oldFileId = user.avatarFileId;
    user.avatarFileId = fileId;
    await user.save();

    if (oldFileId) {
      try { await deleteFile(oldFileId); } catch (e) { /* best-effort */ }
    }

    await emitProfileUpdate(userId, user.toPublicView(), user.toPublic());

    return NextResponse.json({ user: user.toPublic() });
  } catch (err) {
    console.error('[avatar upload]', err);
    return NextResponse.json({ error: 'Avatar upload failed' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const oldFileId = user.avatarFileId;
    user.avatarFileId = null;
    await user.save();
    if (oldFileId) {
      try { await deleteFile(oldFileId); } catch {}
    }
    await emitProfileUpdate(userId, user.toPublicView(), user.toPublic());
    return NextResponse.json({ user: user.toPublic() });
  } catch (err) {
    console.error('[avatar delete]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
