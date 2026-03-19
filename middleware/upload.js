const multer = require('multer');
const { Upload } = require('@aws-sdk/lib-storage');
const { S3Client } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

const uploadToS3 = async (file, folder = 'uploads') => {
    if (!file) throw new Error('No file provided');

    const filename = `${folder}/${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;

    const uploader = new Upload({
        client: s3Client,
        params: {
            Bucket: process.env.AWS_S3_BUCKET || 'phyo-brand-asset',
            Key: filename,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
        }
    });

    try {
        const result = await uploader.done();
        return {
            url: `https://${process.env.AWS_S3_BUCKET || 'phyo-brand-asset'}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${filename}`,
            key: filename,
            size: file.size
        };
    } catch (error) {
        throw new Error(`S3 upload failed: ${error.message}`);
    }
};

module.exports = { upload, uploadToS3 };
