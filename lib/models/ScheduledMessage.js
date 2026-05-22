const mongoose = require('mongoose');

const ScheduledMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '', maxlength: 4000 },
    attachments: { type: Array, default: [] },
    scheduledFor: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
    sentMessageId: { type: mongoose.Schema.Types.ObjectId, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

ScheduledMessageSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    sender: this.sender.toString(),
    recipient: this.recipient.toString(),
    content: this.content,
    attachments: this.attachments || [],
    scheduledFor: this.scheduledFor,
    status: this.status,
    createdAt: this.createdAt,
  };
};

module.exports =
  mongoose.models.ScheduledMessage || mongoose.model('ScheduledMessage', ScheduledMessageSchema);
