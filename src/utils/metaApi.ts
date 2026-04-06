import axios from 'axios';
import BrandAdAccount from '../models/brandAdAccount';

const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export interface MetaApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get valid access token for a brand's Meta account
 * Checks if token exists and is not expired
 */
export async function getValidMetaToken(brandId: string): Promise<string | null> {
  try {
    const connection = await BrandAdAccount.findOne({
      brand_id: brandId,
      platform: 'meta',
      is_active: true
    });

    if (!connection || !connection.meta_access_token) {
      return null;
    }

    // Check if token is expired
    const now = new Date();
    if (connection.meta_token_expires_at && connection.meta_token_expires_at <= now) {
      return null;
    }

    return connection.meta_access_token;
  } catch (error) {
    console.error('Error getting Meta token:', error);
    return null;
  }
}

/**
 * Make authenticated request to Meta Graph API
 */
export async function metaApiRequest<T = any>(
  endpoint: string, 
  accessToken: string, 
  params?: Record<string, any>
): Promise<MetaApiResponse<T>> {
  try {
    const response = await axios.get(`${FACEBOOK_GRAPH_URL}${endpoint}`, {
      params: {
        access_token: accessToken,
        ...params
      }
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Meta API request error:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Meta API request failed'
    };
  }
}

/**
 * Get campaign insights for an ad account
 */
export async function getCampaignInsights(
  brandId: string,
  adAccountId: string,
  dateRange?: { since: string; until: string }
): Promise<MetaApiResponse> {
  const accessToken = await getValidMetaToken(brandId);
  
  if (!accessToken) {
    return {
      success: false,
      error: 'Meta access token not available or expired'
    };
  }

  const params: any = {
    fields: 'campaign_name,impressions,clicks,spend,cpm,cpc,ctr,objective,status',
    level: 'campaign'
  };

  if (dateRange) {
    params.time_range = JSON.stringify(dateRange);
  }

  return metaApiRequest(`/${adAccountId}/insights`, accessToken, params);
}

/**
 * Get ad account details
 */
export async function getAdAccountDetails(
  brandId: string,
  adAccountId: string
): Promise<MetaApiResponse> {
  const accessToken = await getValidMetaToken(brandId);
  
  if (!accessToken) {
    return {
      success: false,
      error: 'Meta access token not available or expired'
    };
  }

  return metaApiRequest(
    `/${adAccountId}`, 
    accessToken, 
    { fields: 'id,name,account_status,currency,balance,spend_cap,timezone_name' }
  );
}

/**
 * Get page insights (for brands with connected pages)
 */
export async function getPageInsights(
  brandId: string,
  pageId: string,
  metrics: string[] = ['page_fans', 'page_engaged_users', 'page_impressions']
): Promise<MetaApiResponse> {
  const connection = await BrandAdAccount.findOne({
    brand_id: brandId,
    platform: 'meta',
    is_active: true
  });

  if (!connection || !connection.page_access_token) {
    return {
      success: false,
      error: 'Page access token not available'
    };
  }

  return metaApiRequest(
    `/${pageId}/insights`, 
    connection.page_access_token, 
    { 
      metric: metrics.join(','),
      period: 'day',
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
      until: new Date().toISOString().split('T')[0]
    }
  );
}
