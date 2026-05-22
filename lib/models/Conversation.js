const mongoose = require('mongoose');
// Ensure the Message model is registered before findOrCreateBetween below
// calls `mongoose.model('Message')`. On long-running servers everything gets
// loaded at boot, but on serverless platforms (Vercel) each route lambda only
// loads what it imports — and this file's helper depends on Message being
// known. Importing it here guarantees registration in every lambda that
// touches Conversation.
require('./Message');

const ConversationSchema = new mongoose.Schema(
  {
    // Deterministic dedup key — sorted participant ids joined by ":". Makes
    // findOrCreateBetween atomic via an upsert on this field's unique index.
    key: { type: String, index: true, unique: true, sparse: true },
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: (v) => Array.isArray(v) && v.length === 2,
    },
    lastMessage: {
      content: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },
    unread: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });

// Atomic + backward-compatible find-or-create. Matches conversations by either
// the new `key` field or — for documents created before that field existed —
// by participant pair. If multiple legacy duplicates exist for the same pair,
// they're merged into a single canonical document on first access.
ConversationSchema.statics.findOrCreateBetween = async function (userA, userB) {
  // Directly require so this works on any host — including serverless bundlers
  // that don't follow top-of-file `require('./Message')` for side effects.
  const Message = require('./Message');
  const ids = [String(userA), String(userB)].sort();
  const key = ids.join(':');

  const matches = await this.find({
    $or: [{ key }, { participants: { $all: ids, $size: 2 } }],
  });

  if (matches.length === 0) {
    try {
      return await this.findOneAndUpdate(
        { key },
        { $setOnInsert: { key, participants: ids } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      // Another client raced us to the upsert; the existing doc is now there.
      if (err.code === 11000) return this.findOne({ key });
      throw err;
    }
  }

  // Pick a canonical doc deterministically so concurrent callers agree:
  // prefer the keyed one, then the oldest. Merge any siblings into it.
  matches.sort((a, b) => {
    const aHas = Boolean(a.key);
    const bHas = Boolean(b.key);
    if (aHas !== bHas) return aHas ? -1 : 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const canonical = matches[0];
  const dupes = matches.slice(1);

  if (dupes.length > 0) {
    const dupeIds = dupes.map((d) => d._id);
    await Message.updateMany(
      { conversationId: { $in: dupeIds } },
      { $set: { conversationId: canonical._id } }
    );

    for (const d of dupes) {
      const dLast = d.lastMessage?.createdAt;
      const cLast = canonical.lastMessage?.createdAt;
      if (dLast && (!cLast || new Date(dLast) > new Date(cLast))) {
        canonical.lastMessage = d.lastMessage;
      }
      if (d.unread) {
        for (const [k, v] of d.unread.entries()) {
          const cur = canonical.unread?.get?.(k) || 0;
          canonical.unread.set(k, cur + v);
        }
      }
    }

    await this.deleteMany({ _id: { $in: dupeIds } });
    console.log(`[convo] merged ${dupes.length} duplicate(s) into ${canonical._id}`);
  }

  if (!canonical.key) canonical.key = key;
  try {
    await canonical.save();
  } catch (err) {
    if (err.code !== 11000) throw err;
    // A concurrent caller keyed it first — re-read and return.
    return this.findOne({ key });
  }
  return canonical;
};

module.exports =
  mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
