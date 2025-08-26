import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
dotenv.config();
// Check if Cloudinary environment variables are set
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

// Validate configuration
if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
  console.error('Missing Cloudinary configuration. Please check your environment variables.');
  // You might want to throw an error here or handle it differently
}

// Configure Cloudinary
cloudinary.config(cloudinaryConfig);

// Create storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat-app/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [
      { width: 300, height: 300, crop: 'fill' },
      { quality: 'auto' },
      { format: 'auto' }
    ]
  },
});

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Utility function to delete old avatar
export const deleteOldAvatar = async (avatarUrl) => {
  try {
    // Only attempt deletion if Cloudinary is properly configured
    if (!cloudinaryConfig.api_key) {
      console.warn('Cloudinary not configured, skipping avatar deletion');
      return;
    }
    
    if (avatarUrl && avatarUrl.includes('cloudinary.com')) {
      const publicId = avatarUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error('Error deleting old avatar:', error);
  }
};





export default cloudinary;