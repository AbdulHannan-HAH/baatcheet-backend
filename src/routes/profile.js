import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getProfile, updateProfile, updateAvatar, uploadAvatar } from '../controllers/profileController.js';
import { upload } from '../utils/cloudinary.js';

const router = Router();

router.get('/', requireAuth, getProfile);
router.put('/', requireAuth, updateProfile);
router.post('/avatar', requireAuth, updateAvatar);
router.post('/upload-avatar', requireAuth, upload.single('avatar'), uploadAvatar);

export default router;