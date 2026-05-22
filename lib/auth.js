const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function getTokenFromRequest(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function requireUserId(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.sub || null;
}

module.exports = {
  signToken,
  verifyToken,
  hashPassword,
  comparePassword,
  getTokenFromRequest,
  requireUserId,
};
