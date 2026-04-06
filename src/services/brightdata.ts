import axios, { AxiosResponse } from 'axios';

// Bright Data API configuration
const BRIGHT_DATA_API_BASE = 'https://api.brightdata.com/datasets/v3/trigger';
const BRIGHT_DATA_SNAPSHOT_BASE = 'https://api.brightdata.com/datasets/v3/snapshot';
const BRIGHT_DATA_PROGRESS_BASE = 'https://api.brightdata.com/datasets/v3/progress';
const BRIGHT_DATA_API_TOKEN = '06da4e4a-d78c-4a0b-8c36-19f1f6b43326';

// Bright Data dataset IDs for Instagram scrapers
const INSTAGRAM_PROFILES_DATASET_ID = 'gd_l1vikfch901nx3by4';
const INSTAGRAM_POSTS_DATASET_ID = 'gd_lk5ns7kz21pck8jpis';
const INSTAGRAM_REELS_DATASET_ID = 'gd_lyclm20il4r5helnj';

// Bright Data API response interfaces
export interface BrightDataInstagramProfile {
  account: string;
  fbid: string;
  id: string;
  followers: number;
  posts_count: number;
  is_business_account: boolean;
  is_professional_account?: boolean;
  is_verified?: boolean;
  biography?: string;
  profile_pic_url?: string;
  category?: string;
  city?: string;
  external_url?: string;
}

export interface BrightDataInstagramPost {
  url: string;
  user_posted: string;
  description: string;
  hashtags: string[];
  num_comments: number;
  date_posted: string;
  likes?: number;
  views?: number;
  photos?: string[];
}

export interface BrightDataApiResponse<T> {
  success: boolean;
  data: T[];
  error?: string;
}

class BrightDataService {
  private apiToken: string;

  constructor() {
    this.apiToken = BRIGHT_DATA_API_TOKEN || '';
    if (!this.apiToken) {
      console.warn('BRIGHT_DATA_API_TOKEN not found. Bright Data integration will be disabled.');
    }
  }

  private async makeApiCall<T>(datasetId: string, urls: string[], retries = 2): Promise<T[]> {
    if (!this.apiToken) {
      throw new Error('Bright Data API token not configured');
    }

    // Format payload exactly as specified: [{"url":"https://www.instagram.com/username/"}]
    const payload = urls.map(url => ({ url }));
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`Making API call to Bright Data with payload:`, payload);
        console.log(`Using API token: ${this.apiToken.substring(0, 10)}...`);
        
        const response: AxiosResponse = await axios.post(
          `${BRIGHT_DATA_API_BASE}?dataset_id=${datasetId}&include_errors=true`,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );

        // Handle the response structure with potential errors
        const responseData = response.data;
        
        // If response is an array, return it directly
        if (Array.isArray(responseData)) {
          return responseData;
        }
        
        // If response has a data property, return that
        if (responseData && responseData.data) {
          return Array.isArray(responseData.data) ? responseData.data : [];
        }
        
        // If response has results property, return that
        if (responseData && responseData.results) {
          return Array.isArray(responseData.results) ? responseData.results : [];
        }
        
