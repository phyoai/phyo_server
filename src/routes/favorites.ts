import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteCampaigns,
  getFavoriteInfluencers,
  getFavoriteBrands,
  toggleSavedInfluencer,
  removeSavedInfluencer,
  removeFavoriteByTypeAndItem,
  checkFavorite,
  clearAllFavorites
} from '../controllers/favorites';

const router = express.Router();

router.get('/', authenticateToken, getFavorites);
router.post('/', authenticateToken, addFavorite);
router.get('/campaigns', authenticateToken, getFavoriteCampaigns);
router.get('/influencers', authenticateToken, getFavoriteInfluencers);
router.get('/brands', authenticateToken, getFavoriteBrands);
router.get('/check/:type/:itemId', authenticateToken, checkFavorite);
router.delete('/clear-all', authenticateToken, clearAllFavorites);
router.post('/saved-influencers/:id', authenticateToken, toggleSavedInfluencer);
router.delete('/saved-influencers/:id', authenticateToken, removeSavedInfluencer);
router.delete('/:type/:itemId', authenticateToken, removeFavoriteByTypeAndItem);
router.delete('/:id', authenticateToken, removeFavorite);

export default router;
