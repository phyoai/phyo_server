const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
    createInfluencer, getAllInfluencers, searchInfluencers, searchByName, searchByUsername,
    advancedSearch, getInfluencerById, getInfluencerByUsername, updateInfluencerById,
    updateInfluencerByUsername, deleteInfluencerById, deleteInfluencerByUsername, getStatistics
} = require('../controllers/influencerDataController');

router.post('/', authMiddleware, adminMiddleware, createInfluencer);
router.get('/', authMiddleware, getAllInfluencers);
router.get('/search', authMiddleware, searchInfluencers);
router.get('/search/name', authMiddleware, searchByName);
router.get('/search/username', authMiddleware, searchByUsername);
router.get('/search/advanced', authMiddleware, advancedSearch);
router.get('/stats', authMiddleware, getStatistics);
router.get('/:id', authMiddleware, getInfluencerById);
router.get('/username/:username', authMiddleware, getInfluencerByUsername);
router.patch('/:id', authMiddleware, adminMiddleware, updateInfluencerById);
router.patch('/username/:username', authMiddleware, adminMiddleware, updateInfluencerByUsername);
router.delete('/:id', authMiddleware, adminMiddleware, deleteInfluencerById);
router.delete('/username/:username', authMiddleware, adminMiddleware, deleteInfluencerByUsername);

module.exports = router;
