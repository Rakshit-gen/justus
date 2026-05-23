import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Lightweight liveness probe for keep-alive pings (UptimeRobot etc).
// Intentionally does NOT touch the DB — we only need to wake the Render
// instance, not burn an Atlas connection every 5 minutes.
export async function GET() {
  return NextResponse.json({ ok: true, t: Date.now() });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
