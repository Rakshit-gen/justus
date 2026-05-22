const mongoose = require('mongoose');

const FriendshipSchema = new mongoose.Schema(
  {
    // Sorted-pair dedup key: `${minId}:${maxId}`. Unique → at most one
    // friendship doc per pair.
    key: { type: String, required: true, unique: true, index: true },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted'], required: true, default: 'pending' },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

FriendshipSchema.statics.pairKey = function (a, b) {
  return [String(a), String(b)].sort().join(':');
};

// Returns the friendship doc between two users, or null. Always works regardless
// of which one is requester vs recipient.
FriendshipSchema.statics.between = function (a, b) {
  return this.findOne({ key: this.pairKey(a, b) });
};

// Convenience: are these two users mutually accepted friends?
FriendshipSchema.statics.areFriends = async function (a, b) {
  if (String(a) === String(b)) return false;
  const f = await this.between(a, b);
  return Boolean(f && f.status === 'accepted');
};

module.exports = mongoose.models.Friendship || mongoose.model('Friendship', FriendshipSchema);
