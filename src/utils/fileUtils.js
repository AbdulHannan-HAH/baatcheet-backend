// [file name]: fileUtils.js
// [file content begin]
import fs from 'fs';
import path from 'path';

export const deleteOldFile = async (fileUrl) => {
  try {
    if (fileUrl && fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), fileUrl);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Deleted file:', filePath);
      }
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};
// [file content end]