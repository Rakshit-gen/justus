'use client';

// localStorage-backed message cache with stale-while-revalidate semantics.
// Stores the last N messages per conversation, capped at M conversations
// (LRU eviction). Writes silently fail on quota errors after dropping the
// least-recently-used conversation.

const STORAGE_KEY = 'chatme.msgcache.v1';
const MAX_CONVOS = 20;
const MAX_MESSAGES_PER_CONVO = 50;

function emptyStore() {
  return { __version: 1, convos: {} };
}

function readStore() {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (parsed?.__version !== 1 || !parsed.convos) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeStore(store) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Likely QuotaExceeded — drop the least-recently-used convo and retry once.
    const convos = store.convos || {};
    const ids = Object.keys(convos);
    if (ids.length === 0) return;
    const oldest = ids.sort(
      (a, b) => (convos[a].lastAccess || 0) - (convos[b].lastAccess || 0)
    )[0];
    delete convos[oldest];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Give up; the cache becomes a no-op rather than crash the app.
    }
  }
}

function evictIfNeeded(store) {
  const ids = Object.keys(store.convos || {});
  if (ids.length <= MAX_CONVOS) return;
  const sorted = ids.sort(
    (a, b) => (store.convos[a].lastAccess || 0) - (store.convos[b].lastAccess || 0)
  );
  for (const id of sorted.slice(0, ids.length - MAX_CONVOS)) {
    delete store.convos[id];
  }
}

function isCacheable(message) {
  return Boolean(message && message.id && !String(message.id).startsWith('tmp_'));
}

export function getCachedMessages(conversationId) {
  if (!conversationId) return null;
  const store = readStore();
  const entry = store.convos?.[conversationId];
  if (!entry) return null;
  entry.lastAccess = Date.now();
  // Drop disappearing messages whose expiresAt has passed before returning,
  // so they don't briefly flash on screen from the cached snapshot.
  if (Array.isArray(entry.messages)) {
    const now = Date.now();
    const before = entry.messages.length;
    entry.messages = entry.messages.filter(
      (m) => !m.expiresAt || new Date(m.expiresAt).getTime() > now
    );
    if (entry.messages.length !== before) {
      store.convos[conversationId] = entry;
    }
  }
  writeStore(store);
  return Array.isArray(entry.messages) ? entry.messages : null;
}

export function setCachedMessages(conversationId, messages) {
  if (!conversationId || !Array.isArray(messages)) return;
  const real = messages.filter(isCacheable);
  if (real.length === 0) return;
  const trimmed = real.slice(-MAX_MESSAGES_PER_CONVO);
  const store = readStore();
  store.convos = store.convos || {};
  store.convos[conversationId] = { lastAccess: Date.now(), messages: trimmed };
  evictIfNeeded(store);
  writeStore(store);
}

// Add or update a single message in the cache (for live socket updates).
export function upsertCachedMessage(conversationId, message) {
  if (!conversationId || !isCacheable(message)) return;
  const store = readStore();
  store.convos = store.convos || {};
  const entry = store.convos[conversationId] || { lastAccess: Date.now(), messages: [] };
  const idx = entry.messages.findIndex((m) => m.id === message.id);
  if (idx >= 0) {
    entry.messages[idx] = message;
  } else {
    entry.messages.push(message);
    if (entry.messages.length > MAX_MESSAGES_PER_CONVO) {
      entry.messages = entry.messages.slice(-MAX_MESSAGES_PER_CONVO);
    }
  }
  entry.lastAccess = Date.now();
  store.convos[conversationId] = entry;
  evictIfNeeded(store);
  writeStore(store);
}

export function removeCachedMessage(conversationId, messageId) {
  if (!conversationId || !messageId) return;
  const store = readStore();
  const entry = store.convos?.[conversationId];
  if (!entry) return;
  entry.messages = entry.messages.filter((m) => m.id !== messageId);
  entry.lastAccess = Date.now();
  writeStore(store);
}

export function clearMessageCache() {
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
}
