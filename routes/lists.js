const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET all lists for user
router.get('/', listController.getLists);

// GET single list with influencers
router.get('/:listId', listController.getList);

// POST create new list
router.post('/', listController.createList);

// PATCH update list
router.patch('/:listId', listController.updateList);

// DELETE list
router.delete('/:listId', listController.deleteList);

// POST add influencer to list
router.post('/:listId/influencers', listController.addInfluencerToList);

// DELETE remove influencer from list
router.delete('/:listId/influencers', listController.removeInfluencerFromList);

// POST bulk add influencers
router.post('/:listId/influencers/bulk-add', listController.bulkAddInfluencers);

// DELETE bulk remove influencers
router.delete('/:listId/influencers/bulk-remove', listController.bulkRemoveInfluencers);

module.exports = router;
