// Tiny fetch wrapper used by client components.

const STORAGE_KEY = 'chatme.auth';

function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw)?.token || null : null;
  } catch {
    return null;
  }
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}
