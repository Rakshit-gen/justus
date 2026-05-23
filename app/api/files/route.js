import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const { uploadBuffer } = require('@/lib/gridfs');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB raw upload cap
const RESIZE_LONGEST_EDGE = 1920;   // downsize anything bigger than this
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;

// Light wrapper around `sharp` that no-ops cleanly if the package fails to
// load (e.g. on a host where the native binary isn't available). The upload
// still succeeds — we just store the original file.
async function processImage(buffer, mimeType) {
  try {
    const sharp = require('sharp');
    // GIFs may be animated — don't touch them.
    if (mimeType === 'image/gif') return null;

    const image = sharp(buffer, { failOn: 'none' });
    const meta = await image.metadata();
    if (!meta?.width || !meta?.height) return null;

    const longest = Math.max(meta.width, meta.height);
    const needsResize = longest > RESIZE_LONGEST_EDGE;

    let pipeline = image.rotate(); // auto-orient via EXIF
    if (needsResize) {
      pipeline = pipeline.resize({
        width: meta.width >= meta.height ? RESIZE_LONGEST_EDGE : undefined,
        height: meta.height > meta.width ? RESIZE_LONGEST_EDGE : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Re-encode: PNG → keep as PNG (lossless); everything else → JPEG for size.
    let outMime;
    if (mimeType === 'image/png') {
      pipeline = pipeline.png({ compressionLevel: 9, palette: true });
      outMime = 'image/png';
    } else if (mimeType === 'image/webp') {
      pipeline = pipeline.webp({ quality: WEBP_QUALITY });
      outMime = 'image/webp';
    } else {
      pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
      outMime = 'image/jpeg';
    }

    const outBuf = await pipeline.toBuffer({ resolveWithObject: true });

    // If sharp couldn't actually reduce the size (small + already-compressed image),
    // keep the original to avoid pointless quality loss.
    if (!needsResize && outBuf.data.length >= buffer.length * 0.95) return null;

    return {
      buffer: outBuf.data,
      mimeType: outMime,
      width: outBuf.info.width,
      height: outBuf.info.height,
    };
  } catch (err) {
    console.warn('[upload] sharp processing failed (storing original)', err.message);
    return null;
  }
}

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
    let buffer = Buffer.from(await file.arrayBuffer());
    let mimeType = file.type || 'application/octet-stream';
    let width = widthRaw ? Number(widthRaw) : undefined;
    let height = heightRaw ? Number(heightRaw) : undefined;
    let filename = file.name;

    // Resize + compress images on the server.
    if (mimeType.startsWith('image/')) {
      const processed = await processImage(buffer, mimeType);
      if (processed) {
        buffer = processed.buffer;
        mimeType = processed.mimeType;
        width = processed.width;
        height = processed.height;
        // Normalize the extension to match the new mime so downloads behave.
        const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
        const ext = extMap[mimeType];
        if (ext && filename) {
          const base = filename.replace(/\.[^.]+$/, '');
          filename = `${base}${ext}`;
        }
      }
    }

    const fileId = await uploadBuffer(buffer, {
      filename,
      contentType: mimeType,
      metadata: { uploadedBy: userId, width, height },
    });

    return NextResponse.json({
      fileId: String(fileId),
      url: `/api/files/${fileId}`,
      name: filename,
      mimeType,
      size: buffer.length,
      width,
      height,
    });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
