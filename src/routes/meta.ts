import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  handleGetMetaOAuthUrl,
  handleMetaOAuthCallback,
  handleGetMetaConnectionStatus,
  handleGetMetaAdAccounts,
  handleDisconnectMeta,
  handleGetCampaignInsights,
  handleGetAdAccountDetails,
  handleGetPageInsights,
  getConnectedAccounts,
  getMetaDashboard,
  getFacebookInsights,
  syncFacebookMetrics,
  getSyncHistory,
  disconnectMeta
} from '../controllers/meta';

const router = express.Router();

// OAuth routes
router.post('/connect', authenticateToken, handleMetaOAuthCallback);  // Frontend OAuth callback (maps to oauth/callback handler)
router.get('/oauth/url', authenticateToken, handleGetMetaOAuthUrl);   // Get OAuth URL
router.get('/oauth/callback', handleMetaOAuthCallback);               // Standard OAuth callback
router.get('/status', authenticateToken, handleGetMetaConnectionStatus);

// Account management - Frontend expects /accounts
router.get('/accounts', authenticateToken, getConnectedAccounts);
router.get('/connected-accounts', authenticateToken, getConnectedAccounts);

// Ad account routes
router.get('/ad-accounts', authenticateToken, handleGetMetaAdAccounts);

// Campaign & insights routes (for frontend's campaign-specific queries)
router.get('/campaigns/:adAccountId', authenticateToken, handleGetCampaignInsights);
router.get('/ad-account/:adAccountId', authenticateToken, handleGetAdAccountDetails);
router.get('/page-insights', authenticateToken, handleGetPageInsights);

// ===== FRONTEND-COMPATIBLE ENDPOINTS =====
router.get('/dashboard', authenticateToken, getMetaDashboard);
router.get('/facebook/insights', authenticateToken, getFacebookInsights);

// Sync endpoints - support both patterns
router.post('/sync', authenticateToken, syncFacebookMetrics);
router.post('/sync/:campaignId', authenticateToken, syncFacebookMetrics);

// Metrics and insights by campaign ID
router.get('/metrics/:campaignId', authenticateToken, handleGetCampaignInsights);
router.get('/insights/:campaignId', authenticateToken, handleGetCampaignInsights);

// Sync history
router.get('/sync-history', authenticateToken, getSyncHistory);

// Disconnect - support both DELETE and POST
router.delete('/disconnect', authenticateToken, disconnectMeta);
router.post('/disconnect', authenticateToken, disconnectMeta);

export default router;
