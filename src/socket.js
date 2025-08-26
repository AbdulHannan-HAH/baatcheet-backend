import { Server } from 'socket.io';
import cookie from 'cookie';
import { verifyToken } from './utils/tokens.js';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';
import User from './models/User.js';

const onlineUsers = new Map(); // userId -> Set<socketId>


function addOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
  console.log(`User ${userId} online. Total connections: ${onlineUsers.get(userId).size}`);
  return onlineUsers.get(userId).size === 1; // returns true if this is the first connection
}

function removeOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) return;
  const set = onlineUsers.get(userId);
  set.delete(socketId);
  console.log(`User ${userId} connection removed. Remaining: ${set.size}`);
  if (set.size === 0) {
    onlineUsers.delete(userId);
    // Update lastSeen only when ALL connections are closed
    User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() }).catch(console.error);
    return true; // completely offline
  }
  return false; // still has other connections
}

export function initSocket(httpServer, corsOrigins) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    cookie: true,
  });

  io.use(async (socket, next) => {
    try {
      const cookies = socket.handshake.headers?.cookie
        ? cookie.parse(socket.handshake.headers.cookie)
        : {};
      const token = cookies.token || socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('unauthorized'));
      
      const payload = verifyToken(token);
      // User ka full data get karein
      const user = await User.findById(payload.uid).select('_id name email avatarUrl');
      if (!user) return next(new Error('user not found'));
      
      socket.user = user;
      return next();
    } catch (e) {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.name} (${userId})`);
    
    socket.join(userId);
    
    // Check if this is the user's first connection
    const isFirstConnection = addOnline(userId, socket.id);

    // User ko online mark karein (only if first connection)
    if (isFirstConnection) {
      await User.findByIdAndUpdate(userId, { 
        $set: { online: true, lastSeen: null } 
      });

      // Broadcast presence online to ALL connected users
      io.emit('presence:online', { 
        userId,
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          email: socket.user.email,
          avatarUrl: socket.user.avatarUrl
        }
      });
    }

    // Send current online status of ALL users to the newly connected user
    // This is the key fix - we need to get ALL users from database, not just online ones
    const allUsers = await User.find({}, '_id name email avatarUrl online lastSeen');
    
    // Get list of currently online users from our Map
    const onlineUserIds = Array.from(onlineUsers.keys());
    
    // Update the users with correct online status
    const usersWithCorrectStatus = allUsers.map(user => ({
      userId: user._id.toString(),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        // Set online status based on our onlineUsers Map, not database
        online: onlineUserIds.includes(user._id.toString()),
        lastSeen: user.lastSeen
      }
    }));
    
    socket.emit('presence:all-users', { 
      users: usersWithCorrectStatus
    });

    // Typing events
    socket.on('typing:start', ({ to }) => {
      io.to(to).emit('typing:start', { from: userId });
    });
    socket.on('typing:stop', ({ to }) => {
      io.to(to).emit('typing:stop', { from: userId });
    });

    // Send message
    // In the message:send event handler, change this part:
// In the message:send event handler, modify it to handle replies
socket.on('message:send', async (payload, ack) => {
  try {
    const { to, text, voiceUrl, voiceDuration, replyTo, attachments } = payload;
    
    // get/create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, to] },
    });
    if (!conversation) {
      conversation = await Conversation.create({ participants: [userId, to] });
    }
    
    // If this is a reply, get the original message details
    let replyData = null;
    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo).lean();
      if (repliedMessage) {
        replyData = {
          messageId: repliedMessage._id,
          text: repliedMessage.text,
          voiceUrl: repliedMessage.voiceUrl,
          from: repliedMessage.from,
          fromName: socket.user.name // Store the sender's name for display
        };
      }
    }
    
    // create message
    const msg = await Message.create({
      conversation: conversation._id,
      from: userId,
      to,
      text,
      voiceUrl,
      voiceDuration,
      replyTo: replyData,
      attachments: attachments || [],
      deliveredAt: new Date(),
    });
    
    // update lastMessage
    conversation.lastMessage = msg._id;
    await conversation.save();

    const full = await Message.findById(msg._id)
      .populate('replyTo', 'text voiceUrl from fromName')
      .lean();
    
    // emit to receiver + sender
    io.to(to).emit('message:new', { message: full });
    socket.emit('message:sent', { message: full }); // echo for sender ONLY

    // ack delivered
    ack && ack({ ok: true, message: full });
  } catch (e) {
    console.error('Message send error:', e);
    ack && ack({ ok: false });
  }
});
    // Mark seen
    socket.on('message:seen', async ({ messageId, to }) => {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { $set: { seenAt: new Date() } },
        { new: true }
      ).lean();
      if (updated) {
        io.to(to).emit('message:seen', { messageId });
        io.to(socket.user.id).emit('message:seen:echo', { messageId }); // update my copy
      }
    });

    // Handle users request
    socket.on('users:request', async () => {
      try {
        const allUsers = await User.find({}, '_id name email avatarUrl online lastSeen');
        
        // Get list of currently online users from our Map
        const onlineUserIds = Array.from(onlineUsers.keys());
        
        // Update the users with correct online status
        const usersWithCorrectStatus = allUsers.map(user => ({
          userId: user._id.toString(),
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            // Set online status based on our onlineUsers Map, not database
            online: onlineUserIds.includes(user._id.toString()),
            lastSeen: user.lastSeen
          }
        }));
        
        socket.emit('presence:all-users', { 
          users: usersWithCorrectStatus
        });
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    });

    socket.on('disconnect', async (reason) => {
      console.log(`User disconnected: ${socket.user.name} (${reason})`);
      
      const completelyOffline = removeOnline(userId, socket.id);
      
      if (completelyOffline) {
        // Update user status in database
        await User.findByIdAndUpdate(userId, { 
          online: false, 
          lastSeen: new Date() 
        });
        
        // Broadcast offline status to ALL users
        io.emit('presence:offline', { 
          userId, 
          lastSeen: new Date().toISOString() 
        });
      }
    });
  });

  return io;
}