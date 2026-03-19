const { uploadToS3 } = require('../middleware/upload');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const result = await uploadToS3(req.file, 'chat-uploads');

        res.status(201).json({
            success: true,
            data: {
                url: result.url,
                key: result.key,
                size: result.size
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const { key } = req.body;

        if (!key) {
            return res.status(400).json({ success: false, message: 'File key required' });
        }

        const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET || 'phyo-brand-asset',
            Key: key
        });

        await s3Client.send(command);

        res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
