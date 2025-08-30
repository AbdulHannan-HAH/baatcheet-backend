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
// In your user routes or auth routes
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name avatarUrl online lastSeen');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
export default router;
