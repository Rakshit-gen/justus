import { NextResponse } from 'next/server';
const { connectDB } = require('@/lib/db');
const User = require('@/lib/models/User');
const { comparePassword, signToken } = require('@/lib/auth');

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { name, password } = await req.json();
    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password are required' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ name: String(name).trim() });
    if (!user) {
      return NextResponse.json({ error: 'Invalid name or password' }, { status: 401 });
    }
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid name or password' }, { status: 401 });
    }

    const token = signToken(user._id.toString());
    return NextResponse.json({ token, user: user.toPublic() });
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
