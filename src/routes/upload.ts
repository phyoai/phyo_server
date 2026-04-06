import express from 'express';
import { uploadChatImage, uploadChatFile, deleteChatFile } from '../controllers/upload';
import { uploadToS3, uploadImageToS3 } from '../services/s3';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Route to upload chat image (specific for images)
router.post('/chat-image', authenticateToken, uploadImageToS3.single('image'), uploadChatImage);

// Route to upload any chat file (documents, videos, audio, etc.)
router.post('/chat-file', authenticateToken, uploadToS3.single('file'), uploadChatFile);

// Route to delete chat file (works for both images and other files)
router.delete('/chat-file/:key', authenticateToken, deleteChatFile);

export default router; 