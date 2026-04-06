import axios from 'axios';
import Influencer from '../models/influencer';

const BRIGHTSCRAPER_URL = process.env.BRIGHTSCRAPER_URL || 'http://127.0.0.1:5000';
const CACHE_VALIDITY_DAYS = 15;
const PROFILE_PIC_CACHE_HOURS = 24; // Instagram CDN URLs expire within 24-48 hours

interface DemographicsData {
  username: string;
  profile_name: string;
  profile_pic_url?: string;
  followers: number;
  following: number;
  posts_count: number;
  biography: string;
  is_verified: boolean;
  is_business: boolean;
  avg_engagement: number;
  gender_distribution: {
    male: number;
    female: number;
    unknown: number;
  };
  age_distribution: Record<string, number>;
  country_distribution: Record<string, number>;
  city_distribution: Record<string, number>;
  language_distribution: Record<string, number>;
  audience_quality_score: number;
  fake_followers_percent: number;
  total_comments_analyzed: number;
  real_users_analyzed: number;
}

interface FetchResult {
  username: string;
  data?: DemographicsData;
  fromCache: boolean;
  error?: string;
  lastUpdated?: Date;
}

/**
 * Check if BrightScraper service is available
 */
async function checkBrightScraperHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${BRIGHTSCRAPER_URL}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch demographics from BrightScraper for a single username
 */
