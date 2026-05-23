import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const PushSubscription = require('@/lib/models/PushSubscription');
const { requireUserId } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    await connectDB();
    // Upsert by endpoint — the same browser instance might re-subscribe.
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        user: userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        userAgent: req.headers.get('user-agent') || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push subscribe]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const userId = requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: 'No endpoint' }, { status: 400 });
    await connectDB();
    await PushSubscription.deleteOne({ user: userId, endpoint });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push unsubscribe]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
