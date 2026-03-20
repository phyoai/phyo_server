const express = require('express');
const router = express.Router();
const helpSupportController = require('../controllers/helpSupportController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes (no authentication needed)
router.get('/faqs', helpSupportController.getFAQs);
router.get('/faqs/:category', helpSupportController.getFAQsByCategory);
router.get('/articles', helpSupportController.getArticles);
router.get('/articles/:slug', helpSupportController.getArticle);
router.post('/contact', helpSupportController.submitContactForm);

// Protected routes (authentication required)
router.post('/tickets', authMiddleware, helpSupportController.createSupportTicket);
router.get('/tickets', authMiddleware, helpSupportController.getMyTickets);
router.get('/tickets/:id', authMiddleware, helpSupportController.getTicketDetail);

module.exports = router;
