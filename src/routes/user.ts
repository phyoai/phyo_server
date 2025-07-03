import express from 'express';
import { 
  getUserProfile, 
  updateUserProfile, 
  getUserById, 
  searchUsers, 
  deleteUser 
} from '../controllers/user';

const router = express.Router();

router.get('/profile', getUserProfile);
router.patch('/profile', updateUserProfile);
router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.delete('/profile', deleteUser);

export default router; 