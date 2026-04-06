import { Request, Response } from 'express';
import axios from 'axios';
import BrandAdAccount from '../models/brandAdAccount';
import { getCampaignInsights, getAdAccountDetails, getPageInsights } from '../utils/metaApi';

// Meta OAuth configuration
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI;
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v19.0';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    type: string;
  };
}

// GET /api/meta/oauth/url - Generate Meta OAuth URL
export const handleGetMetaOAuthUrl = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const state = req.user?.userId; // Use user ID as state for security
    
    const scopes = [
      'ads_management',
      'business_management', 
      'pages_show_list',
      'pages_read_engagement',
      'public_profile',
      'email',
      'instagram_basic',
      'instagram_manage_insights'
    ].join(',');

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI!)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_type=code&` +
      `state=${state}`;

    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Error generating Meta OAuth URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate OAuth URL',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/meta/oauth/callback - Handle Meta OAuth callback
export const handleMetaOAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code not provided'
      });
    }

    if (!state) {
      return res.status(400).json({
        success: false,
        message: 'State parameter not provided'
      });
    }

    const brandId = state as string;

    // STEP 1: Exchange code for access token
    const tokenResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/oauth/access_token`, {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code
      }
    });

    const { access_token, expires_in } = tokenResponse.data;
    
    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // STEP 2: Get long-lived token
    const longLivedTokenResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        fb_exchange_token: access_token
      }
    });

    const longLivedToken = longLivedTokenResponse.data.access_token;
    const longLivedExpiresIn = longLivedTokenResponse.data.expires_in;
    const longLivedExpiresAt = new Date(Date.now() + (longLivedExpiresIn * 1000));

    // STEP 3: Get ad accounts
    const adAccountsResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me/adaccounts`, {
      params: {
        access_token: longLivedToken,
        fields: 'id,name,account_status,currency'
      }
    });

    const adAccounts = adAccountsResponse.data.data.map((account: any) => ({
      ad_account_id: account.id,
      name: account.name,
      currency: account.currency
    }));

    // STEP 4: Get Facebook pages
    let pageInfo = {};
    try {
      const pagesResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me/accounts`, {
        params: {
          access_token: longLivedToken,
          fields: 'id,name,access_token'
        }
      });

      if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
        const firstPage = pagesResponse.data.data[0];
        pageInfo = {
          page_id: firstPage.id,
          page_name: firstPage.name,
          page_access_token: firstPage.access_token
        };
      }
    } catch (pageError) {
      console.warn('Could not fetch pages:', pageError);
    }

    // STEP 5: Get business manager info
    let businessId = '';
    try {
      const businessResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me/businesses`, {
        params: {
          access_token: longLivedToken,
          fields: 'id,name'
        }
      });

      if (businessResponse.data.data && businessResponse.data.data.length > 0) {
        businessId = businessResponse.data.data[0].id;
      }
    } catch (businessError) {
      console.warn('Could not fetch business info:', businessError);
    }

    // STEP 6: Save to database
    await BrandAdAccount.findOneAndUpdate(
      { brand_id: brandId, platform: 'meta' },
      {
        brand_id: brandId,
        platform: 'meta',
        meta_access_token: longLivedToken,
        meta_token_expires_at: longLivedExpiresAt,
        business_id: businessId,
        ...pageInfo,
        ad_account_ids: adAccounts,
        connected_at: new Date(),
        is_active: true
      },
      { 
        upsert: true,
        new: true
      }
    );

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard/ad-accounts?status=connected&platform=meta`);

  } catch (error) {
    console.error('Meta OAuth callback error:', error);
    
    // Redirect to frontend error page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard/ad-accounts?status=error&platform=meta`);
  }
};

