const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    createPortfolio, getAllPortfolios, getPortfolioById, updatePortfolio, deletePortfolio,
    addClient, updateClient, removeClient, getStats
} = require('../controllers/portfolioController');

router.post('/', authMiddleware, createPortfolio);
router.get('/', authMiddleware, getAllPortfolios);
router.get('/stats/:id', authMiddleware, getStats);
router.get('/:id', authMiddleware, getPortfolioById);
router.put('/:id', authMiddleware, updatePortfolio);
router.delete('/:id', authMiddleware, deletePortfolio);
router.post('/:id/clients', authMiddleware, addClient);
router.put('/:id/clients/:clientId', authMiddleware, updateClient);
router.delete('/:id/clients/:clientId', authMiddleware, removeClient);

module.exports = router;
