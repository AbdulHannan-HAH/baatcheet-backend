import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const token = req.cookies?.token || (header?.startsWith('Bearer ') ? header.split(' ')[1] : null);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
