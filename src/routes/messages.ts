import express from 'express';
import { 
  sendMessage, 
  getMessages, 
  markMessageAsRead, 
  deleteMessage 
} from '../controllers/message';

const router = express.Router();

router.post('/', sendMessage);
router.get('/:conversationId', getMessages);
router.patch('/:id/read', markMessageAsRead);
router.delete('/:id', deleteMessage);

export default router; 