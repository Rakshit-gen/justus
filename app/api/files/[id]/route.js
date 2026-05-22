const { connectDB } = require('@/lib/db');
const { getFileInfo, openDownloadStream } = require('@/lib/gridfs');

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const info = await getFileInfo(params.id);
    if (!info) {
      return new Response('Not found', { status: 404 });
    }

    const stream = openDownloadStream(params.id);
    // Convert Node Readable stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': info.contentType || 'application/octet-stream',
        'Content-Length': String(info.length || ''),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('[download]', err);
    return new Response('Error', { status: 500 });
  }
}
