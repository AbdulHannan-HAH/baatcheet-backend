import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listUsers,
  listConversations,
  listMessages,
  getMessagesByUser,
  sendMessage,
  markSeen
} from '../controllers/chatController.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// users & conversations
router.get('/users', requireAuth, listUsers);
router.get('/conversations', requireAuth, listConversations);

// messages (by conversation id)
router.get('/messages/:conversationId', requireAuth, listMessages);

// NEW: messages by user id (auto creates conversation)
router.get('/messages-by-user/:userId', requireAuth, getMessagesByUser);

// NEW: send message via REST
router.post('/send', requireAuth, sendMessage);

// voice upload
const uploadDir = path.join(process.cwd(), 'uploads', 'voice');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage });

router.post('/upload/voice', requireAuth, upload.single('voice'), (req, res) => {
  const url = `/uploads/voice/${req.file.filename}`;
  res.json({ url });
});



export default router;
