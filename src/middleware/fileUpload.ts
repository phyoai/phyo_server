import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';

// Check if AWS credentials are configured
const isS3Configured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

// AWS S3 Configuration (only if credentials exist)
let s3Client: S3Client | null = null;
if (isS3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  });
}

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'phyo-brand-assets';

// File filter for images
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// File filter for documents
const documentFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and image files are allowed.'));
  }
};

// Local Storage Configuration - We'll use local storage and upload to S3 after
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine if this is influencer or brand upload based on field names
    const isInfluencerUpload = ['profile_picture', 'cover_photo', 'media_kit'].includes(file.fieldname);
    
    let uploadDir: string;
    
    if (isInfluencerUpload) {
      // For influencers, use Instagram username if available, otherwise email
      const instagramUsername = (req.body?.social_media?.instagram?.username) || 
                                (req.body?.contact?.email?.split('@')[0]) || 
                                'anonymous';
      const sanitizedUsername = instagramUsername.replace(/[^a-zA-Z0-9]/g, '_');
      uploadDir = path.join(__dirname, '../../uploads/influencers', sanitizedUsername);
    } else {
      // For brands, use email
      const userEmail = (req as any).user?.email || (req.body?.contact?.email) || 'anonymous';
      const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
      uploadDir = path.join(__dirname, '../../uploads/brands', sanitizedEmail);
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const fieldPrefix = file.fieldname.replace('_', '-');
    cb(null, `${fieldPrefix}-${uniqueSuffix}${ext}`);
  }
});

// Helper function to upload file to S3
export async function uploadToS3(filePath: string, key: string, contentType: string): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not configured. Please set AWS credentials in environment variables.');
  }

  const fileContent = fs.readFileSync(filePath);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: contentType
    // Removed ACL - your bucket doesn't allow ACLs
    // Make sure your bucket has public access configured via bucket policy instead
  });

  await s3Client.send(command);
  
  console.log(`✅ File uploaded to S3: ${key}`);
  
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}

// Use local storage for multer
const storage = localStorage;

// Image upload middleware
export const uploadBrandImages = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).fields([
  { name: 'company_logo', maxCount: 1 },
  { name: 'brand_images', maxCount: 10 }
]);

// Document upload middleware
export const uploadBrandDocuments = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).fields([
  { name: 'business_registration', maxCount: 1 },
  { name: 'authorization_letter', maxCount: 1 }
]);

// Combined upload middleware for all brand files
export const uploadBrandFiles = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log(`Uploading file: ${file.fieldname}, MIME type: ${file.mimetype}, Original name: ${file.originalname}`);
    
    // Allow both images and documents
    const allowedTypes = [
      // Images
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.error(`❌ Rejected file: ${file.originalname} with MIME type: ${file.mimetype}`);
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images (jpg, png, gif, webp, svg) and documents (pdf, doc, docx, xls, xlsx)`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).fields([
  { name: 'company_logo', maxCount: 1 },
  { name: 'brand_images', maxCount: 10 },
  { name: 'business_registration', maxCount: 1 },
  { name: 'authorization_letter', maxCount: 1 }
]);

// Combined upload middleware for all influencer files
export const uploadInfluencerFiles = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log(`Uploading influencer file: ${file.fieldname}, MIME type: ${file.mimetype}, Original name: ${file.originalname}`);
    
    // Allow both images and documents
    const allowedTypes = [
      // Images
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      // Documents (for media kit)
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.error(`❌ Rejected influencer file: ${file.originalname} with MIME type: ${file.mimetype}`);
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images (jpg, png, gif, webp, svg) and PDF documents`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).fields([
  { name: 'profile_picture', maxCount: 1 },
  { name: 'cover_photo', maxCount: 1 },
  { name: 'media_kit', maxCount: 1 }
]);

// Helper function to get file URL (after processing)
export const getFileUrl = async (
  file: Express.Multer.File, 
  userIdentifier: string,
  isInfluencer: boolean = false
): Promise<string> => {
  // Only S3 upload is supported - no local storage fallback
  if (!isS3Configured || !s3Client) {
    // Clean up the temp file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new Error('AWS S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION in environment variables.');
  }

  try {
    const sanitizedIdentifier = userIdentifier.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Auto-detect if influencer based on file path if not explicitly set
    const isInfluencerFile = isInfluencer || file.path.includes('uploads/influencers') || file.path.includes('uploads\\influencers');
    
    // Use different S3 path based on type
    const s3Key = isInfluencerFile
      ? `influencers/${sanitizedIdentifier}/${file.filename}`
      : `brands/${sanitizedIdentifier}/${file.filename}`;
    
    console.log(`📤 Uploading to S3: ${s3Key}`);
    
    const s3Url = await uploadToS3(file.path, s3Key, file.mimetype);
    
    // Delete local temp file after successful S3 upload
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
      console.log(`🗑️  Deleted temp file: ${file.path}`);
    }
    
    return s3Url;
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    console.error('❌ Error uploading to S3:', error);
    throw error;
  }
};

// Helper function to extract file URLs from request (async version)
export const extractFileUrls = async (
  files: { [fieldname: string]: Express.Multer.File[] } | undefined,
  userIdentifier: string,
  isInfluencer: boolean = false
) => {
  if (!files) return {};
  
  const fileUrls: any = {};
  
  for (const fieldName of Object.keys(files)) {
    const fieldFiles = files[fieldName];
    if (fieldFiles && fieldFiles.length > 0) {
      if (fieldName === 'brand_images') {
        // Multiple files - process all (brands only)
        fileUrls[fieldName] = await Promise.all(
          fieldFiles.map(file => getFileUrl(file, userIdentifier, isInfluencer))
        );
      } else {
        // Single file
        fileUrls[fieldName] = await getFileUrl(fieldFiles[0], userIdentifier, isInfluencer);
      }
    }
  }
  
  return fileUrls;
};
