'use client';

// Web Audio API — generates a quick two-note ding without bundling audio files.
let cachedCtx = null;
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (cachedCtx) return cachedCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  cachedCtx = new Ctor();
  return cachedCtx;
}

function tone(ctx, freq, delay, duration, peak = 0.18) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration);
}

export function playMessageSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  tone(ctx, 880, 0, 0.12);
  tone(ctx, 1320, 0.07, 0.14);
}

// Browser Notification helpers
export function notificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return 'denied';
  }
}

export function showNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;
  try {
    const n = new Notification(title, { icon: '/icon.svg', ...options });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return n;
  } catch {
    return null;
  }
}
