const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createConversation, getConversations, getConversationById, deleteConversation } = require('../controllers/conversationController');

router.post('/', authMiddleware, createConversation);
router.get('/', authMiddleware, getConversations);
router.get('/:id', authMiddleware, getConversationById);
router.delete('/:id', authMiddleware, deleteConversation);

module.exports = router;
