import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import mongoose from 'mongoose';


export const listUsers = async (req, res) => {
  const me = req.user.uid;
  const users = await User.find({ _id: { $ne: me } })
    .select('_id name email avatarUrl lastSeen')
    .limit(100)
    .lean();
  res.json({ users });
};

export const listConversations = async (req, res) => {
  const me = new mongoose.Types.ObjectId(req.user.uid);
  const conversations = await Conversation.find({ participants: me })
    .populate('lastMessage')
    .populate({ path: 'participants', select: '_id name avatarUrl lastSeen' })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  const shaped = conversations.map(c => {
    const other = c.participants.find(p => String(p._id) !== String(me));
    return {
      _id: c._id,
      other,
      lastMessage: c.lastMessage,
      updatedAt: c.updatedAt,
    };
  });

  res.json({ conversations: shaped });
};

export const getOrCreateConversation = async (me, otherId) => {
  let conv = await Conversation.findOne({
    participants: { $all: [me, otherId] },
  });
  if (!conv) {
    conv = await Conversation.create({ participants: [me, otherId] });
  }
  return conv;
};

// NEW: get messages by user (auto create conversation if needed)
export const getMessagesByUser = async (req, res) => {
  const me = req.user.uid;
  const { userId } = req.params;

  const conv = await getOrCreateConversation(me, userId);

  const { cursor, limit = 30 } = req.query;
  const query = { conversation: conv._id };
  if (cursor) query._id = { $lt: cursor };

  const messages = await Message.find(query).sort({ _id: -1 }).limit(Number(limit)).lean();
  res.json({
    conversationId: conv._id,
    messages: messages.reverse(),
    nextCursor: messages.length ? messages[0]._id : null
  });
};

// existing: by conversation id (kept for compatibility)
export const listMessages = async (req, res) => {
  const { conversationId } = req.params;
  const { cursor, limit = 30 } = req.query;
  const query = { conversation: conversationId };
  if (cursor) query._id = { $lt: cursor };

  const messages = await Message.find(query).sort({ _id: -1 }).limit(Number(limit)).lean();
  res.json({ messages: messages.reverse(), nextCursor: messages.length ? messages[0]._id : null });
};

// NEW: send message via REST (useful as fallback / debugging)
export const sendMessage = async (req, res) => {
  const from = req.user.uid;
  const { to, text, voiceUrl, voiceDuration } = req.body;
  if (!to || (!text && !voiceUrl)) return res.status(400).json({ message: 'Missing fields' });

  const conv = await getOrCreateConversation(from, to);

  const msg = await Message.create({
    conversation: conv._id,
    from, to, text, voiceUrl, voiceDuration,
    deliveredAt: new Date(),
  });

  conv.lastMessage = msg._id;
  await conv.save();

  const full = await Message.findById(msg._id).lean();
  res.status(201).json({ message: full, conversationId: conv._id });
};

export const markSeen = async (req, res) => {
  const { messageId } = req.params;
  const msg = await Message.findByIdAndUpdate(
    messageId,
    { $set: { seenAt: new Date() } },
    { new: true }
  );
  res.json({ message: msg });
};
