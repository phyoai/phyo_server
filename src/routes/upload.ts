import express from 'express';
import { uploadChatImage, deleteChatImage } from '../controllers/upload';
import { uploadToS3 } from '../services/s3';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Route to upload chat image
router.post('/chat-image', authenticateToken, uploadToS3.single('image'), uploadChatImage);

// Route to delete chat image
router.delete('/chat-image/:key', authenticateToken, deleteChatImage);

export default router; 