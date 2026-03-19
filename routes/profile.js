const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get profile data
router.get('/full', profileController.getFullProfile);
router.get('/summary', profileController.getProfileSummary);
router.get('/verification-status', profileController.getVerificationStatus);

// Update personal information
router.put('/personal-info', profileController.updatePersonalInfo);

// Update professional information
router.put('/professional-info', profileController.updateProfessionalInfo);

// Update social statistics
router.put('/social-stats', profileController.updateSocialStats);

// Image management
router.post('/upload-image', profileController.uploadProfileImage);
router.post('/delete-image', profileController.deleteProfileImage);

// Password management
router.post('/change-password', profileController.changePassword);

// Email management
router.put('/update-email', profileController.updateEmail);
router.post('/send-email-verification-otp', profileController.sendEmailVerificationOTP);
router.post('/verify-email-with-otp', profileController.verifyEmailWithOTP);

// Phone management
router.put('/update-phone', profileController.updatePhone);

module.exports = router;
