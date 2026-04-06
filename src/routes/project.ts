import express from 'express';
import { authenticateToken, requireServiceProvider } from '../middleware/auth';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectStats
} from '../controllers/project';

const router = express.Router();

// Apply authentication and service provider role check to all routes
router.use(authenticateToken);
router.use(requireServiceProvider);

// Project routes
router.post('/', createProject);
router.get('/', getProjects);
router.get('/stats', getProjectStats);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router; 