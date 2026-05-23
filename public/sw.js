/* chatme service worker — handles install, push, and notification clicks. */

const SW_VERSION = 'chatme-sw-v1';

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network passthrough — no offline cache yet (chat data must be live).
self.addEventListener('fetch', () => {});

// Receive push from the server.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'chatme', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'chatme';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: payload.tag || undefined,
    data: { url: payload.url || '/chat' },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/chat';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // If a chatme tab is already open, focus it.
      for (const client of list) {
        if (client.url.includes(self.location.host)) {
          client.focus();
          if ('navigate' in client) client.navigate(url).catch(() => {});
          return;
        }
      }
      // Else open a new one.
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
