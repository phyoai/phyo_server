import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();

// S3 bucket configuration
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'phyo-chat-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Configure multer for S3 upload
export const uploadToS3 = multer({
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
        uploadedAt: new Date().toISOString()
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
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
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

export default { uploadToS3, deleteFromS3, getSignedUrl, checkS3Configuration }; 