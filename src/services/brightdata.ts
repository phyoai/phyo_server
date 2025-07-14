import axios from 'axios';

interface BrightDataInfluencer {
  username: string;
  full_name: string;
  followers_count: number;
  following_count: number;
  biography: string;
  external_url?: string;
  profile_pic_url: string;
  is_private: boolean;
  is_verified: boolean;
  media_count: number;
  location?: string;
  category?: string;
  engagement_rate?: number;
  average_likes?: number;
  average_comments?: number;
  gender_distribution?: {
    male: number;
    female: number;
  };
  age_distribution?: {
    '13-17': number;
    '18-24': number;
    '25-34': number;
    '35-44': number;
    '45-64': number;
    '65+': number;
  };
  top_countries?: Array<{
    country: string;
    percentage: number;
  }>;
}

interface BrightDataSearchParams {
  query?: string;
  location?: string;
  category?: string;
  min_followers?: number;
  max_followers?: number;
  gender?: 'male' | 'female';
  age_range?: string;
  country?: string;
  limit?: number;
}

class BrightDataService {
  private apiKey: string;
  private baseUrl: string;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private readonly rateLimitDelay: number = 100; // 100ms between requests

  constructor() {
    this.apiKey = process.env.BRIGHTDATA_API_KEY || '';
    this.baseUrl = 'https://api.brightdata.com/instagram';
  }

  private async makeRequest(endpoint: string, params: any = {}): Promise<any> {
    try {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.rateLimitDelay) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
      }
      
      this.lastRequestTime = Date.now();
      this.requestCount++;

      console.log(`Bright Data API Request #${this.requestCount}: ${endpoint}`);

      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 10000 // 10 second timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('Bright Data API Error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          console.log('Rate limit hit, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.makeRequest(endpoint, params); // Retry once
        }
        
        if (error.response?.status === 404) {
          console.log(`Resource not found: ${endpoint}`);
          return null;
        }
        
        if (error.response?.status && error.response.status >= 500) {
          console.log('Server error from Bright Data, skipping...');
          return null;
        }
      }
      
      throw error;
    }
  }

  async searchInfluencers(params: BrightDataSearchParams): Promise<BrightDataInfluencer[]> {
    try {
      const searchParams: any = {};
      
      if (params.query) searchParams.q = params.query;
      if (params.location) searchParams.location = params.location;
      if (params.category) searchParams.category = params.category;
      if (params.min_followers) searchParams.min_followers = params.min_followers;
      if (params.max_followers) searchParams.max_followers = params.max_followers;
      if (params.gender) searchParams.gender = params.gender;
      if (params.age_range) searchParams.age_range = params.age_range;
      if (params.country) searchParams.country = params.country;
      if (params.limit) searchParams.limit = params.limit;

      console.log('Bright Data Search Params:', searchParams);

      const response = await this.makeRequest('/search', searchParams);
      const results = response?.data || [];
      
      console.log(`Bright Data search returned ${results.length} results`);
      return results;
    } catch (error) {
      console.error('Error searching influencers on Bright Data:', error);
      return [];
    }
  }

  async getInfluencerDetails(username: string): Promise<BrightDataInfluencer | null> {
    try {
      console.log(`Fetching details for: ${username}`);
      const response = await this.makeRequest(`/user/${username}`);
      return response?.data || null;
    } catch (error) {
      console.error(`Error getting influencer details for ${username}:`, error);
      return null;
    }
  }

  async getInfluencerAnalytics(username: string): Promise<any> {
    try {
      console.log(`Fetching analytics for: ${username}`);
      const response = await this.makeRequest(`/user/${username}/analytics`);
      return response?.data || null;
    } catch (error) {
      console.error(`Error getting analytics for ${username}:`, error);
      return null;
    }
  }

  async getInfluencerPosts(username: string, limit: number = 10): Promise<any[]> {
    try {
      console.log(`Fetching posts for: ${username} (limit: ${limit})`);
      const response = await this.makeRequest(`/user/${username}/posts`, { limit });
      return response?.data || [];
    } catch (error) {
      console.error(`Error getting posts for ${username}:`, error);
      return [];
    }
  }

  // Transform Bright Data response to match our local schema
  transformToLocalSchema(brightDataInfluencer: BrightDataInfluencer): any {
    return {
      name: brightDataInfluencer.full_name,
      user_name: brightDataInfluencer.username,
      categoryInstagram: brightDataInfluencer.category || '',
      categoryYouTube: '', // Bright Data is primarily Instagram-focused
      city: brightDataInfluencer.location || '',
      state: '',
      language: '',
      gender: 'Other', // Default since Bright Data doesn't provide this
      instagramData: {
        followers: brightDataInfluencer.followers_count,
        link: `https://instagram.com/${brightDataInfluencer.username}`,
        genderDistribution: brightDataInfluencer.gender_distribution ? [
          { gender: 'MALE', distribution: brightDataInfluencer.gender_distribution.male },
          { gender: 'FEMALE', distribution: brightDataInfluencer.gender_distribution.female }
        ] : [],
        ageDistribution: brightDataInfluencer.age_distribution ? Object.entries(brightDataInfluencer.age_distribution).map(([age, value]) => ({
          age,
          value
        })) : [],
        audienceByCountry: brightDataInfluencer.top_countries ? brightDataInfluencer.top_countries.map(country => ({
          category: 'country',
          name: country.country,
          value: country.percentage
        })) : [],
        collaborationCharges: {
          reel: 0,
          story: 0,
          post: 0,
          oneMonthDigitalRights: 0
        },
        engagement_rate: brightDataInfluencer.engagement_rate
      },
      youtubeData: {
        followers: 0,
        link: '',
        genderDistribution: [],
        ageDistribution: [],
        audienceByCountry: [],
        collaborationCharges: {
          reel: 0,
          story: 0,
          post: 0,
          oneMonthDigitalRights: 0
        }
      },
      averageLikes: brightDataInfluencer.average_likes || 0,
      averageViews: 0,
      averageComments: brightDataInfluencer.average_comments || 0,
      averageEngagement: brightDataInfluencer.engagement_rate || 0,
      image: brightDataInfluencer.profile_pic_url,
      source: 'brightdata', // Flag to identify data source
      biography: brightDataInfluencer.biography,
      is_verified: brightDataInfluencer.is_verified,
      media_count: brightDataInfluencer.media_count
    };
  }

  // Check if Bright Data API is available
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  // Get API usage statistics
  getUsageStats(): { requestCount: number; isAvailable: boolean } {
    return {
      requestCount: this.requestCount,
      isAvailable: this.isAvailable()
    };
  }
}

export default new BrightDataService(); 