        // Fallback to empty array
        return [];
        
      } catch (error: any) {
        const isLastAttempt = attempt === retries;
        
        if (error.code === 'ECONNABORTED' || error.code === 'TIMEOUT') {
          console.warn(`Bright Data API timeout on attempt ${attempt + 1}/${retries + 1}`);
        } else if (error.response?.status >= 500) {
          console.warn(`Bright Data API server error (${error.response.status}) on attempt ${attempt + 1}/${retries + 1}`);
        } else if (error.response?.status === 429) {
          console.warn(`Bright Data API rate limit exceeded on attempt ${attempt + 1}/${retries + 1}`);
        } else if (error.response?.status === 401) {
          console.error('Bright Data API authentication failed. Please check your API token.');
          console.error('Response data:', error.response?.data);
          throw new Error('Bright Data API authentication failed. Invalid or expired API token.');
        } else if (error.response?.status >= 400 && error.response?.status < 500) {
          // Don't retry on client errors (4xx)
          console.error('Bright Data API client error:', error.response?.data || error.message);
          throw new Error(`Bright Data API error: ${error.response?.status} ${error.response?.statusText}`);
        }
        
        if (isLastAttempt) {
          console.error('Bright Data API error after all retries:', error);
          throw new Error('Failed to fetch data from Bright Data API after retries');
        }
        
        // Exponential backoff: wait 1s, then 2s, then 4s
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    return [];
  }

  /**
   * Scrape Instagram profiles data with dynamic snapshot handling
   */
  async scrapeInstagramProfiles(usernames: string[]): Promise<BrightDataInstagramProfile[]> {
    const urls = usernames.map(username => `https://www.instagram.com/${username}/`);
    console.log(`Scraping profiles for URLs:`, urls);
    
    try {
      // Make the API call to trigger scraping
      const triggerResponse = await this.makeApiCall<BrightDataInstagramProfile>(INSTAGRAM_PROFILES_DATASET_ID, urls);
      
      // If the response contains a snapshot ID, wait for completion and fetch results
      if (triggerResponse && typeof triggerResponse === 'object' && 'snapshot_id' in triggerResponse) {
        const snapshotId = (triggerResponse as any).snapshot_id;
        console.log(`Snapshot created: ${snapshotId}`);
        
        // Wait for the snapshot to complete
        const results = await this.waitForSnapshotCompletion<BrightDataInstagramProfile>(snapshotId);
        return results;
      }
      
      // If response is already an array of profiles, return it directly
      if (Array.isArray(triggerResponse)) {
        console.log(`Received ${triggerResponse.length} profile results from Bright Data`);
        
        // Log each result for debugging
        triggerResponse.forEach((profile, index) => {
          console.log(`Profile ${index + 1}:`, {
            account: profile.account,
            followers: profile.followers,
            posts_count: profile.posts_count,
            is_verified: profile.is_verified,
            is_business_account: profile.is_business_account
          });
        });
        
        return triggerResponse;
      }
      
      console.warn('Unexpected response format from Bright Data API');
      return [];
    } catch (error) {
      console.error('Error scraping Instagram profiles:', error);
      return [];
    }
  }

  /**
   * Wait for a snapshot to complete and fetch its data
   */
  private async waitForSnapshotCompletion<T>(snapshotId: string, maxWaitTime = 120000): Promise<T[]> {
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds
    
    console.log(`Waiting for snapshot ${snapshotId} to complete...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const progress = await this.checkProgress(snapshotId);
        
        if (progress.status === 'completed' || progress.status === 'ready') {
          console.log(`Snapshot ${snapshotId} ${progress.status}, fetching data...`);
          const results = await this.fetchSnapshotData(snapshotId);
          console.log(`Fetched ${results.length} items from snapshot`);
          return results as T[];
        } else if (progress.status === 'failed') {
          console.error(`Snapshot ${snapshotId} failed:`, progress);
          return [];
        } else {
          console.log(`Snapshot ${snapshotId} still processing... (${progress.progress || 0}%)`);
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error(`Error checking snapshot ${snapshotId} progress:`, error);
        return [];
      }
    }
    
    console.error(`Snapshot ${snapshotId} timed out after ${maxWaitTime / 1000} seconds`);
    return [];
  }

  /**
   * Scrape Instagram posts data with dynamic snapshot handling
   */
  async scrapeInstagramPosts(postUrls: string[]): Promise<BrightDataInstagramPost[]> {
    console.log(`Scraping posts for URLs:`, postUrls);
    
    try {
      // Make the API call to trigger scraping
      const triggerResponse = await this.makeApiCall<BrightDataInstagramPost>(INSTAGRAM_POSTS_DATASET_ID, postUrls);
      
      // If the response contains a snapshot ID, wait for completion and fetch results
      if (triggerResponse && typeof triggerResponse === 'object' && 'snapshot_id' in triggerResponse) {
        const snapshotId = (triggerResponse as any).snapshot_id;
        console.log(`Posts snapshot created: ${snapshotId}`);
        
        // Wait for the snapshot to complete
        const results = await this.waitForSnapshotCompletion<BrightDataInstagramPost>(snapshotId);
        return results;
      }
      
      // If response is already an array of posts, return it directly
      if (Array.isArray(triggerResponse)) {
        console.log(`Received ${triggerResponse.length} post results from Bright Data`);
        
        // Log each result for debugging
        triggerResponse.forEach((post, index) => {
          console.log(`Post ${index + 1}:`, {
            url: post.url,
            user_posted: post.user_posted,
            num_comments: post.num_comments,
            likes: post.likes,
            views: post.views,
            hashtags: post.hashtags?.slice(0, 3) // Show first 3 hashtags
          });
        });
        
        return triggerResponse;
      }
      
      console.warn('Unexpected response format from Bright Data API for posts');
      return [];
    } catch (error) {
      console.error('Error scraping Instagram posts:', error);
      return [];
    }
  }

  /**
   * Search for Instagram influencers by keywords using search functionality
   * This would use Bright Data's search capabilities to find influencers
   */
  async searchInfluencersByKeywords(keywords: string[], location?: string, minFollowers?: number): Promise<BrightDataInstagramProfile[]> {
    // This would be a more advanced implementation that uses Bright Data's search capabilities
    // For now, we'll return empty array as this requires more complex search implementation
    console.log('Keyword search not yet implemented:', { keywords, location, minFollowers });
    return [];
  }

  /**
   * Test the Bright Data API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Bright Data API connection...');
      console.log(`Using API token: ${this.apiToken.substring(0, 10)}...`);
      
      // Try to scrape a well-known Instagram profile as a test
      const testResults = await this.scrapeInstagramProfiles(['instagram']);
      
      if (testResults.length > 0) {
        console.log('✅ Bright Data API connection successful');
        return true;
      } else {
        console.log('⚠️  Bright Data API connection test returned no results');
        return false;
      }
    } catch (error) {
      console.error('❌ Bright Data API connection test failed:', error);
      if (error instanceof Error && error.message.includes('authentication failed')) {
        console.error('🔑 Authentication issue detected. Please verify your API token.');
      }
      return false;
    }
  }

  /**
   * Fetch data from a Bright Data snapshot
   */
  async fetchSnapshotData(snapshotId: string): Promise<BrightDataInstagramProfile[]> {
    if (!this.apiToken) {
      throw new Error('Bright Data API token not configured');
    }

    try {
      console.log(`Fetching snapshot data for ID: ${snapshotId}`);
      
      const response: AxiosResponse = await axios.get(
        `${BRIGHT_DATA_SNAPSHOT_BASE}/${snapshotId}?format=json`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout for snapshot data
        }
      );

      console.log('Snapshot response received:', {
        status: response.status,
        dataLength: Array.isArray(response.data) ? response.data.length : 'not array'
      });

      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }

      console.warn('Unexpected snapshot response format:', response.data);
      return [];
    } catch (error: any) {
      console.error('Error fetching snapshot data:', error);
      throw new Error(`Failed to fetch snapshot data: ${error.message}`);
    }
  }

  /**
   * Check the progress of a Bright Data request
   */
  async checkProgress(snapshotId: string): Promise<any> {
    if (!this.apiToken) {
      throw new Error('Bright Data API token not configured');
    }

    try {
      console.log(`Checking progress for snapshot ID: ${snapshotId}`);
      
      const response: AxiosResponse = await axios.get(
        `${BRIGHT_DATA_PROGRESS_BASE}/${snapshotId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('Progress response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error checking progress:', error);
      throw new Error(`Failed to check progress: ${error.message}`);
    }
  }

  /**
   * Fetch a single Instagram profile using the POST/GET snapshot flow
   */
  async fetchSingleProfileByUrl(instagramUrl: string): Promise<BrightDataInstagramProfile | null> {
    if (!this.apiToken) {
      throw new Error('Bright Data API token not configured');
    }
    try {
      console.log(`Fetching single profile for URL: ${instagramUrl}`);
      
      // 1. Trigger the scrape
      const triggerUrl = `${BRIGHT_DATA_API_BASE}?dataset_id=${INSTAGRAM_PROFILES_DATASET_ID}&include_errors=true`;
      const payload = [{ url: instagramUrl }];
      
      console.log(`Trigger URL: ${triggerUrl}`);
      console.log(`Payload:`, payload);
      
      const triggerResponse = await axios.post(triggerUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      console.log(`Trigger response:`, triggerResponse.data);
      
      const snapshotId = triggerResponse.data && triggerResponse.data.snapshot_id;
      if (!snapshotId) {
        console.error('No snapshot_id returned from Bright Data trigger:', triggerResponse.data);
        return null;
      }
      
      console.log(`Snapshot ID received: ${snapshotId}`);
      
      // 2. Poll for completion
      const profileArr = await this.waitForSnapshotCompletion<BrightDataInstagramProfile>(snapshotId);
      if (profileArr && profileArr.length > 0) {
        console.log(`Profile data retrieved successfully`);
        return profileArr[0];
      }
      
      console.log(`No profile data found in snapshot`);
      return null;
    } catch (error) {
      console.error('Error in fetchSingleProfileByUrl:', error);
      return null;
    }
  }

  /**
   * Enhanced: Get real-time profile data for a username using the POST/GET snapshot flow
   */
  async getEnhancedProfileData(username: string): Promise<{
    profile: BrightDataInstagramProfile | null;
    recentPosts: BrightDataInstagramPost[];
  }> {
    try {
      if (!username) return { profile: null, recentPosts: [] };
      
      console.log(`Getting enhanced profile data for username: ${username}`);
      const url = `https://www.instagram.com/${username}/`;
      console.log(`Instagram URL: ${url}`);
      
      const profile = await this.fetchSingleProfileByUrl(url);
      
      if (profile) {
        console.log(`Profile found for ${username}:`, {
          account: profile.account,
          followers: profile.followers,
          posts_count: profile.posts_count
        });
      } else {
        console.log(`No profile found for ${username}`);
      }
      
      // (Optional) You could add logic here to fetch posts as well, if needed
      return { profile, recentPosts: [] };
    } catch (error) {
      console.error('Failed to get enhanced profile data:', error);
      return { profile: null, recentPosts: [] };
    }
  }

  /**
   * Scrape Instagram reel data from a URL
   */
  async scrapeInstagramReel(reelUrl: string): Promise<BrightDataInstagramPost | null> {
    if (!this.apiToken) {
      throw new Error('Bright Data API token not configured');
    }

    try {
      console.log(`Scraping Instagram reel from URL: ${reelUrl}`);
      
      // Use the Instagram reels dataset with the correct API structure
      const payload = [{
        url: reelUrl,
        start_date: "",
        end_date: ""
      }];
      
      const triggerUrl = `${BRIGHT_DATA_API_BASE}?dataset_id=${INSTAGRAM_REELS_DATASET_ID}&include_errors=true&type=discover_new&discover_by=url`;
      
      const response = await axios.post(triggerUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('Reel trigger response:', response.data);
      
      // Check if response contains a snapshot ID
      if (response.data && response.data.snapshot_id) {
        const snapshotId = response.data.snapshot_id;
        console.log(`Reel snapshot created: ${snapshotId}`);
        
        // Wait for the snapshot to complete
        const results = await this.waitForSnapshotCompletion<BrightDataInstagramPost>(snapshotId);
        return results.length > 0 ? results[0] : null;
      }
      
      // If response is already an array of posts, return the first one
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log(`Received reel data from Bright Data:`, {
          url: response.data[0].url,
          user_posted: response.data[0].user_posted,
          num_comments: response.data[0].num_comments,
          likes: response.data[0].likes,
          views: response.data[0].views,
          hashtags: response.data[0].hashtags?.slice(0, 3)
        });
        
        return response.data[0];
      }
      
      console.warn('No reel data received from Bright Data API');
      return null;
    } catch (error) {
      console.error('Error scraping Instagram reel:', error);
      return null;
    }
  }

  /**
   * Check if Bright Data service is available
   */
  isAvailable(): boolean {
    return !!this.apiToken;
  }
}

export default new BrightDataService(); 