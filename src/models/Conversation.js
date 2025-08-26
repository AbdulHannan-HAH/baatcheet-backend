import mongoose from 'mongoose';
const { Schema } = mongoose;

const ConversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });

export default mongoose.model('Conversation', ConversationSchema);
