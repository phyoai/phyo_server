const express = require('express');
const router = express.Router();
const {
    signup,
    login,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    verifyEmailOTP,
    resendEmailOTP,
    checkRegistrationStatus,
    adminLogin,
    googleAuth
} = require('../controllers/authController');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);
router.post('/verify-email-otp', verifyEmailOTP);
router.post('/resend-email-otp', resendEmailOTP);
router.get('/check-registration-status', checkRegistrationStatus);
router.post('/admin/login', adminLogin);
router.post('/google', googleAuth);

module.exports = router;
