import express from 'express';
import { 
  handleSignup, 
  handleLogin, 
  handleForgotPassword, 
  handleResetPassword, 
  handleVerifyResetCode, 
  handleGetAllInfluencers, 
  handleGetInfluencerById 
} from '../controllers/auth';

const router = express.Router();

router.post('/signup', handleSignup);
router.post('/login', handleLogin);
router.post('/forgot-password', handleForgotPassword);
router.post('/reset-password', handleResetPassword);
router.post('/verify-code', handleVerifyResetCode);

router.get('/influencers', handleGetAllInfluencers);
router.get('/influencer/:id', handleGetInfluencerById);

export default router; 