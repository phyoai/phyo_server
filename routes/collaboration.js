const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Send and manage collaboration requests
router.post('/request', collaborationController.sendCollaborationRequest);
router.get('/requests', collaborationController.getCollaborationRequests);
router.post('/requests/:requestId/accept', collaborationController.acceptCollaborationRequest);
router.post('/requests/:requestId/reject', collaborationController.rejectCollaborationRequest);

// Active collaborations
router.get('/active', collaborationController.getActiveCollaborations);
router.post('/:collaborationId/end', collaborationController.endCollaboration);

// Statistics
router.get('/stats', collaborationController.getCollaborationStats);

module.exports = router;
