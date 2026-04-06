import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  createConversation, 
  getUserConversations, 
  getConversationById, 
  deleteConversation 
} from '../controllers/conversation';

const router = express.Router();

router.post('/', authenticateToken, createConversation);
router.get('/user', authenticateToken, getUserConversations);
router.get('/:id', authenticateToken, getConversationById);
router.delete('/:id', authenticateToken, deleteConversation);

export default router; 
