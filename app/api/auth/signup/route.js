import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const User = require('@/lib/models/User');
const { hashPassword, signToken } = require('@/lib/auth');
const { pickAvatarColor } = require('@/lib/avatarColor');

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { name, password } = await req.json();
    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password are required' }, { status: 400 });
    }
    const trimmed = String(name).trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      return NextResponse.json({ error: 'Name must be 2–30 characters' }, { status: 400 });
    }
    if (String(password).length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    await connectDB();

    const exists = await User.findOne({ name: trimmed });
    if (exists) {
      return NextResponse.json({ error: 'That name is already taken' }, { status: 409 });
    }

    const user = await User.create({
      name: trimmed,
      passwordHash: await hashPassword(password),
      avatarColor: pickAvatarColor(trimmed),
    });

    const token = signToken(user._id.toString());
    // No global broadcast — friend gating means signups are private and
    // discovered via search only.
    return NextResponse.json({ token, user: user.toPublic() }, { status: 201 });
  } catch (err) {
    console.error('[signup]', err);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
