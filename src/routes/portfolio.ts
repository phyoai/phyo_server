import express from 'express';
import { authenticateToken, requireServiceProvider } from '../middleware/auth';
import {
  createPortfolio,
  getPortfolios,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  addClient,
  updateClient,
  removeClient,
  getPortfolioStats
} from '../controllers/portfolio';

const router = express.Router();

// Apply authentication and service provider role check to all routes
router.use(authenticateToken);
router.use(requireServiceProvider);

// Portfolio routes
router.post('/', createPortfolio);
router.get('/', getPortfolios);
router.get('/stats', getPortfolioStats);
router.get('/:id', getPortfolioById);
router.put('/:id', updatePortfolio);
router.delete('/:id', deletePortfolio);

// Client management routes
router.post('/:portfolioId/clients', addClient);
router.put('/:portfolioId/clients/:clientId', updateClient);
router.delete('/:portfolioId/clients/:clientId', removeClient);

export default router; 