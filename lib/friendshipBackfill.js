const Conversation = require('./models/Conversation');
const Friendship = require('./models/Friendship');

let didRun = false;

// One-time backfill: for every existing 1-to-1 conversation, ensure both
// participants have an `accepted` Friendship. Runs once per server process,
// after Mongo is connected. Safe to re-run — uses upsert semantics.
async function backfillFriendshipsFromConversations() {
  if (didRun) return;
  didRun = true;

  const convos = await Conversation.find({});
  if (convos.length === 0) return;

  let created = 0;
  for (const c of convos) {
    if (!Array.isArray(c.participants) || c.participants.length !== 2) continue;
    const ids = c.participants.map(String).sort();
    const key = ids.join(':');
    try {
      const res = await Friendship.findOneAndUpdate(
        { key },
        {
          $setOnInsert: {
            key,
            requester: ids[0],
            recipient: ids[1],
            status: 'accepted',
            acceptedAt: new Date(),
          },
        },
        { upsert: true, new: false, setDefaultsOnInsert: true }
      );
      if (!res) created++;
    } catch (err) {
      if (err.code !== 11000) console.error('[backfill]', err);
    }
  }
  if (created > 0) console.log(`[friend-backfill] auto-friended ${created} existing pair(s)`);
}

module.exports = { backfillFriendshipsFromConversations };
