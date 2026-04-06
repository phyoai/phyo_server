import express from 'express';
import {
  sendMessage,
  sendMessageWithFile,
  getMessages,
  getAllMessages,
  markMessageAsRead,
  deleteMessage
} from '../controllers/message';
import {
  createConversation,
  getUserConversations,
  getConversationById,
  deleteConversation
} from '../controllers/conversation';
import { uploadToS3 } from '../services/s3';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// ===== CONVERSATION ROUTES =====
// GET /api/messages/conversations - Get all conversations for user
router.get('/conversations', authenticateToken, getUserConversations);

// POST /api/messages/conversations - Create new conversation
router.post('/conversations', authenticateToken, createConversation);

// GET /api/messages/conversations/:id - Get conversation by ID
router.get('/conversations/:id', authenticateToken, getConversationById);

// DELETE /api/messages/conversations/:id - Delete conversation
router.delete('/conversations/:id', authenticateToken, deleteConversation);

// ===== MESSAGE ROUTES =====
// GET /api/messages - Get all messages for user
router.get('/', authenticateToken, getAllMessages);

// Route to send text message
router.post('/', authenticateToken, sendMessage);

// Route to send message with file upload
router.post('/with-file', authenticateToken, uploadToS3.single('file'), sendMessageWithFile);

// GET /api/messages/:conversationId - Get messages in specific conversation
router.get('/:conversationId', authenticateToken, getMessages);

// Mark message as read
router.patch('/:id/read', authenticateToken, markMessageAsRead);

// Delete message
router.delete('/:id', authenticateToken, deleteMessage);

export default router; 