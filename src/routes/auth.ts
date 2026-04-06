import express from 'express';
import { 
  handleSignup, 
  handleLogin, 
  handleForgotPassword, 
  handleResetPassword, 
  handleVerifyResetCode, 
  handleGetAllInfluencers, 
  handleGetInfluencerById,
  handleFacebookOAuth,
  handleGoogleOAuth,
  handleGoogleOAuthCallback,
  handleVerifyOTP,
  handleResendOTP,
  getRegistrationStatus
} from '../controllers/auth';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/signup', handleSignup);
router.post('/register', handleSignup);
router.post('/login', handleLogin);
router.post('/forgot-password', handleForgotPassword);
router.post('/reset-password', handleResetPassword);
router.post('/verify-code', handleVerifyResetCode);
router.post('/verify-reset-code', handleVerifyResetCode);

// OTP verification routes
router.post('/verify-otp', handleVerifyOTP);
router.post('/resend-otp', handleResendOTP);

// Google OAuth routes
router.post('/google', handleGoogleOAuth);
router.post('/facebook', handleFacebookOAuth);
router.get('/google/callback', handleGoogleOAuthCallback);

// Get registration status (protected route)
router.get('/registration-status', authenticateToken, getRegistrationStatus);

// Alias routes for client compatibility
router.post('/verify-email-otp', handleVerifyOTP);
router.post('/resend-email-otp', handleResendOTP);
router.post('/check-registration-status', authenticateToken, getRegistrationStatus);

router.get('/influencers', handleGetAllInfluencers);
router.get('/influencer/:id', handleGetInfluencerById);

export default router; 
