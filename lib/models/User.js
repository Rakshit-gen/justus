const mongoose = require('mongoose');

const PrivacySchema = new mongoose.Schema(
  {
    showOnline: { type: Boolean, default: true },
    showLastSeen: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 30 },
    passwordHash: { type: String, required: true },
    avatarColor: { type: String, required: true },
    avatarFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    bio: { type: String, default: '', maxlength: 140, trim: true },
    privacy: { type: PrivacySchema, default: () => ({}) },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// Full payload — used for the authenticated user themselves (/api/auth/me).
UserSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    avatarColor: this.avatarColor,
    avatarUrl: this.avatarFileId ? `/api/files/${this.avatarFileId}` : null,
    bio: this.bio || '',
    privacy: {
      showOnline: this.privacy?.showOnline !== false,
      showLastSeen: this.privacy?.showLastSeen !== false,
    },
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
  };
};

// Privacy-masked payload for OTHER users to see. Hides online/lastSeen if
// the owner has opted out. Never exposes privacy settings themselves.
UserSchema.methods.toPublicView = function () {
  const hideOnline = this.privacy?.showOnline === false;
  const hideLastSeen = this.privacy?.showLastSeen === false;
  return {
    id: this._id.toString(),
    name: this.name,
    avatarColor: this.avatarColor,
    avatarUrl: this.avatarFileId ? `/api/files/${this.avatarFileId}` : null,
    bio: this.bio || '',
    isOnline: hideOnline ? false : this.isOnline,
    lastSeen: hideLastSeen ? null : this.lastSeen,
  };
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