async function fetchDemographicsFromAPI(username: string, retries: number = 0): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log(`  → Fetching @${username} from BrightScraper... (attempt ${retries + 1}/3)`);

    const response = await axios.post(
      `${BRIGHTSCRAPER_URL}/analyze`,
      { username, max_posts: 6 },
      { timeout: 300000 } // Increased from 180s to 300s (5 min) for complex analysis
    );

    if (response.data && response.data.success) {
      let demo = response.data.data;

      // Handle new enhanced response format (with analytics)
      if (demo && demo.profile && demo.analytics) {
        // Map from new enhanced format to old flat format
        demo = {
          ...demo.profile,
          // Demographics from analytics (gender, age, country, city, language)
          gender_distribution: demo.analytics?.gender || { male: 0, female: 0 },
          age_distribution: demo.analytics?.ageRange || {},
          country_distribution: demo.analytics?.country || {},
          city_distribution: demo.analytics?.city || {},
          language_distribution: demo.analytics?.language || {},
          // Audience quality
          audience_quality_score: demo.analytics?.audienceQuality?.score || 0,
          fake_followers_percent: demo.analytics?.audienceQuality?.fakeFollowersPercent || 0,
          // Comment analysis
          total_comments_analyzed: demo.metrics?.commentsAnalyzed || 0,
          real_users_analyzed: demo.metrics?.realUsersAnalyzed || 0
        };
      }

      // Validate data
      if (demo.followers === 0 && demo.posts_count === 0) {
        return { success: false, error: 'Account does not exist or is private' };
      }

      console.log(`  ✓ Fetched @${username}: ${demo.followers} followers`);
      return { success: true, data: demo };
    } else {
      const errorMsg = response.data?.error || response.data?.message || 'Unknown error';
      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;

    // Retry on timeout or connection errors
    if ((error.code === 'ECONNABORTED' || error.message?.includes('timeout')) && retries < 2) {
      const backoffDelay = Math.pow(2, retries) * 1000; // 1s, 2s, 4s exponential backoff
      console.log(`  ⏳ Retry in ${backoffDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return fetchDemographicsFromAPI(username, retries + 1);
    }

    return { success: false, error: errorMsg };
  }
}

/**
 * Save/Update demographics in database
 */
async function saveDemographicsToDatabase(username: string, demo: any): Promise<void> {
  let existingInfluencer = await Influencer.findOne({ user_name: username });

  if (existingInfluencer) {
    // Update existing
    existingInfluencer.name = demo.profile_name || existingInfluencer.name || username;
    existingInfluencer.profile_name = demo.profile_name;
    existingInfluencer.profile_pic_url = demo.profile_pic_url || existingInfluencer.profile_pic_url;
    existingInfluencer.biography = demo.biography;
    existingInfluencer.is_verified = demo.is_verified;
    existingInfluencer.is_business = demo.is_business;
    existingInfluencer.lastDemographicsFetch = new Date();

    // Preserve existing collaboration charges
    let existingCollaborationCharges = {
      reel: 0,
      story: 0,
      post: 0,
      oneMonthDigitalRights: 0
    };

    if (existingInfluencer.instagramData?.collaborationCharges) {
      existingCollaborationCharges = {
        reel: existingInfluencer.instagramData.collaborationCharges.reel || 0,
        story: existingInfluencer.instagramData.collaborationCharges.story || 0,
        post: existingInfluencer.instagramData.collaborationCharges.post || 0,
        oneMonthDigitalRights: existingInfluencer.instagramData.collaborationCharges.oneMonthDigitalRights || 0
      };
    }

    existingInfluencer.instagramData = {
      followers: demo.followers,
      following: demo.following,
      posts_count: demo.posts_count,
      avg_engagement: demo.avg_engagement,
      genderDistribution: [
        { gender: 'MALE', distribution: demo.gender_distribution?.male || 0 },
        { gender: 'FEMALE', distribution: demo.gender_distribution?.female || 0 },
        { gender: 'UNKNOWN', distribution: demo.gender_distribution?.unknown || 0 }
      ],
      ageDistribution: Object.entries(demo.age_distribution || {}).map(([age, value]) => ({ age, value: value as number })),
      audienceByCountry: Object.entries(demo.country_distribution || {}).map(([name, value]) => ({ name, value: value as number, category: '' })),
      audienceByCity: Object.entries(demo.city_distribution || {}).map(([name, value]) => ({ name, value: value as number })),
      languageDistribution: Object.entries(demo.language_distribution || {}).map(([language, value]) => ({ language, value: value as number })),
      audienceQualityScore: demo.audience_quality_score,
      fakeFollowersPercent: demo.fake_followers_percent,
      totalCommentsAnalyzed: demo.total_comments_analyzed,
      realUsersAnalyzed: demo.real_users_analyzed,
      collaborationCharges: existingCollaborationCharges
    };

    await existingInfluencer.save();
  } else {
    // Create new
    await Influencer.create({
      user_name: username,
      name: demo.profile_name || username,
      profile_name: demo.profile_name,
      profile_pic_url: demo.profile_pic_url || '',
      biography: demo.biography,
      is_verified: demo.is_verified,
      is_business: demo.is_business,
      city: '',
      state: '',
      categoryInstagram: '',
      lastDemographicsFetch: new Date(),
      instagramData: {
        followers: demo.followers,
        following: demo.following,
        posts_count: demo.posts_count,
        avg_engagement: demo.avg_engagement,
        genderDistribution: [
          { gender: 'MALE', distribution: demo.gender_distribution?.male || 0 },
          { gender: 'FEMALE', distribution: demo.gender_distribution?.female || 0 },
          { gender: 'UNKNOWN', distribution: demo.gender_distribution?.unknown || 0 }
        ],
        ageDistribution: Object.entries(demo.age_distribution || {}).map(([age, value]) => ({ age, value: value as number })),
        audienceByCountry: Object.entries(demo.country_distribution || {}).map(([name, value]) => ({ name, value: value as number, category: '' })),
        audienceByCity: Object.entries(demo.city_distribution || {}).map(([name, value]) => ({ name, value: value as number })),
        languageDistribution: Object.entries(demo.language_distribution || {}).map(([language, value]) => ({ language, value: value as number })),
        audienceQualityScore: demo.audience_quality_score,
        fakeFollowersPercent: demo.fake_followers_percent,
        totalCommentsAnalyzed: demo.total_comments_analyzed,
        realUsersAnalyzed: demo.real_users_analyzed,
        collaborationCharges: {
          reel: 0,
          story: 0,
          post: 0,
          oneMonthDigitalRights: 0
        }
      }
    });
  }
}

/**
 * Convert influencer model to demographics format
 */
function influencerToDemographics(influencer: any): FetchResult {
  return {
    username: influencer.user_name,
    data: {
      username: influencer.user_name,
      profile_name: influencer.profile_name,
      profile_pic_url: influencer.profile_pic_url || '',
      followers: influencer.instagramData?.followers || 0,
      following: influencer.instagramData?.following || 0,
      posts_count: influencer.instagramData?.posts_count || 0,
      biography: influencer.biography || '',
      is_verified: influencer.is_verified || false,
      is_business: influencer.is_business || false,
      avg_engagement: influencer.instagramData?.avg_engagement || 0,
      gender_distribution: {
        male: influencer.instagramData?.genderDistribution?.find((g: any) => g.gender === 'MALE')?.distribution || 0,
        female: influencer.instagramData?.genderDistribution?.find((g: any) => g.gender === 'FEMALE')?.distribution || 0,
        unknown: influencer.instagramData?.genderDistribution?.find((g: any) => g.gender === 'UNKNOWN')?.distribution || 0
      },
      age_distribution: influencer.instagramData?.ageDistribution?.reduce((acc: any, item: any) => {
        acc[item.age] = item.value;
        return acc;
      }, {}) || {},
      country_distribution: influencer.instagramData?.audienceByCountry?.reduce((acc: any, item: any) => {
        acc[item.name] = item.value;
        return acc;
      }, {}) || {},
      city_distribution: influencer.instagramData?.audienceByCity?.reduce((acc: any, item: any) => {
        acc[item.name] = item.value;
        return acc;
      }, {}) || {},
      language_distribution: influencer.instagramData?.languageDistribution?.reduce((acc: any, item: any) => {
        acc[item.language] = item.value;
        return acc;
      }, {}) || {},
      audience_quality_score: influencer.instagramData?.audienceQualityScore || 0,
      fake_followers_percent: influencer.instagramData?.fakeFollowersPercent || 0,
      total_comments_analyzed: influencer.instagramData?.totalCommentsAnalyzed || 0,
      real_users_analyzed: influencer.instagramData?.realUsersAnalyzed || 0
    },
    fromCache: true,
    lastUpdated: influencer.lastDemographicsFetch
  };
}

/**
 * Fetch demographics for multiple usernames with caching
 * This is the main function to be used by the controller
 */
export async function fetchDemographicsForUsernames(usernames: string[]): Promise<{
  results: FetchResult[];
  brightScraperAvailable: boolean;
}> {
  console.log(`\n📊 Fetching demographics for ${usernames.length} username(s)...`);

  const cacheValidityMs = CACHE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
  const profilePicValidityMs = PROFILE_PIC_CACHE_HOURS * 60 * 60 * 1000;
  const now = new Date();
  
  const results: FetchResult[] = [];
  const usernamesNeedingFetch: string[] = [];
  const usernamesNeedingProfilePicRefresh: string[] = [];

  // Step 1: Check cache
  console.log('[STEP 1] Checking database cache...');
  for (const username of usernames) {
    const existingInfluencer = await Influencer.findOne({ user_name: username });

    if (existingInfluencer?.lastDemographicsFetch) {
      const timeSinceLastFetch = now.getTime() - new Date(existingInfluencer.lastDemographicsFetch).getTime();
      const daysSinceLastFetch = Math.floor(timeSinceLastFetch / (24 * 60 * 60 * 1000));
      const hoursSinceLastFetch = Math.floor(timeSinceLastFetch / (60 * 60 * 1000));

      if (timeSinceLastFetch < cacheValidityMs) {
        // Check if profile picture URL needs refresh (Instagram CDN URLs expire)
        if (timeSinceLastFetch >= profilePicValidityMs) {
          console.log(`  ⚠️  Cache HIT but profile pic may be stale: @${username} (${hoursSinceLastFetch}h old)`);
          usernamesNeedingProfilePicRefresh.push(username);
        } else {
          console.log(`  ✓ Cache HIT: @${username} (${daysSinceLastFetch} days old)`);
        }
        results.push(influencerToDemographics(existingInfluencer));
        continue;
      } else {
        console.log(`  ↻ Cache EXPIRED: @${username} (${daysSinceLastFetch} days old)`);
      }
    } else {
      console.log(`  ✗ Cache MISS: @${username}`);
    }

    usernamesNeedingFetch.push(username);
  }

  console.log(`\nCache Summary: ${results.length} cached, ${usernamesNeedingFetch.length} need fetch, ${usernamesNeedingProfilePicRefresh.length} need profile pic refresh`);

  // Step 1.5: Refresh profile pictures for stale URLs
  if (usernamesNeedingProfilePicRefresh.length > 0) {
    console.log('\n[STEP 1.5] Refreshing stale profile pictures...');
    
    const isAvailable = await checkBrightScraperHealth();
    if (isAvailable) {
      // Refresh profile pictures in parallel but with individual error handling
      const refreshPromises = usernamesNeedingProfilePicRefresh.map(async (username) => {
        try {
          console.log(`  → Refreshing profile pic for @${username}...`);
          const response = await axios.post(
            `${BRIGHTSCRAPER_URL}/refresh_profile_pic`,
            { username },
            { timeout: 90000 } // Increased to 90 seconds for BrightData snapshot delays
          );
          
          if (response.data?.success && response.data?.profile_pic_url) {
            // Update only the profile picture URL in the database
            await Influencer.updateOne(
              { user_name: username },
              { 
                $set: { 
                  profile_pic_url: response.data.profile_pic_url,
                  lastDemographicsFetch: new Date() // Update timestamp to prevent re-fetch
                } 
              }
            );
            
            // Update the result that was already added
            const resultIndex = results.findIndex(r => r.username === username);
            if (resultIndex !== -1 && results[resultIndex].data) {
              results[resultIndex].data!.profile_pic_url = response.data.profile_pic_url;
              console.log(`  ✅ Updated profile pic for @${username}`);
            }
            
            return { username, success: true };
          } else {
            console.log(`  ⚠️  No profile pic URL in response for @${username}`);
            return { username, success: false, error: 'No profile pic URL' };
          }
        } catch (error: any) {
          console.log(`  ⚠️  Failed to refresh profile pic for @${username}: ${error.message}`);
          // Continue with cached data even if refresh fails
          return { username, success: false, error: error.message };
        }
      });
      
      // Wait for all refreshes to complete (with timeout)
      const refreshResults = await Promise.allSettled(refreshPromises);
      const successCount = refreshResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      console.log(`  Profile pic refresh: ${successCount}/${usernamesNeedingProfilePicRefresh.length} succeeded`);
    } else {
      console.log('  ⚠️  BrightScraper unavailable, using cached profile pics');
    }
  }

  // Step 2: Fetch missing data
  if (usernamesNeedingFetch.length > 0) {
    console.log('\n[STEP 2] Fetching from BrightScraper...');

    // Check if service is available
    const isAvailable = await checkBrightScraperHealth();
    if (!isAvailable) {
      console.error(`❌ BrightScraper not available at ${BRIGHTSCRAPER_URL}`);
      
      // Add error results for missing usernames
      for (const username of usernamesNeedingFetch) {
        results.push({
          username,
          fromCache: false,
          error: `BrightScraper service unavailable at ${BRIGHTSCRAPER_URL}`
        });
      }

      return { results, brightScraperAvailable: false };
    }

    console.log(`✅ BrightScraper is available`);

    // Fetch ALL usernames in PARALLEL for speed
    console.log(`  🚀 Fetching ${usernamesNeedingFetch.length} profiles in parallel...`);
    
    const fetchPromises = usernamesNeedingFetch.map(async (username) => {
      const fetchResult = await fetchDemographicsFromAPI(username);

      if (fetchResult.success && fetchResult.data) {
        // Save to database
        try {
          await saveDemographicsToDatabase(username, fetchResult.data);
          console.log(`  ✓ Saved @${username} to database`);

          return {
            username,
            data: fetchResult.data,
            fromCache: false,
            lastUpdated: new Date()
          };
        } catch (dbError: any) {
          console.error(`  ✗ DB save error for @${username}:`, dbError.message);
          return {
            username,
            fromCache: false,
            error: `Failed to save: ${dbError.message}`
          };
        }
      } else {
        console.log(`  ✗ Failed to fetch @${username}: ${fetchResult.error}`);
        return {
          username,
          fromCache: false,
          error: fetchResult.error
        };
      }
    });

    // Wait for all fetches to complete
    const fetchResults = await Promise.all(fetchPromises);
    results.push(...fetchResults);
  }

  const successCount = results.filter(r => !r.error).length;
  const failCount = results.filter(r => r.error).length;
  
  console.log(`\n✅ Fetch complete: ${successCount} success, ${failCount} failed\n`);

  return { results, brightScraperAvailable: true };
}
