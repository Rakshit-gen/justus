const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

// Lightweight snapshot of the message being replied to, frozen at reply time.
// Lets us render the quote even if the original is later edited or deleted.
const ReplyPreviewSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, default: '' },
    type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '', trim: true, maxlength: 4000 },
    attachments: { type: [AttachmentSchema], default: [] },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    replyPreview: { type: ReplyPreviewSchema, default: null },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
    reactions: { type: Map, of: String, default: () => new Map() },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    // When set, the document is deleted automatically by Mongo's TTL monitor.
    // Used for disappearing messages — see Conversation.disappearingTtl.
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, status: 1 });
// Text-ish index for search — relies on a regex query rather than a true
// text index (which would need a single text index on content per collection).
MessageSchema.index({ conversationId: 1, content: 'text' });
// TTL index: Mongo's background reaper deletes docs whose expiresAt is in
// the past. expireAfterSeconds: 0 means "delete at exactly expiresAt".
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

MessageSchema.methods.toClient = function () {
  const reactions = {};
  if (this.reactions && typeof this.reactions.forEach === 'function') {
    this.reactions.forEach((emoji, userId) => { reactions[userId] = emoji; });
  }
  const deleted = Boolean(this.deletedAt);
  return {
    id: this._id.toString(),
    conversationId: this.conversationId.toString(),
    sender: this.sender.toString(),
    recipient: this.recipient.toString(),
    content: deleted ? '' : this.content,
    attachments: deleted ? [] : (this.attachments || []).map((a) => ({
      fileId: a.fileId?.toString(),
      url: a.fileId ? `/api/files/${a.fileId}` : null,
      name: a.name,
      mimeType: a.mimeType,
      size: a.size,
      width: a.width,
      height: a.height,
    })),
    replyTo: this.replyTo ? this.replyTo.toString() : null,
    replyPreview: deleted ? null : (this.replyPreview ? {
      sender: this.replyPreview.sender?.toString(),
      content: this.replyPreview.content || '',
      type: this.replyPreview.type || 'text',
    } : null),
    status: this.status,
    deliveredAt: this.deliveredAt,
    seenAt: this.seenAt,
    reactions,
    editedAt: this.editedAt,
    deletedAt: this.deletedAt,
    expiresAt: this.expiresAt,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);