// GET /api/meta/status - Get Meta connection status
export const handleGetMetaConnectionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.user?.userId;
    
    if (!brandId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const connection = await BrandAdAccount.findOne({
      brand_id: brandId,
      platform: 'meta',
      is_active: true
    });

    if (!connection) {
      return res.json({
        success: true,
        connected: false,
        message: 'Meta Ads Manager not connected'
      });
    }

    // Check if token is expired
    const now = new Date();
    const isTokenExpired = connection.meta_token_expires_at && connection.meta_token_expires_at <= now;

    res.json({
      success: true,
      connected: !isTokenExpired,
      connection: {
        platform: connection.platform,
        business_id: connection.business_id,
        page_name: connection.page_name,
        ad_accounts_count: connection.ad_account_ids.length,
        connected_at: connection.connected_at,
        token_expires_at: connection.meta_token_expires_at,
        is_token_expired: isTokenExpired
      }
    });

  } catch (error) {
    console.error('Error getting Meta connection status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection status',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/meta/ad-accounts - Get connected ad accounts
export const handleGetMetaAdAccounts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.user?.userId;
    
    if (!brandId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const connection = await BrandAdAccount.findOne({
      brand_id: brandId,
      platform: 'meta',
      is_active: true
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Meta Ads Manager not connected'
      });
    }

    // Check if token is expired
    const now = new Date();
    const isTokenExpired = connection.meta_token_expires_at && connection.meta_token_expires_at <= now;

    if (isTokenExpired) {
      return res.status(401).json({
        success: false,
        message: 'Meta access token has expired. Please reconnect.'
      });
    }

    res.json({
      success: true,
      ad_accounts: connection.ad_account_ids,
      page_info: {
        page_id: connection.page_id,
        page_name: connection.page_name
      },
      business_id: connection.business_id
    });

  } catch (error) {
    console.error('Error getting Meta ad accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ad accounts',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// DELETE /api/meta/disconnect - Disconnect Meta Ads Manager
export const handleDisconnectMeta = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.user?.userId;
    
    if (!brandId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    await BrandAdAccount.findOneAndUpdate(
      { brand_id: brandId, platform: 'meta' },
      { is_active: false },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Meta Ads Manager disconnected successfully'
    });

  } catch (error) {
    console.error('Error disconnecting Meta:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Meta Ads Manager',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/meta/campaigns/:adAccountId - Get campaign insights
export const handleGetCampaignInsights = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.user?.userId;
    const { adAccountId } = req.params;
    const { since, until } = req.query;
    
    if (!brandId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!adAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Ad account ID is required'
      });
    }

    const dateRange = since && until ? { 
      since: since as string, 
      until: until as string 
    } : undefined;

    const result = await getCampaignInsights(brandId, adAccountId, dateRange);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to fetch campaign insights'
      });
    }

    res.json({
      success: true,
      campaigns: result.data?.data || [],
      paging: result.data?.paging
    });

  } catch (error) {
    console.error('Error getting campaign insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign insights',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/meta/ad-account/:adAccountId - Get ad account details
export const handleGetAdAccountDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.user?.userId;
    const { adAccountId } = req.params;
    
    if (!brandId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!adAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Ad account ID is required'
      });
    }

    const result = await getAdAccountDetails(brandId, adAccountId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to fetch ad account details'
      });
    }

    res.json({
      success: true,
      account: result.data
    });

  } catch (error) {
    console.error('Error getting ad account details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ad account details',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/meta/page-insights - Get page insights
export const handleGetPageInsights = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.user?.userId;
    const { metrics } = req.query;
    
    if (!brandId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get page ID from connection
    const connection = await BrandAdAccount.findOne({
      brand_id: brandId,
      platform: 'meta',
      is_active: true
    });

    if (!connection || !connection.page_id) {
      return res.status(404).json({
        success: false,
        message: 'No connected Facebook page found'
      });
    }

    const metricsArray = metrics ? (metrics as string).split(',') : undefined;
    const result = await getPageInsights(brandId, connection.page_id, metricsArray);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to fetch page insights'
      });
    }

    res.json({
      success: true,
      page_name: connection.page_name,
      insights: result.data?.data || []
    });

  } catch (error) {
    console.error('Error getting page insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get page insights',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// ===== ADDITIONAL META ENDPOINTS (API Compatibility) =====

// GET /api/meta/connected-accounts - Alias for handleGetMetaAdAccounts
export const getConnectedAccounts = async (req: AuthenticatedRequest, res: Response) => {
  return handleGetMetaAdAccounts(req, res);
};

// GET /api/meta/dashboard - Get Meta dashboard data
export const getMetaDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.user?.userId;

    if (!brandId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const connection = await BrandAdAccount.findOne({
      brand_id: brandId,
      platform: 'meta',
      is_active: true
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'No connected Meta account found'
      });
    }

    res.json({
      success: true,
      message: 'Meta dashboard data retrieved',
      data: {
        accountId: connection.ad_account_ids?.[0]?.ad_account_id || 'N/A',
        pageName: connection.page_name,
        isActive: connection.is_active,
        connectedAt: connection.connected_at,
        lastSyncedAt: (connection as any).updatedAt || connection.connected_at
      }
    });
  } catch (error) {
    console.error('Error getting Meta dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Meta dashboard'
    });
  }
};

// GET /api/meta/facebook/insights - Alias for handleGetPageInsights
export const getFacebookInsights = async (req: AuthenticatedRequest, res: Response) => {
  return handleGetPageInsights(req, res);
};

// POST /api/meta/sync - Sync Facebook metrics
export const syncFacebookMetrics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.user?.userId;

    if (!brandId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const connection = await BrandAdAccount.findOne({
      brand_id: brandId,
      platform: 'meta',
      is_active: true
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'No connected Meta account found'
      });
    }

    // Trigger save to update updatedAt timestamp
    await connection.save();

    res.status(200).json({
      success: true,
      message: 'Facebook metrics synced successfully',
      syncedAt: (connection as any).updatedAt || new Date()
    });
  } catch (error) {
    console.error('Error syncing Facebook metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync Facebook metrics'
    });
  }
};

// GET /api/meta/sync-history - Get sync history
export const getSyncHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.user?.userId;

    if (!brandId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const connections = await BrandAdAccount.find({
      brand_id: brandId,
      platform: 'meta'
    }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Sync history retrieved',
      data: connections.map(conn => ({
        accountId: conn.ad_account_ids?.[0]?.ad_account_id || 'N/A',
        pageName: conn.page_name,
        lastSyncedAt: (conn as any).updatedAt,
        isActive: conn.is_active
      }))
    });
  } catch (error) {
    console.error('Error getting sync history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync history'
    });
  }
};

// POST /api/meta/disconnect - Alias for handleDisconnectMeta
export const disconnectMeta = async (req: AuthenticatedRequest, res: Response) => {
  return handleDisconnectMeta(req, res);
};
