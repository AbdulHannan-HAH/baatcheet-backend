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
import { uploadFile } from '../utils/cloudinary.js';

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

// NEW: File upload endpoint
router.post('/upload/file', requireAuth, uploadFile.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get file information
    const fileInfo = {
      fileName: req.file.originalname,
      fileUrl: req.file.path,
      fileType: getFileType(req.file.mimetype, req.file.originalname),
      fileSize: req.file.size
    };

    // If it's an image or video, check for eager transformations (thumbnails)
    if (req.file.eager && req.file.eager.length > 0) {
      fileInfo.thumbnailUrl = req.file.eager[0].secure_url;
    }

    res.json({ file: fileInfo });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Improved helper function to determine file type
function getFileType(mimetype, filename) {
  const extension = path.extname(filename || '').toLowerCase();
  
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  
  // Check by extension for better accuracy
  if (mimetype.includes('pdf') || extension === '.pdf') return 'pdf';
  if (mimetype.includes('word') || mimetype.includes('document') || 
      ['.doc', '.docx', '.rtf', '.odt'].includes(extension)) return 'document';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet') || 
      ['.xls', '.xlsx', '.csv'].includes(extension)) return 'spreadsheet';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation') || 
      ['.ppt', '.pptx'].includes(extension)) return 'presentation';
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(extension)) return 'archive';
  if (['.txt', '.log', '.md'].includes(extension)) return 'text';
  
  return 'other';
}

export default router;