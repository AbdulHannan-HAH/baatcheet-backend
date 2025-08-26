import { Router } from 'express';
import {
  login, register, me, logout, verifyEmail, resendVerification, updateAvatar
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', verifyEmail);
router.post('/resend', resendVerification);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);
router.post('/avatar', requireAuth, updateAvatar);

export default router;
