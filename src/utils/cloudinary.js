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

// Create storage engine for Multer - Avatar
const avatarStorage = new CloudinaryStorage({
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

// Create storage engine for Multer - Files
const fileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // Determine folder based on file type
    let folder = 'chat-app/files';
    let resourceType = 'auto';
    let transformation = [];
    
    // Set different folders and transformations based on file type
    if (file.mimetype.startsWith('image/')) {
      folder = 'chat-app/images';
      transformation = [
        { quality: 'auto' },
        { format: 'auto' }
      ];
    } else if (file.mimetype.startsWith('video/')) {
      folder = 'chat-app/videos';
      resourceType = 'video';
      transformation = [
        { quality: 'auto' },
        { format: 'auto' }
      ];
    } else if (file.mimetype.includes('pdf')) {
      folder = 'chat-app/documents';
    } else if (file.mimetype.includes('word') || file.mimetype.includes('document')) {
      folder = 'chat-app/documents';
    } else if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) {
      folder = 'chat-app/documents';
    }
    
    return {
      folder: folder,
      resource_type: resourceType,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'mp4', 'mov', 'avi', 'mp3', 'wav'],
      transformation: transformation,
      // Generate thumbnail for images and videos
      eager: file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') ? [
        { width: 200, height: 200, crop: 'fill', quality: 'auto' }
      ] : undefined
    };
  },
});

// Configure multer for avatars
export const uploadavatar = multer({
  storage: avatarStorage,
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

// Configure multer for files
export const uploadFile = multer({
  storage: fileStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
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

// Utility function to delete files from Cloudinary
export const deleteFileFromCloudinary = async (fileUrl) => {
  try {
    if (!cloudinaryConfig.api_key) {
      console.warn('Cloudinary not configured, skipping file deletion');
      return;
    }
    
    if (fileUrl && fileUrl.includes('cloudinary.com')) {
      // Extract public ID from URL
      const urlParts = fileUrl.split('/');
      const publicIdWithExtension = urlParts.slice(-2).join('/');
      const publicId = publicIdWithExtension.split('.')[0];
      
      // Determine resource type based on URL path
      let resourceType = 'auto';
      if (fileUrl.includes('/image/') || fileUrl.includes('/images/')) {
        resourceType = 'image';
      } else if (fileUrl.includes('/video/') || fileUrl.includes('/videos/')) {
        resourceType = 'video';
      }
      
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    }
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }
};

export default cloudinary;