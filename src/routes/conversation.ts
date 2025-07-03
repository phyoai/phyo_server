import express from 'express';
import { 
  createConversation, 
  getUserConversations, 
  getConversationById, 
  deleteConversation 
} from '../controllers/conversation';

const router = express.Router();

router.post('/', createConversation);
router.get('/user', getUserConversations);
router.get('/:id', getConversationById);
router.delete('/:id', deleteConversation);

export default router; 