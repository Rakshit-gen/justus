const webpush = require('web-push');
const PushSubscription = require('./models/PushSubscription');

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@chatme.local';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

// Send a notification to every active subscription belonging to a user.
// Silently no-ops if VAPID isn't configured (so the app keeps working
// in dev where you haven't generated keys yet). Cleans up expired
// subscriptions automatically.
async function sendToUser(userId, payload) {
  if (!ensureConfigured()) return { sent: 0, configured: false };
  const subs = await PushSubscription.find({ user: userId });
  if (subs.length === 0) return { sent: 0, configured: true };

  const json = JSON.stringify(payload);
  const dead = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } },
          json
        );
        sent++;
      } catch (err) {
        // 404 / 410 mean the subscription is gone — clean it up.
        if (err.statusCode === 404 || err.statusCode === 410) {
          dead.push(s._id);
        } else {
          console.warn('[push] send failed', err.statusCode || err.message);
        }
      }
    })
  );

  if (dead.length > 0) {
    try { await PushSubscription.deleteMany({ _id: { $in: dead } }); } catch {}
  }

  return { sent, configured: true };
}

module.exports = { sendToUser, ensureConfigured };
