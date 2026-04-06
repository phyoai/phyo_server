import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getUserProfile,
  updateUserProfile,
  getUserById,
  searchUsers,
  deleteUser,
  changePassword,
  uploadAvatar,
  listUsers,
  updateUserLocation
} from '../controllers/user';

const router = express.Router();

router.get('/profile', authenticateToken, getUserProfile);
router.patch('/profile', authenticateToken, updateUserProfile);
router.get('/search', searchUsers);
router.get('/list', listUsers);
router.put('/change-password', authenticateToken, changePassword);
router.post('/upload-avatar', authenticateToken, uploadAvatar);
router.post('/location', authenticateToken, updateUserLocation);
router.delete('/profile', authenticateToken, deleteUser);
router.get('/:id', getUserById);

export default router; 