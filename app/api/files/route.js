import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const { uploadBuffer } = require('@/lib/gridfs');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get('file');
    const widthRaw = form.get('width');
    const heightRaw = form.get('height');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 });
    }

    await connectDB();
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = await uploadBuffer(buffer, {
      filename: file.name,
      contentType: file.type,
      metadata: { uploadedBy: userId },
    });

    return NextResponse.json({
      fileId: String(fileId),
      url: `/api/files/${fileId}`,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      width: widthRaw ? Number(widthRaw) : undefined,
      height: heightRaw ? Number(heightRaw) : undefined,
    });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
