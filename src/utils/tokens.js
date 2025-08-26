import jwt from 'jsonwebtoken';

export const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

export const signEmailToken = (payload) =>
  jwt.sign(payload, process.env.JWT_EMAIL_SECRET, { expiresIn: '1d' });

export const verifyEmailToken = (token) =>
  jwt.verify(token, process.env.JWT_EMAIL_SECRET);

// 👇 yeh add karo
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null; // invalid token
  }
};
