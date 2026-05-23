const mongoose = require('mongoose');

const WallpaperSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['preset', 'image', 'none'], default: 'none' },
    // preset name OR image URL (e.g. /api/files/<id>) depending on kind
    value: { type: String, default: '' },
  },
  { _id: false }
);

const ChatSettingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    otherUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pinned: { type: Boolean, default: false },
    wallpaper: { type: WallpaperSchema, default: () => ({}) },
    // Private nickname only visible to `user` — never broadcast to `otherUser`.
    nickname: { type: String, default: '', maxlength: 40 },
  },
  { timestamps: true }
);

ChatSettingSchema.index({ user: 1, otherUser: 1 }, { unique: true });

ChatSettingSchema.methods.toClient = function () {
  return {
    otherUserId: this.otherUser.toString(),
    pinned: Boolean(this.pinned),
    wallpaper:
      this.wallpaper && this.wallpaper.kind && this.wallpaper.kind !== 'none'
        ? { kind: this.wallpaper.kind, value: this.wallpaper.value }
        : null,
    nickname: this.nickname || '',
  };
};

module.exports = mongoose.models.ChatSetting || mongoose.model('ChatSetting', ChatSettingSchema);
