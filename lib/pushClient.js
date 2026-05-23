'use client';

import { api } from './apiClient';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Best-effort: subscribe this browser to web push. Returns true on success,
// false if anything's not wired up (no SW, no VAPID key, denied permission).
export async function enablePush() {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  let reg;
  try {
    reg = await navigator.serviceWorker.ready;
  } catch {
    return false;
  }

  let key = null;
  try {
    const data = await api('/api/push/public-key');
    key = data?.publicKey || null;
  } catch {}
  if (!key) return false;

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    await api('/api/push/subscribe', {
      method: 'POST',
      body: { subscription: sub.toJSON() },
    });
    return true;
  } catch (err) {
    console.warn('[push] subscribe failed', err);
    return false;
  }
}

export async function disablePush() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    await api('/api/push/subscribe', { method: 'DELETE', body: { endpoint } });
  } catch (err) {
    console.warn('[push] unsubscribe failed', err);
  }
}
