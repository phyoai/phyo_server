import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  getUserProfile, 
  updateUserProfile, 
  getUserById, 
  searchUsers, 
  deleteUser 
} from '../controllers/user';

const router = express.Router();

router.get('/profile', authenticateToken, getUserProfile);
router.patch('/profile', authenticateToken, updateUserProfile);
router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.delete('/profile', authenticateToken, deleteUser);

export default router; 