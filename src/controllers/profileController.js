import User from '../models/User.js';
import { deleteOldAvatar } from '../utils/cloudinary.js';

// Upload avatar from file
export const uploadAvatar = async (req, res) => {
  try {
    console.log('Upload avatar request received');
    
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'File upload service is not configured. Please contact administrator.'
      });
    }

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image file.'
      });
    }

    const avatarUrl = req.file.path;
    console.log('Cloudinary URL:', avatarUrl);

    // Get current user to check for old avatar
    const oldUser = await User.findById(req.user.uid);
    console.log('Old user avatar:', oldUser.avatarUrl);

    // Delete old avatar from Cloudinary if exists
    if (oldUser.avatarUrl) {
      console.log('Deleting old avatar...');
      await deleteOldAvatar(oldUser.avatarUrl);
    }

    const user = await User.findByIdAndUpdate(
      req.user.uid,
      { avatarUrl },
      { new: true }
    ).select('-password');

    console.log('Avatar updated successfully:', user.avatarUrl);

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      user
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Server error during avatar upload: ' + error.message
    });
  }
};
// Get user profile
export const getProfile = async (req, res) => {
  try {
    console.log('Get profile request for user:', req.user.uid);
    
    const user = await User.findById(req.user.uid).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    console.log('Update profile request body:', req.body);
    console.log('User ID:', req.user.uid);
    
    const { name, bio, phone } = req.body;
    
    // Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    const updateData = {
      name: name.trim(),
      bio: bio ? bio.trim() : '',
      phone: phone ? phone.trim() : ''
    };
    
    console.log('Update data:', updateData);
    
    const user = await User.findByIdAndUpdate(
      req.user.uid,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('Profile updated successfully:', user);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errorMessage = Object.values(error.errors)[0].message;
      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// Update avatar from URL
export const updateAvatar = async (req, res) => {
  try {
    console.log('Update avatar URL request:', req.body);
    
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
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Avatar updated successfully',
      user
    });
  } catch (error) {
    console.error('Avatar update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during avatar update'
    });
  }
};