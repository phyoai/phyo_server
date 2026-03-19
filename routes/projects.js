const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createProject, getAllProjects, getProjectById, updateProject, deleteProject, getProjectStats } = require('../controllers/projectController');

router.post('/', authMiddleware, createProject);
router.get('/', authMiddleware, getAllProjects);
router.get('/stats', authMiddleware, getProjectStats);
router.get('/:id', authMiddleware, getProjectById);
router.put('/:id', authMiddleware, updateProject);
router.delete('/:id', authMiddleware, deleteProject);

module.exports = router;
