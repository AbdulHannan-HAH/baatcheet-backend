import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { sendMail } from '../config/mailer.js';
import { signAccessToken, signEmailToken, verifyEmailToken } from '../utils/tokens.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Helper function to send verification email
const sendVerificationEmail = async (user) => {
  try {
    const token = signEmailToken({ uid: user._id });
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb;">Chat App</h2>
        </div>
        <h3 style="color: #333;">Hello ${user.name},</h3>
        <p>Thank you for registering with Chat App. Please verify your email address to activate your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #2563eb;">${verifyUrl}</p>
        <p>If you didn't create this account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
      </div>
    `;

    await sendMail({
      to: user.email,
      subject: 'Verify your email for Chat App',
      html: emailHtml
    });

    return true;
  } catch (error) {
    console.error('Error in sendVerificationEmail:', error);
    throw error;
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    
    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });

    try {
      // Send verification email
      await sendVerificationEmail(user);
      
      res.status(201).json({ 
        message: 'Registration successful! Please check your email to verify your account.',
        userId: user._id,
        email: user.email
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // In development mode, we can provide a verification link directly
      if (process.env.NODE_ENV === 'development') {
        const token = signEmailToken({ uid: user._id });
        const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
        
        res.status(201).json({ 
          message: 'Registration successful! Email sending failed, but here is your verification link for development:',
          verificationLink: verifyUrl,
          userId: user._id
        });
      } else {
        // Delete the user if email sending fails in production
        await User.findByIdAndDelete(user._id);
        
        res.status(500).json({ 
          message: 'Registration failed. Could not send verification email. Please try again later.' 
        });
      }
    }
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.verified) {
      return res.json({ message: 'Email is already verified' });
    }
    
    try {
      await sendVerificationEmail(user);
      res.json({ message: 'Verification email sent successfully' });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        const token = signEmailToken({ uid: user._id });
        const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
        
        res.json({ 
          message: 'Email sending failed, but here is your verification link for development:',
          verificationLink: verifyUrl
        });
      } else {
        res.status(500).json({ message: 'Could not send verification email. Please try again later.' });
      }
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }
    
    try {
      const decoded = verifyEmailToken(token);
      const user = await User.findByIdAndUpdate(
        decoded.uid, 
        { verified: true },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'Email verified successfully. You can now login.' });
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(400).json({ 
          message: 'Verification link has expired. Please request a new verification email.' 
        });
      }
      
      res.status(400).json({ message: 'Invalid verification token' });
    }
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    if (!user.verified) {
      return res.status(403).json({ 
        message: 'Please verify your email before logging in', 
        needsVerification: true,
        email: user.email
      });
    }
    
    const token = signAccessToken({ 
      uid: user._id, 
      email: user.email, 
      name: user.name 
    });
    
    res.cookie('token', token, cookieOptions);
    
    res.json({
      message: 'Logged in successfully',
      token,   // 👈 added
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        avatarUrl: user.avatarUrl,
        verified: user.verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Other functions remain the same...
export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.uid).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = async (_req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

export const updateAvatar = async (req, res) => {
  try {
    console.log('Update avatar request received:', req.body);
    console.log('User ID:', req.user.uid);
    
    const { avatarUrl } = req.body;
    
    if (!avatarUrl) {
      return res.status(400).json({ 
        success: false,
        message: 'avatarUrl is required' 
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.uid,
      { avatarUrl },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    console.log('Avatar updated successfully:', user.avatarUrl);
    
    res.json({ 
      success: true,
      message: 'Avatar updated successfully', 
      user 
    });
  } catch (error) {
    console.error('Avatar update error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during avatar update: ' + error.message 
    });
  }
};