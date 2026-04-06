import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// S3 bucket configuration
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'phyo-chat-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for general files
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/aac'];

// All allowed types combined
const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES
];

// Configure multer for S3 upload with different configurations
export const uploadToS3 = multer({
  storage: multerS3({
    s3: s3 as any,
    bucket: BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const fileExtension = path.extname(file.originalname);
      const fileName = `chat-media/${uuidv4()}${fileExtension}`;
      cb(null, fileName);
    },
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        fileType: file.mimetype
      });
    }
  }),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please check supported file types.'));
    }
  }
});

// Specific upload for images only
export const uploadImageToS3 = multer({
  storage: multerS3({
    s3: s3 as any,
    bucket: BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const fileExtension = path.extname(file.originalname);
      const fileName = `chat-images/${uuidv4()}${fileExtension}`;
      cb(null, fileName);
    },
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        fileType: file.mimetype
      });
    }
  }),
  limits: {
    fileSize: MAX_IMAGE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  }
});



// Function to delete file from S3
export const deleteFromS3 = async (key: string): Promise<void> => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };
    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

// Function to get signed URL for private access
export const getSignedUrl = (key: string, expirationTime: number = 3600): string => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expirationTime
  };
  return s3.getSignedUrl('getObject', params);
};

// Function to get public URL for uploaded files
export const getPublicUrl = (key: string): string => {
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
};

// Function to check if S3 is properly configured
export const checkS3Configuration = async (): Promise<boolean> => {
  try {
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
    return true;
  } catch (error) {
    console.error('S3 configuration error:', error);
    return false;
  }
};

// Helper function to get file type category
export const getFileTypeCategory = (mimeType: string): 'image' | 'document' | 'video' | 'audio' | 'other' => {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) return 'document';
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
  if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return 'audio';
  return 'other';
};

// Helper function to validate file type
export const isValidFileType = (mimeType: string): boolean => {
  return ALLOWED_MIME_TYPES.includes(mimeType);
};

export default { 
  uploadToS3, 
  uploadImageToS3,
  deleteFromS3, 
  getSignedUrl, 
  getPublicUrl,
  checkS3Configuration,
  getFileTypeCategory,
  isValidFileType
}; 