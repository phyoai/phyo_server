import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  addListInfluencers,
  bulkUpdateListInfluencers,
  createList,
  deleteList,
  exportList,
  getListById,
  getLists,
  removeListInfluencer,
  updateListInfluencer
} from '../controllers/list';

const router = express.Router();

router.get('/', authenticateToken, getLists);
router.post('/', authenticateToken, createList);
router.get('/:id', authenticateToken, getListById);
router.get('/:id/export', authenticateToken, exportList);
router.post('/:id/influencers', authenticateToken, addListInfluencers);
router.patch('/:id/influencers/bulk', authenticateToken, bulkUpdateListInfluencers);
router.patch('/:id/influencers/:itemId', authenticateToken, updateListInfluencer);
router.delete('/:id/influencers/:itemId', authenticateToken, removeListInfluencer);
router.delete('/:id', authenticateToken, deleteList);

export default router;
