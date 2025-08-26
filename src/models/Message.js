import mongoose from 'mongoose';
const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    voiceUrl: { type: String },
    voiceDuration: { type: Number }, // seconds
    deliveredAt: { type: Date },
    seenAt: { type: Date },
    replyTo: {
      messageId: mongoose.Schema.Types.ObjectId,
      text: String,
      voiceUrl: String,
      from: mongoose.Schema.Types.ObjectId,
      fromName: String
    },
    // NEW: File attachments
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String, // 'image', 'video', 'document', 'audio', etc.
      fileSize: Number, // in bytes
      thumbnailUrl: String // for images/videos
    }]
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.model('Message', MessageSchema);