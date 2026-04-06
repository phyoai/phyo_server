import { Request, Response } from 'express';
import axios from 'axios';
import Influencer from '../models/influencer';
import BrightDataService, { BrightDataInstagramProfile } from '../services/brightdata';
import { 
  AskRequest, 
  AskResponse, 
  ProcessedRequirements,
  EnhancedInfluencer,
  IInfluencer
} from '../types';
import { extractUsernameFromPrompt, isSpecificUsernameQuery, extractMultipleUsernames } from '../utils/usernameExtractor';

// Perplexity API Configuration
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

/**
 * Helper function to enhance influencer data with Bright Data real-time information
 */
async function enhanceInfluencerWithBrightData(influencer: IInfluencer): Promise<EnhancedInfluencer> {
  const enhanced: EnhancedInfluencer = { ...influencer };

  try {
    if (!BrightDataService.isAvailable()) {
      console.log('Bright Data service not available for influencer:', influencer.user_name);
      return enhanced;
    }

    // Extract username from Instagram URL or use the user_name field
    let username = influencer.user_name;
    
    // Clean the username - remove any @ symbols and extra spaces
    if (username) {
      username = username.replace(/^@/, '').trim();
    }
    
    // Try to extract from Instagram link if available
    if (influencer.instagramData?.link) {
      const match = influencer.instagramData.link.match(/instagram\.com\/([^\/\?]+)/);
      if (match) {
        username = match[1].replace(/^@/, '').trim();
      }
    }

    if (!username) {
      console.log('No valid username found for influencer:', influencer.user_name);
      return enhanced;
    }

    console.log(`Enhancing influencer ${influencer.user_name} with username: ${username}`);

    // Get enhanced profile data from Bright Data
    const brightDataResult = await BrightDataService.getEnhancedProfileData(username);
    
    if (brightDataResult.profile) {
      const profile = brightDataResult.profile;
      console.log(`Bright Data profile found for ${username}:`, {
        account: profile.account,
        followers: profile.followers,
        posts_count: profile.posts_count
      });
      
      enhanced.brightDataProfile = {
        // Send all profile data directly
        ...profile,
        
        // Add metadata
        lastUpdated: new Date().toISOString(),
        profileUrl: `https://www.instagram.com/${profile.account}/`
      };
    } else {
      console.log(`No Bright Data profile found for ${username}`);
    }

    if (brightDataResult.recentPosts && brightDataResult.recentPosts.length > 0) {
      console.log(`Bright Data posts found for ${username}: ${brightDataResult.recentPosts.length} posts`);
      
      enhanced.brightDataPosts = {
        // Send all posts data directly
        posts: brightDataResult.recentPosts,
        postsCount: brightDataResult.recentPosts.length,
        lastUpdated: new Date().toISOString()
      };
    } else {
      console.log(`No Bright Data posts found for ${username}`);
    }

  } catch (error) {
    console.warn(`Failed to enhance influencer ${influencer.user_name} with Bright Data:`, error);
  }

  return enhanced;
}

/**
 * Helper function to enhance multiple influencers with Bright Data
 */
async function enhanceInfluencersWithBrightData(influencers: IInfluencer[]): Promise<{
  enhancedInfluencers: EnhancedInfluencer[];
  brightDataStatus: { enabled: boolean; profilesEnhanced: number; errors: number; };
}> {
  const brightDataStatus = {
    enabled: BrightDataService.isAvailable(),
    profilesEnhanced: 0,
    errors: 0
  };

  if (!brightDataStatus.enabled) {
    console.log('Bright Data service not available, returning basic influencer data');
    return {
      enhancedInfluencers: influencers.map(inf => ({ ...inf })),
      brightDataStatus
    };
  }

  // Test Bright Data connection
  console.log('Testing Bright Data connection...');
  try {
    const connectionTest = await BrightDataService.testConnection();
    console.log(`Bright Data connection test result: ${connectionTest}`);
  } catch (error) {
    console.error('Bright Data connection test failed:', error);
  }

  const enhancedInfluencers: EnhancedInfluencer[] = [];

  // Process influencers in batches to avoid overwhelming the API
  const batchSize = 5;
  console.log(`Processing ${influencers.length} influencers in batches of ${batchSize}`);
  
  for (let i = 0; i < influencers.length; i += batchSize) {
    const batch = influencers.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(influencers.length/batchSize)}`);
    
    const batchPromises = batch.map(async (influencer) => {
      try {
        const enhanced = await enhanceInfluencerWithBrightData(influencer);
        
        if (enhanced.brightDataProfile || enhanced.brightDataPosts) {
          brightDataStatus.profilesEnhanced++;
          console.log(`✅ Enhanced influencer: ${influencer.user_name}`);
        } else {
          console.log(`⚠️  No Bright Data found for: ${influencer.user_name}`);
        }
        
        return enhanced;
        
      } catch (error) {
        brightDataStatus.errors++;
        console.error(`❌ Error enhancing influencer ${influencer.user_name}:`, error);
        return { ...influencer };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    enhancedInfluencers.push(...batchResults);

    // Add a small delay between batches to be respectful to the API
    if (i + batchSize < influencers.length) {
      console.log('Waiting 1 second before next batch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { enhancedInfluencers, brightDataStatus };
}

interface AIResponse {
  searchCriteria: {
    city: string;
    state: string;
    minFollowers: number;
    maxFollowers: number;
    category: string;
  };
  usernames: string[];
}

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

export const handleAsk = async (req: Request<{}, AskResponse, AskRequest>, res: Response<AskResponse>): Promise<void> => {
  const { prompt } = req.body;
  
  try {
    console.log('='.repeat(60));
    console.log('NEW FLOW: AI Generates Usernames + Fetch Demographics');
    console.log('='.repeat(60));
    
    // EDGE CASE: Check if user is asking for specific username(s)
    const multipleUsernames = extractMultipleUsernames(prompt);
    const specificUsername = extractUsernameFromPrompt(prompt);
    const isSpecificQuery = isSpecificUsernameQuery(prompt);
    
    console.log('DEBUG: extractMultipleUsernames result:', multipleUsernames);
    console.log('DEBUG: extractUsernameFromPrompt result:', specificUsername);
    console.log('DEBUG: isSpecificUsernameQuery result:', isSpecificQuery);
    
    // Additional validation: Check if any extracted usernames exist in DB or look valid
    let validatedUsernames: string[] = [];
    
    if (multipleUsernames.length > 0 || (specificUsername && isSpecificQuery)) {
      const usernamesToCheck = multipleUsernames.length > 0 ? multipleUsernames : [specificUsername!];
      
      // Check if at least one username exists in DB or has username-like characteristics
      for (const username of usernamesToCheck) {
        const existsInDb = await Influencer.findOne({ user_name: username });
        const hasUsernamePattern = /[\d_]/.test(username) || username.length >= 8;
        
        if (existsInDb || hasUsernamePattern) {
          validatedUsernames.push(username);
        } else {
          console.log(`⚠️  Rejecting '${username}' - doesn't look like a valid Instagram username`);
        }
      }
      
      // If no valid usernames found, fall back to AI generation
      if (validatedUsernames.length === 0) {
        console.log('⚠️  No valid usernames detected - proceeding with AI generation flow\n');
      }
    }
    
    // Check if user is asking for specific usernames (either single or multiple)
    if (validatedUsernames.length > 0) {
      const usernamesToFetch = validatedUsernames;
      
      console.log(`\n🎯 DETECTED SPECIFIC USERNAME QUERY: ${usernamesToFetch.length} username(s)`);
      console.log(`   Usernames: ${usernamesToFetch.map(u => '@' + u).join(', ')}`);
      console.log('Skipping AI generation, directly fetching data...\n');
      
      // Process each username
      console.log('[STEP 1] Checking database for existing data...');
      const CACHE_VALIDITY_DAYS = 15;
      const cacheValidityMs = CACHE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
      const now = new Date();
      
      const usernamesNeedingFetch: string[] = [];
      const cachedResults: any[] = [];
      
      // Check each username in the database
      for (const username of usernamesToFetch) {
        const existingInfluencer = await Influencer.findOne({ user_name: username });
        
        if (existingInfluencer) {
          const lastFetched = existingInfluencer.lastDemographicsFetch;
          
          if (lastFetched) {
            const timeSinceLastFetch = now.getTime() - new Date(lastFetched).getTime();
            const daysSinceLastFetch = Math.floor(timeSinceLastFetch / (24 * 60 * 60 * 1000));
            
            if (timeSinceLastFetch < cacheValidityMs && !isNaN(daysSinceLastFetch)) {
              console.log(`  ✓ Found cached data for @${username} (fetched ${daysSinceLastFetch} days ago)`);
              cachedResults.push(existingInfluencer);
            } else {
              console.log(`  ↻ Cache expired for @${username} (${daysSinceLastFetch} days old) - will re-fetch`);
              usernamesNeedingFetch.push(username);
            }
          } else {
            console.log(`  ↻ No fetch timestamp for @${username} - will fetch`);
            usernamesNeedingFetch.push(username);
          }
        } else {
          console.log(`  + Username @${username} not in database - will fetch`);
          usernamesNeedingFetch.push(username);
        }
      }
      
      console.log(`\n  Cache Summary:`);
      console.log(`    - Using cached: ${cachedResults.length}`);
      console.log(`    - Need to fetch: ${usernamesNeedingFetch.length}`);
      
      // Fetch demographics for usernames that need it
      const fetchedResults: any[] = [];
      
      if (usernamesNeedingFetch.length > 0) {
        console.log('\n[STEP 2] Fetching demographics from BrightScraper API...');
        const BRIGHTSCRAPER_URL = process.env.BRIGHTSCRAPER_URL || 'http://127.0.0.1:5000';
        
        // Check if BrightScraper service is available
        let brightScraperAvailable = false;
        try {
          console.log(`  Checking BrightScraper service availability at ${BRIGHTSCRAPER_URL}...`);
          const healthCheck = await axios.get(`${BRIGHTSCRAPER_URL}/health`, { timeout: 5000 });
          brightScraperAvailable = healthCheck.status === 200;
          if (brightScraperAvailable) {
            console.log(`  ✅ BrightScraper service is available`);
          }
        } catch (error: any) {
          console.error(`  ❌ BrightScraper service is NOT available: ${error.code || error.message}`);
          console.error(`  💡 Please ensure BrightScraper is running on ${BRIGHTSCRAPER_URL}`);
          
          // If service is unavailable, return usernames with a helpful error message
          if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            res.status(503).json({
              success: false,
              result: {
                city: 'N/A',
                state: 'N/A',
                minFollowers: 0,
                maxFollowers: 0,
                category: 'N/A'
              } as any,
              data: [],
              error: 'BrightScraper service is not available',
              message: `The demographics service is currently unavailable. Please ensure BrightScraper is running on ${BRIGHTSCRAPER_URL}. Found ${usernamesToFetch.length} username(s) to analyze: ${usernamesToFetch.map(u => '@' + u).join(', ')}`,
              suggestedUsernames: usernamesToFetch,
              serviceUrl: BRIGHTSCRAPER_URL,
              troubleshooting: {
                step1: 'Navigate to the BrightScraper directory: cd BrightScraper',
                step2: 'Start the service: python app.py',
                step3: 'Ensure the service starts on port 5000',
                step4: 'Retry this request'
              }
            });
            return;
          }
        }
        
        for (const username of usernamesNeedingFetch) {
          try {
            console.log(`  → Fetching demographics for @${username}`);
            const response = await axios.post(
              `${BRIGHTSCRAPER_URL}/analyze`,
              { username, max_posts: 6 },
              { 
                timeout: 180000,
                validateStatus: function (status: number) {
                  return status >= 200 && status < 500;
                }
              }
            );
            
            if (response.data && response.data.success) {
              console.log(`  ✓ Demographics received for @${username}`);
              const demo = response.data.data;
              
              // Validate that we got meaningful data
              if (demo.followers === 0 && demo.posts_count === 0) {
                console.log(`  ✗ Account @${username} may not exist or is private`);
                fetchedResults.push({ username, error: 'Account does not exist or is private', success: false });
                continue;
              }
              
              fetchedResults.push({ username, data: demo, success: true });
            } else {
              const errorMsg = response.data?.error || response.data?.message || 'Unknown error';
              console.log(`  ✗ Failed: @${username} - ${errorMsg}`);
              fetchedResults.push({ username, error: errorMsg, success: false });
            }
          } catch (error: any) {
            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
            console.error(`  ✗ Error: @${username} - ${errorMsg}`);
            fetchedResults.push({ username, error: errorMsg, success: false });
          }
        }
      }
      
      // Prepare final results
      console.log('\n[STEP 3] Preparing response...');
      const finalResults: any[] = [];
      
      // Add cached results
      for (const cachedInfluencer of cachedResults) {
        const result = {
          username: cachedInfluencer.user_name,
          profile_name: cachedInfluencer.profile_name,
          profile_pic_url: cachedInfluencer.profile_pic_url || '',
          followers: cachedInfluencer.instagramData?.followers || 0,
          following: cachedInfluencer.instagramData?.following || 0,
          posts_count: cachedInfluencer.instagramData?.posts_count || 0,
          biography: cachedInfluencer.biography || '',
          is_verified: cachedInfluencer.is_verified || false,
          is_business: cachedInfluencer.is_business || false,
          avg_engagement: cachedInfluencer.instagramData?.avg_engagement || 0,
          
          demographics: {
            gender_distribution: {
              male: cachedInfluencer.instagramData?.genderDistribution?.find((g: any) => g.gender === 'MALE')?.distribution || 0,
              female: cachedInfluencer.instagramData?.genderDistribution?.find((g: any) => g.gender === 'FEMALE')?.distribution || 0,
              unknown: cachedInfluencer.instagramData?.genderDistribution?.find((g: any) => g.gender === 'UNKNOWN')?.distribution || 0
            },
            age_distribution: cachedInfluencer.instagramData?.ageDistribution?.reduce((acc: any, item: any) => {
              acc[item.age] = item.value;
              return acc;
            }, {}) || {},
            country_distribution: cachedInfluencer.instagramData?.audienceByCountry?.reduce((acc: any, item: any) => {
              acc[item.name] = item.value;
              return acc;
            }, {}) || {},
            city_distribution: cachedInfluencer.instagramData?.audienceByCity?.reduce((acc: any, item: any) => {
              acc[item.name] = item.value;
              return acc;
            }, {}) || {},
            language_distribution: cachedInfluencer.instagramData?.languageDistribution?.reduce((acc: any, item: any) => {
              acc[item.language] = item.value;
              return acc;
            }, {}) || {},
            audience_quality_score: cachedInfluencer.instagramData?.audienceQualityScore || 0,
            fake_followers_percent: cachedInfluencer.instagramData?.fakeFollowersPercent || 0,
            total_comments_analyzed: cachedInfluencer.instagramData?.totalCommentsAnalyzed || 0,
            real_users_analyzed: cachedInfluencer.instagramData?.realUsersAnalyzed || 0
          },
          
          fromCache: true,
          lastUpdated: cachedInfluencer.lastDemographicsFetch
        };
        
        finalResults.push(result);
        console.log(`  ✓ Added cached data for @${cachedInfluencer.user_name}`);
      }
      
      // Add fetched results and save to database
      for (const fetchResult of fetchedResults) {
        if (fetchResult.success && fetchResult.data) {
          const demo = fetchResult.data;
          const username = fetchResult.username;
          
          // Save/update in database
          try {
            let existingInfluencer = await Influencer.findOne({ user_name: username });
            
            if (existingInfluencer) {
              console.log(`  ↻ Updating existing influencer: @${username}`);
              existingInfluencer.name = demo.profile_name || existingInfluencer.name || username;
              existingInfluencer.profile_name = demo.profile_name;
              existingInfluencer.profile_pic_url = demo.profile_pic_url || existingInfluencer.profile_pic_url;
              existingInfluencer.biography = demo.biography;
              existingInfluencer.is_verified = demo.is_verified;
              existingInfluencer.is_business = demo.is_business;
              existingInfluencer.lastDemographicsFetch = new Date();
              
              let existingCollaborationCharges = {
                reel: 0,
                story: 0,
                post: 0,
                oneMonthDigitalRights: 0
              };
              
              if (existingInfluencer.instagramData && 
                  existingInfluencer.instagramData.collaborationCharges &&
                  typeof existingInfluencer.instagramData.collaborationCharges === 'object') {
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
              console.log(`  ✓ Updated @${username} in database`);
            } else {
              console.log(`  + Creating new influencer: @${username}`);
              existingInfluencer = await Influencer.create({
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
              console.log(`  ✓ Created @${username} in database`);
            }
            
            // Add to results
            const result = {
              username: username,
              profile_name: demo.profile_name || username,
              profile_pic_url: demo.profile_pic_url || '',
              followers: demo.followers || 0,
              following: demo.following || 0,
              posts_count: demo.posts_count || 0,
              biography: demo.biography || '',
              is_verified: demo.is_verified || false,
              is_business: demo.is_business || false,
              avg_engagement: demo.avg_engagement || 0,
              
              demographics: {
                gender_distribution: {
                  male: demo.gender_distribution?.male || 0,
                  female: demo.gender_distribution?.female || 0,
                  unknown: demo.gender_distribution?.unknown || 0
                },
                age_distribution: demo.age_distribution || {},
                country_distribution: demo.country_distribution || {},
                city_distribution: demo.city_distribution || {},
                language_distribution: demo.language_distribution || {},
                audience_quality_score: demo.audience_quality_score || 0,
                fake_followers_percent: demo.fake_followers_percent || 0,
                total_comments_analyzed: demo.total_comments_analyzed || 0,
                real_users_analyzed: demo.real_users_analyzed || 0
              },
              
              fromCache: false,
              lastUpdated: new Date()
            };
            
            finalResults.push(result);
            console.log(`  ✓ Added fresh data for @${username}`);
          } catch (dbError: any) {
            console.error(`  ✗ Error saving @${username}:`, dbError.message);
            // Still add to results even if DB save fails
            finalResults.push({
              username: username,
              error: `Failed to save: ${dbError.message}`,
              success: false
            });
          }
        } else {
          // Failed to fetch
          console.log(`  ✗ Skipping @${fetchResult.username}: ${fetchResult.error}`);
          finalResults.push({
            username: fetchResult.username,
            error: fetchResult.error,
            success: false
          });
        }
      }
      
      console.log(`\n✅ Returning data for ${finalResults.length} username(s)`);
      
      const successfulResults = finalResults.filter(r => !r.error);
      const failedResults = finalResults.filter(r => r.error);
      
      let message = `Data retrieved for ${successfulResults.length} username(s)`;
      if (failedResults.length > 0) {
        message += ` (${failedResults.length} failed)`;
      }
      
      res.status(200).json({
        success: true,
        result: {
          city: 'N/A',
          state: 'N/A',
          minFollowers: 0,
          maxFollowers: 0,
          category: 'N/A'
        } as any,
        data: finalResults,
        message
      });
      return;
    }
    
    // NORMAL FLOW: AI generates usernames
    // Step 1: AI generates influencer usernames based on the request
    console.log('\n[STEP 1] Asking AI (Perplexity Sonar) to suggest Instagram usernames with web search...');
    
    // Analyze the prompt to detect key requirements
    const promptLower = prompt.toLowerCase();
    const mentionsIndia = promptLower.includes('india') || promptLower.includes('indian') || 
                         promptLower.includes('delhi') || promptLower.includes('mumbai') || 
                         promptLower.includes('bangalore') || promptLower.includes('pune') ||
                         promptLower.includes('chennai') || promptLower.includes('hyderabad') ||
                         promptLower.includes('kolkata') || promptLower.includes('ahmedabad');
    
    // Detect category from prompt
    const categoryKeywords: { [key: string]: string[] } = {
      sports: ['sport', 'athlete', 'cricket', 'football', 'basketball', 'tennis', 'fitness', 'gym', 'workout'],
      food: ['food', 'recipe', 'cooking', 'chef', 'restaurant', 'cuisine', 'dining'],
      tech: ['tech', 'technology', 'gadget', 'review', 'smartphone', 'laptop', 'software'],
      fashion: ['fashion', 'style', 'outfit', 'clothing', 'apparel', 'designer'],
      travel: ['travel', 'tourism', 'destination', 'vacation', 'trip', 'adventure'],
      fitness: ['fitness', 'gym', 'workout', 'health', 'exercise', 'yoga'],
      beauty: ['beauty', 'makeup', 'skincare', 'cosmetic', 'glam'],
      lifestyle: ['lifestyle', 'daily', 'routine', 'vlog', 'day in life']
    };
    
    let detectedCategory = '';
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => promptLower.includes(keyword))) {
        detectedCategory = cat;
        break;
      }
    }
    
    // Analyze the prompt to determine how many influencers are requested (calculate once, reuse later)
    const numberMatch = prompt.match(/(\d+)\s*(?:influencers?|creators?|accounts?|people|users?)/i);
    const requestedCount = numberMatch ? parseInt(numberMatch[1]) : null;
    const hasTopBest = /\b(top|best|famous|popular)\s+(\d+)?/i.test(prompt);
    const topBestNumberMatch = prompt.match(/\b(top|best|famous|popular)\s+(\d+)/i);
    const topBestCount = topBestNumberMatch ? parseInt(topBestNumberMatch[2]) : null;
    const defaultCount = requestedCount || topBestCount || (hasTopBest ? 5 : 8); // Default to 5-8 if not specified
    const maxUsernames = requestedCount || topBestCount || (hasTopBest ? 5 : 8);
    
    const perplexityPrompt = `You are an expert Instagram influencer researcher with access to real-time web search. Your task is CRITICAL: find REAL, VERIFIED Instagram accounts that ACTUALLY EXIST.

⚠️ IMPORTANT: UNDERSTAND THE PROMPT CAREFULLY
- Read the user's request EXACTLY as written
- If they ask for "sports influencers from india" → Find sports influencers from India
- If they ask for "top 5 tech influencers" → Return EXACTLY 5 tech influencers
- If they ask for "find influencers" without a number → Return 6-8 relevant influencers (not more)
- DO NOT add extra usernames beyond what's requested
- Focus on QUALITY over QUANTITY 

🔍 MANDATORY WEB SEARCH REQUIREMENTS:
1. **SEARCH THE WEB MULTIPLE TIMES** using different search queries to find actual Instagram influencers
2. Find their **EXACT Instagram usernames** (the @handle, not display names)
3. **VERIFY EACH ACCOUNT EXISTS** by searching for "username Instagram" and confirming the account appears
4. Check their **CURRENT FOLLOWER COUNTS** from recent data (within last 6 months)
5. **DO NOT GUESS** or make up usernames - only return accounts you found via MULTIPLE web searches
6. **PRIORITIZE VERIFIED ACCOUNTS** (blue checkmark) or accounts with substantial followings (50K+)

IMPORTANT: The difference between username and display name:
- ❌ Display Name: "Sarah Hussain" or "ZingyZest" or "Cricket Star"  
- ✅ Username: "zingyzest" or "cricketstar" (the @handle without @)

🎯 USER REQUEST: "${prompt}"
${detectedCategory ? `\n📌 DETECTED CATEGORY: ${detectedCategory.toUpperCase()}` : ''}

📊 SEARCH STEPS YOU MUST FOLLOW (DO ALL OF THESE):
1. Search 1: "[category] influencers in [location] Instagram"
2. Search 2: "top [category] Instagram accounts [location]"
3. Search 3: "[location] [category] Instagram creators verified"
4. Search 4: "famous [category] Instagram [location] with followers"
5. For EACH potential username found:
   - Search: "[username] Instagram" to verify it exists
   - Check if account is active (has recent posts)
   - Confirm follower count matches criteria
   - Extract EXACT @username (not display name)
6. Only include usernames you found in MULTIPLE search results or verified accounts

⚠️ CRITICAL VALIDATION RULES:

1. LOCATION AWARENESS:
   ${mentionsIndia ? '🇮🇳 THE USER ASKED FOR INDIAN/INDIA-BASED INFLUENCERS!' : '🌍 Determine the geographic requirement from the request.'}
   
   - If the request mentions "India", "Indian", or Indian cities (Delhi, Mumbai, Pune, Bangalore, etc.):
     → ONLY suggest influencers who are BASED IN INDIA
     → DO NOT suggest international influencers like:
       ❌ unboxtherapy (Canadian)
       ❌ mkbhd (American) 
       ❌ marques_brownlee (American)
       ❌ casey_neistat (American)
       ❌ ijustine (American)
       ❌ pewdiepie (Swedish)
       ❌ mrwhosetheboss (UK-based)
   
   - For city-specific requests (e.g., "Pune", "Delhi"):
     → Prefer influencers from that city/region
     → If few local options, suggest national influencers with audience in that region
     → ALWAYS prioritize regional relevance

2. ACCOUNT VERIFICATION:
   - ONLY suggest accounts you are ABSOLUTELY CERTAIN exist and are active
   - DO NOT make up plausible-sounding usernames like:
     ❌ "c4etv" (doesn't exist)
     ❌ "geekyravii" (doesn't exist)
     ❌ "techno_ruhez" (doesn't exist)
     ❌ Generic patterns like "city_category" (e.g., "pune_foodie", "delhi_tech")
   
   - ONLY suggest accounts that are:
     ✅ Famous and well-established
     ✅ Have substantial verified followings (50K+ minimum)
     ✅ Regularly post content
     ✅ Actually exist on Instagram

3. CATEGORY MATCHING:
   - Match the exact category requested (food, tech, fitness, fashion, travel, etc.)
   - Ensure influencers are PRIMARILY known for that category
   - Don't suggest multi-niche creators unless they strongly fit the request

4. FOLLOWER RANGE INTELLIGENCE:
   - IMPORTANT: We return ALL valid influencers regardless of follower count
   - Set minFollowers to 0 (no minimum restriction)
   - Set maxFollowers to a very high number like 1000000000 (1 billion) to include all influencers
   - Focus on finding the BEST influencers for the category/location, not filtering by follower count
   - Include micro-influencers, mid-tier, and macro-influencers - all are valuable

5. QUALITY OVER QUANTITY:
   - ${requestedCount ? `User requested ${requestedCount} influencers - return EXACTLY ${requestedCount} (or slightly less if not enough found)` : `Return ${defaultCount} high-quality influencers (not more than ${defaultCount + 2})`}
   - Better to suggest fewer verified accounts than many questionable ones
   - If unsure about a username, DON'T include it
   - Every single account MUST be real and match the criteria
   - DO NOT add extra usernames "just in case" - only return what's needed
   - For niche categories (like sports in specific cities), include national influencers who cover that category

6. SPECIAL HANDLING FOR SPORTS/CATEGORY-SPECIFIC SEARCHES:
   ${detectedCategory === 'sports' ? `
   - Sports influencers often have accounts like: "cricketer_name", "footballer_name", "athlete_name"
   - Search for: "[location] [sport] players Instagram", "[location] athletes Instagram"
   - Include both professional athletes AND sports content creators
   - Don't limit to just local - include national sports personalities who are from that location
   - Examples: cricket players, football players, fitness coaches, sports commentators
   
   REAL SPORTS INFLUENCER EXAMPLES (India):
   - Cricket: "virat.kohli", "msdhoni", "rohitsharma45", "klrahul11", "hardikpandya93", "jaspritbumrah93"
   - Football: "sunilchhetri11", "sandeshjhingan", "gurpreetsandhu"
   - Fitness/Sports Content: "beerbiceps", "sahilkhan", "jeetselal", "rohit_khatri_fitness"
   - Sports Media: "harshabhogle", "akashchopra", "vikrantgupta73"
   - Use these as reference for format and verify similar accounts exist
   ` : ''}

📋 RESPONSE FORMAT (JSON ONLY, NO MARKDOWN):

{
  "searchCriteria": {
    "city": "specific city OR 'Multiple' OR 'Pan-India'",
    "state": "specific state OR 'Multiple'",
    "minFollowers": <number>,
    "maxFollowers": <number>,
    "category": "exact category from request"
  },
  "usernames": ["username1", "username2", "username3", ...]
}

💡 EXAMPLES OF CORRECT BEHAVIOR:

Example 1 - Tech Influencers:
Request: "Find tech influencers with 100k in India"
Web Search Results: "Gaurav Chaudhary (Technical Guruji) @technicalguruji - 5.7M followers"
✅ CORRECT Response: ["technicalguruji", "techburner", "trakintech"]
❌ WRONG: ["mkbhd", "unboxtherapy"] (Not Indian!)

Example 2 - Food Vloggers in Delhi:
Request: "I need top food vloggers from delhi"
Web Search Results: 
  - "Sarah Hussain (@zingyzest) - 500k followers, Delhi food blogger"
  - "Karan Marwah (@foodelhi) - Major Delhi food magazine"
  - "Nikita Varma (@iamdatingfood) - 714k followers, food recipes"
  
✅ CORRECT Response: ["zingyzest", "foodelhi", "iamdatingfood", "shivesh17"]
❌ WRONG: ["delhi_food_walks", "foodwithharry"] (These don't exist or are too small!)

Example 3 - Sports Influencers from India:
Request: "find sports influencers from india"
Web Search Results:
  - "Virat Kohli @virat.kohli - 265M followers, Indian cricket captain"
  - "MS Dhoni @msdhoni - 45M followers, former Indian cricket captain"
  - "Sunil Chhetri @sunilchhetri11 - 2.1M followers, Indian football captain"
  - "Rohit Sharma @rohitsharma45 - 50M followers, Indian cricketer"
  
✅ CORRECT Response: ["virat.kohli", "msdhoni", "sunilchhetri11", "rohitsharma45", "klrahul11", "hardikpandya93"]
❌ WRONG: ["indian_sports", "cricket_india"] (Generic, don't exist!)

Example 4 - Username vs Display Name:
If you find: "Shivesh Bhatia creates amazing food content"
Search for: "Shivesh Bhatia Instagram username"
Find: "@shivesh17" 
✅ Return: "shivesh17" (the @username, not "Shivesh Bhatia")

🎯 NOW PROCESS: "${prompt}"

CRITICAL INSTRUCTIONS:
1. Read the prompt carefully: "${prompt}"
2. ${requestedCount ? `User asked for ${requestedCount} influencers - return EXACTLY ${requestedCount} usernames` : `User didn't specify a number - return ${defaultCount} usernames (not more than ${defaultCount + 2})`}
3. Search: "[prompt keywords] Instagram influencers usernames"
4. Extract EXACT @usernames from search results (not display names!)
5. Return ONLY the number of usernames requested/needed
6. DO NOT add extra usernames beyond what's needed
7. Format as lowercase, remove @ symbol

Step-by-step approach:
1. Understand what the user wants: ${prompt}
2. Search for relevant Instagram influencers matching the criteria
3. Extract EXACT @usernames from search results
4. Return ${requestedCount ? `EXACTLY ${requestedCount}` : `approximately ${defaultCount}`} usernames
5. Format as lowercase, remove @ symbol

Return ONLY the JSON response with ${requestedCount ? `EXACTLY ${requestedCount}` : `${defaultCount}`} verified usernames found through web search.`;

    // Call Perplexity API with web search enabled
    // Using sonar model (works with API credits, no Pro subscription needed)
    const perplexityResponse = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are an expert Instagram influencer researcher with access to real-time web search. Use web search to find REAL, VERIFIED Instagram usernames that currently exist. Always return valid JSON responses only, without any markdown formatting. Base your suggestions ONLY on actual search results from the web.'
          },
          {
            role: 'user',
            content: perplexityPrompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month'
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 90000
      }
    );
    
    const responseText = perplexityResponse.data.choices[0].message.content;
    console.log('Raw Perplexity Response:', responseText);
    
    // Log citations if available
    if (perplexityResponse.data.citations && perplexityResponse.data.citations.length > 0) {
      console.log('✅ Perplexity Citations Found:', perplexityResponse.data.citations.length);
      perplexityResponse.data.citations.forEach((citation: string, idx: number) => {
        console.log(`   [${idx + 1}] ${citation}`);
      });
    } else {
      console.warn('⚠️  No citations returned - web search may not be working properly!');
      console.warn('⚠️  This means AI might be guessing usernames instead of searching!');
    }
    
    // Parse Perplexity response - clean any markdown formatting
    let aiResponse: AIResponse;
    let usernames: string[] = [];
    let searchCriteria: any = {};
    
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Try to parse as JSON first
      try {
        aiResponse = JSON.parse(cleanedText);
        searchCriteria = aiResponse.searchCriteria || {};
        usernames = aiResponse.usernames || [];
      } catch (jsonError) {
        // If JSON parsing fails, try to extract usernames from text
        console.log('⚠️  JSON parsing failed, attempting to extract usernames from text response...');
        console.log('Response text:', cleanedText.substring(0, 500));
        
        // Extract usernames from text using patterns
        // Look for patterns like: "virat.kohli", "@virat.kohli", "username: virat.kohli"
        const usernamePatterns = [
          /(?:username|handle|account|@)[\s:]*([a-z0-9._]+)/gi,
          /@([a-z0-9._]+)/gi,
          /"([a-z0-9._]+)"/g,
          /'([a-z0-9._]+)'/g,
          /instagram\.com\/([a-z0-9._]+)/gi,  // Instagram URLs
          /\b([a-z0-9._]{3,30})\b/g  // General word pattern for usernames
        ];
        
        // Common words to exclude
        const excludeWords = [
          'instagram', 'account', 'username', 'handle', 'profile', 'followers', 
          'the', 'and', 'or', 'for', 'with', 'from', 'this', 'that', 'these',
          'those', 'has', 'have', 'had', 'was', 'were', 'will', 'would', 'could',
          'should', 'may', 'might', 'can', 'cannot', 'not', 'no', 'yes', 'all',
          'some', 'any', 'many', 'much', 'more', 'most', 'less', 'least', 'very',
          'too', 'also', 'only', 'just', 'even', 'still', 'yet', 'already', 'now',
          'then', 'here', 'there', 'where', 'when', 'what', 'which', 'who', 'whom',
          'whose', 'why', 'how', 'about', 'above', 'below', 'after', 'before',
          'during', 'while', 'until', 'since', 'because', 'although', 'though',
          'however', 'therefore', 'thus', 'hence', 'moreover', 'furthermore',
          'indeed', 'certainly', 'surely', 'probably', 'possibly', 'maybe',
          'perhaps', 'likely', 'unlikely', 'definitely', 'absolutely', 'completely',
          'entirely', 'totally', 'quite', 'rather', 'fairly', 'pretty', 'really',
          'actually', 'basically', 'generally', 'usually', 'normally', 'typically',
          'commonly', 'frequently', 'often', 'sometimes', 'occasionally', 'rarely',
          'seldom', 'hardly', 'scarcely', 'barely', 'almost', 'nearly', 'approximately',
          'exactly', 'precisely', 'accurately', 'correctly', 'properly', 'suitably',
          'appropriately', 'adequately', 'sufficiently', 'enough', 'plenty', 'lots',
          'several', 'various', 'different', 'similar', 'same', 'identical', 'equal',
          'equivalent', 'comparable', 'compatible', 'suitable', 'appropriate', 'proper',
          'correct', 'right', 'wrong', 'incorrect', 'inaccurate', 'imprecise', 'vague',
          'unclear', 'ambiguous', 'confusing', 'puzzling', 'mysterious', 'strange',
          'odd', 'weird', 'unusual', 'uncommon', 'rare', 'unique', 'special', 'particular',
          'specific', 'general', 'common', 'ordinary', 'normal', 'regular', 'standard',
          'typical', 'usual', 'customary', 'habitual', 'routine', 'familiar', 'known',
          'unknown', 'unfamiliar', 'strange', 'foreign', 'alien', 'exotic', 'unusual',
          'extraordinary', 'exceptional', 'remarkable', 'outstanding', 'excellent',
          'great', 'good', 'fine', 'nice', 'pleasant', 'enjoyable', 'delightful',
          'wonderful', 'marvelous', 'fantastic', 'amazing', 'incredible', 'unbelievable',
          'awesome', 'terrific', 'superb', 'magnificent', 'splendid', 'gorgeous',
          'beautiful', 'pretty', 'lovely', 'attractive', 'charming', 'appealing',
          'alluring', 'enticing', 'tempting', 'inviting', 'welcoming', 'friendly',
          'kind', 'gentle', 'tender', 'soft', 'smooth', 'calm', 'peaceful', 'quiet',
          'silent', 'still', 'motionless', 'stationary', 'static', 'fixed', 'stable',
          'steady', 'constant', 'consistent', 'uniform', 'regular', 'even', 'level',
          'flat', 'smooth', 'straight', 'direct', 'immediate', 'instant', 'quick',
          'fast', 'rapid', 'swift', 'speedy', 'hasty', 'hurried', 'rushed', 'urgent',
          'pressing', 'critical', 'crucial', 'vital', 'essential', 'important',
          'significant', 'meaningful', 'valuable', 'precious', 'treasured', 'cherished',
          'beloved', 'dear', 'loved', 'adored', 'worshiped', 'revered', 'respected',
          'honored', 'esteemed', 'admired', 'appreciated', 'valued', 'prized', 'treasured',
          'cherished', 'beloved', 'dear', 'loved', 'adored', 'worshiped', 'revered',
          'respected', 'honored', 'esteemed', 'admired', 'appreciated', 'valued', 'prized'
        ];
        
        const foundUsernames = new Set<string>();
        
        for (const pattern of usernamePatterns) {
          const matches = cleanedText.matchAll(pattern);
          for (const match of matches) {
            const potentialUsername = match[1]?.toLowerCase().trim();
            if (potentialUsername && 
                potentialUsername.length >= 3 && 
                potentialUsername.length <= 30 &&
                /^[a-z0-9._]+$/.test(potentialUsername) &&
                !excludeWords.includes(potentialUsername) &&
                !potentialUsername.includes('http') &&
                !potentialUsername.includes('www') &&
                !potentialUsername.includes('com')) {
              foundUsernames.add(potentialUsername);
            }
          }
        }
        
        // Also look for specific mentions like "virat.kohli" or "msdhoni" in the text
        // These are often mentioned by name in the response
        const knownUsernames = [
          'virat.kohli', 'msdhoni', 'rohitsharma45', 'klrahul11', 'hardikpandya93',
          'jaspritbumrah93', 'sunilchhetri11', 'sandeshjhingan', 'gurpreetsandhu',
          'beerbiceps', 'sahilkhan', 'jeetselal', 'rohit_khatri_fitness',
          'harshabhogle', 'akashchopra', 'vikrantgupta73', 'technicalguruji',
          'techburner', 'trakintech', 'zingyzest', 'foodelhi', 'iamdatingfood',
          'shivesh17'
        ];
        
        for (const knownUsername of knownUsernames) {
          if (cleanedText.toLowerCase().includes(knownUsername)) {
            foundUsernames.add(knownUsername);
          }
        }
        
        usernames = Array.from(foundUsernames);
        
        // Extract category and location from text if possible
        const categoryMatch = cleanedText.match(/(?:category|type|niche)[\s:]*([a-z]+)/i);
        const cityMatch = cleanedText.match(/(?:city|location|from)[\s:]*([a-z]+)/i);
        const stateMatch = cleanedText.match(/(?:state|region)[\s:]*([a-z]+)/i);
        
        searchCriteria = {
          city: cityMatch ? cityMatch[1] : 'Multiple',
          state: stateMatch ? stateMatch[1] : 'Multiple',
          minFollowers: 0,
          maxFollowers: 1000000000,
          category: categoryMatch ? categoryMatch[1] : promptLower.match(/(tech|food|sports|fashion|travel|fitness|beauty|lifestyle)/i)?.[1] || 'general'
        };
        
        if (usernames.length > 0) {
          console.log(`✅ Extracted ${usernames.length} usernames from text response:`, usernames);
          console.log(`✅ Using search criteria:`, searchCriteria);
        } else {
          console.error('❌ Could not extract usernames from text response');
          throw new Error('Failed to extract usernames from AI response. Please try again.');
        }
      }
    } catch (parseError) {
      console.error('Failed to parse Perplexity response:', parseError);
      console.error('Perplexity text:', responseText.substring(0, 500));
      throw new Error('Failed to parse AI response. Please try again.');
    }
    
    // Remove follower count restrictions - return all valid influencers
    // Set to very broad range to include all influencers
    searchCriteria.minFollowers = 0; // No minimum
    searchCriteria.maxFollowers = 1000000000; // 1 billion - effectively no maximum
    console.log('✓ Follower count filtering disabled - returning all valid influencers');
    
    // Limit usernames based on prompt analysis (using values calculated earlier)
    if (usernames.length > maxUsernames) {
      console.log(`⚠️  AI suggested ${usernames.length} usernames, but prompt indicates ${maxUsernames} is appropriate. Limiting to ${maxUsernames}...`);
      usernames = usernames.slice(0, maxUsernames);
    }
    
    console.log('Search Criteria:', searchCriteria);
    console.log(`AI Suggested ${usernames.length} usernames (limited to ${maxUsernames} based on prompt):`, usernames);

    // Enhanced validation and filtering
    const KNOWN_INVALID = ['c4etv', 'geekyravii', 'techno_ruhez']; // Add more as discovered
    const NON_INDIAN_ACCOUNTS = ['unboxtherapy', 'mkbhd', 'marques_brownlee', 'ijustine', 
                                  'casey_neistat', 'pewdiepie', 'mrwhosetheboss'];
    
    // Common words that are NOT usernames
    const COMMON_WORDS = [
      'instagram', 'influencer', 'influencers', 'account', 'accounts', 'profile', 'profiles',
      'user', 'users', 'followers', 'following', 'posts', 'post', 'story', 'stories',
      'india', 'indian', 'pune', 'mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad',
      'sports', 'sport', 'food', 'tech', 'fashion', 'travel', 'fitness', 'beauty', 'lifestyle',
      'top', 'best', 'popular', 'famous', 'trending', 'verified', 'check', 'blue'
    ];
    
    const originalCount = usernames.length;
    usernames = usernames
      .map((u: string) => typeof u === 'string' ? u.trim().toLowerCase().replace(/^@/, '') : '')
      .filter((username: string) => {
        if (!username || username.length === 0) {
          console.log(`  ✗ Filtered: empty username`);
          return false;
        }
        
        // Must be valid Instagram username format
        if (!/^[a-z0-9._]+$/.test(username)) {
          console.log(`  ✗ Filtered: @${username} (invalid characters)`);
          return false;
        }
        
        // Must be between 1-30 characters (Instagram limit)
        if (username.length > 30) {
          console.log(`  ✗ Filtered: @${username} (too long)`);
          return false;
        }
        
        // Cannot be a common word
        if (COMMON_WORDS.includes(username)) {
          console.log(`  ✗ Filtered: @${username} (common word, not a username)`);
          return false;
        }
        
        // Remove known invalid usernames
        if (KNOWN_INVALID.includes(username)) {
          console.log(`  ✗ Filtered: @${username} (known invalid)`);
          return false;
        }
        
        // Remove non-Indian accounts ONLY if India was mentioned in the prompt
        if (mentionsIndia && NON_INDIAN_ACCOUNTS.includes(username)) {
          console.log(`  ✗ Filtered: @${username} (non-Indian, but user asked for Indian)`);
          return false;
        }
        
        // Username should have some characteristics of real accounts
        // Either has numbers/underscores/dots OR is at least 5 characters
        const hasSpecialChars = /[\d._]/.test(username);
        const isLongEnough = username.length >= 5;
        
        if (!hasSpecialChars && !isLongEnough) {
          console.log(`  ✗ Filtered: @${username} (doesn't look like a real username)`);
          return false;
        }
        
        return true;
      })
      // Remove duplicates
      .filter((username: string, index: number, self: string[]) => self.indexOf(username) === index);
    
    if (originalCount !== usernames.length) {
      console.log(`\n⚠️  Filtered out ${originalCount - usernames.length} invalid usernames`);
      console.log(`✓ ${usernames.length} valid usernames remaining:`, usernames);
    }

    // If no usernames found, try fallback search with broader criteria
    if (usernames.length === 0) {
      console.log('\n⚠️  No usernames found in first attempt. Trying fallback search with broader criteria...');
      
      const fallbackPrompt = `Find Instagram influencers for: "${prompt}". 
      
Search the web for:
1. "[category] Instagram accounts [location]"
2. "popular [category] creators [location]"
3. "[location] [category] Instagram verified"

Return ONLY real Instagram usernames (not display names) that you found via web search. 
Format: JSON with searchCriteria and usernames array.`;

      try {
        const fallbackResponse = await axios.post(
          PERPLEXITY_API_URL,
          {
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: 'You are an expert Instagram researcher. Find REAL Instagram usernames via web search. Return valid JSON only.'
              },
              {
                role: 'user',
                content: fallbackPrompt
              }
            ],
            temperature: 0.3,
            top_p: 0.95,
            return_images: false,
            return_related_questions: false,
            search_recency_filter: 'year' // Broader time range for fallback
          },
          {
            headers: {
              'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 90000
          }
        );
        
        const fallbackText = fallbackResponse.data.choices[0].message.content;
        const cleanedFallbackText = fallbackText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        const fallbackAiResponse = JSON.parse(cleanedFallbackText);
        usernames = fallbackAiResponse.usernames || [];
        
        if (usernames.length > 0) {
          console.log(`✅ Fallback search found ${usernames.length} usernames:`, usernames);
          // Update search criteria from fallback if available
          if (fallbackAiResponse.searchCriteria) {
            Object.assign(searchCriteria, fallbackAiResponse.searchCriteria);
          }
        } else {
          console.log('❌ Fallback search also returned no usernames');
        }
      } catch (fallbackError) {
        console.error('Fallback search failed:', fallbackError);
      }
      
      if (usernames.length === 0) {
        res.status(200).json({
          success: true,
          result: searchCriteria as any,
          data: [],
          message: 'No valid influencers found. The AI may have suggested invalid accounts. Please try rephrasing your search or using a broader category.'
        });
        return;
      }
    }

    // Step 2: Check which usernames need fresh data (15-day cache)
    console.log('\n[STEP 2] Checking database cache (15-day validity)...');
    const CACHE_VALIDITY_DAYS = 15;
    const cacheValidityMs = CACHE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
    const now = new Date();
    
    const usernameStatus: any[] = [];
    const usernamesToFetch: string[] = [];
    const cachedInfluencers: any[] = [];
    
    for (const username of usernames) {
      const existingInfluencer = await Influencer.findOne({ user_name: username });
      
      if (existingInfluencer) {
        // Check if lastDemographicsFetch exists and is valid
        const lastFetched = existingInfluencer.lastDemographicsFetch;
        
        if (!lastFetched) {
          // No fetch timestamp - treat as expired and re-fetch
          console.log(`  ↻ No fetch timestamp for @${username} - will re-fetch`);
          usernamesToFetch.push(username);
          usernameStatus.push({
            username,
            status: 'no_timestamp'
          });
        } else {
          const timeSinceLastFetch = now.getTime() - new Date(lastFetched).getTime();
          const daysSinceLastFetch = Math.floor(timeSinceLastFetch / (24 * 60 * 60 * 1000));
          
          if (isNaN(daysSinceLastFetch)) {
            // Invalid date - re-fetch
            console.log(`  ↻ Invalid timestamp for @${username} - will re-fetch`);
            usernamesToFetch.push(username);
            usernameStatus.push({
              username,
              status: 'invalid_timestamp'
            });
          } else if (timeSinceLastFetch < cacheValidityMs) {
            console.log(`  ✓ Using cached data for @${username} (fetched ${daysSinceLastFetch} days ago)`);
            cachedInfluencers.push(existingInfluencer);
            usernameStatus.push({
              username,
              status: 'cached',
              daysSinceLastFetch
            });
          } else {
            console.log(`  ↻ Cache expired for @${username} (${daysSinceLastFetch} days old) - will re-fetch`);
            usernamesToFetch.push(username);
            usernameStatus.push({
              username,
              status: 'expired',
              daysSinceLastFetch
            });
          }
        }
      } else {
        console.log(`  + New username @${username} - will fetch`);
        usernamesToFetch.push(username);
        usernameStatus.push({
          username,
          status: 'new'
        });
      }
    }
    
    console.log(`\nCache Summary:`);
    console.log(`  - Cached (using existing): ${cachedInfluencers.length}`);
    console.log(`  - To fetch (new/expired): ${usernamesToFetch.length}`);

    // Step 3: Fetch demographics only for usernames that need it (in batches to avoid overwhelming APIs)
    let demographicsResults: any[] = [];
    
    if (usernamesToFetch.length > 0) {
      console.log('\n[STEP 3] Fetching demographics from BrightScraper API...');
      const BRIGHTSCRAPER_URL = process.env.BRIGHTSCRAPER_URL || 'http://127.0.0.1:5000';
      const axios = require('axios');
      const BATCH_SIZE = 5; // Process 5 accounts at a time
      
      // Check if BrightScraper service is available
      let brightScraperAvailable = false;
      try {
        console.log(`  Checking BrightScraper service availability at ${BRIGHTSCRAPER_URL}...`);
        const healthCheck = await axios.get(`${BRIGHTSCRAPER_URL}/health`, { timeout: 5000 });
        brightScraperAvailable = healthCheck.status === 200;
        if (brightScraperAvailable) {
          console.log(`  ✅ BrightScraper service is available`);
        }
      } catch (error: any) {
        console.error(`  ❌ BrightScraper service is NOT available: ${error.code || error.message}`);
        console.error(`  💡 Please ensure BrightScraper is running on ${BRIGHTSCRAPER_URL}`);
        console.error(`  💡 Start it with: cd BrightScraper && python app.py`);
        
        // If service is unavailable, return usernames with a helpful error message
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          res.status(503).json({
            success: false,
            result: searchCriteria as any,
            data: [],
            error: 'BrightScraper service is not available',
            message: `The demographics service is currently unavailable. Please ensure BrightScraper is running on ${BRIGHTSCRAPER_URL}. The AI successfully found ${usernames.length} influencers: ${usernames.slice(0, 5).join(', ')}${usernames.length > 5 ? '...' : ''}`,
            suggestedUsernames: usernames,
            serviceUrl: BRIGHTSCRAPER_URL,
            troubleshooting: {
              step1: 'Navigate to the BrightScraper directory',
              step2: 'Run: python app.py',
              step3: 'Ensure the service starts on port 5000',
              step4: 'Retry this request'
            }
          });
          return;
        }
      }
      
      const fetchDemographicsForUsername = async (username: string) => {
        try {
          console.log(`  → Fetching demographics for @${username}`);
          const response = await axios.post(
            `${BRIGHTSCRAPER_URL}/analyze`,
            { username, max_posts: 6 },
            { 
              timeout: 180000, // 180 second timeout per request (3 minutes)
              validateStatus: function (status: number) {
                return status >= 200 && status < 500; // Accept 4xx errors to handle them gracefully
              }
            }
          );
          
          if (response.data && response.data.success) {
            console.log(`  ✓ Demographics received for @${username}`);
            
            // Validate that we got meaningful data (non-zero followers or posts)
            const demo = response.data.data;
            if (demo.followers === 0 && demo.posts_count === 0) {
              console.log(`  ✗ Failed: @${username} (0 followers, 0 posts - account may not exist or is private)`);
              return { 
                username, 
                demographics: null, 
                success: false, 
                error: 'Account does not exist or is private',
                fromCache: false 
              };
            }
            
            return {
              username,
              demographics: response.data.data,
              success: true,
              fromCache: false
            };
          } else {
            const errorMsg = response.data?.error || response.data?.message || 'Unknown error';
            console.log(`  ✗ Failed: @${username} - ${errorMsg}`);
            
            // Check if it's a 404 (account not found)
            if (response.status === 404 || errorMsg.includes('does not exist') || errorMsg.includes('is private')) {
              return { 
                username, 
                demographics: null, 
                success: false, 
                error: 'Account does not exist or is private',
                fromCache: false 
              };
            }
            
            return { 
              username, 
              demographics: null, 
              success: false, 
              error: errorMsg,
              fromCache: false 
            };
          }
        } catch (error: any) {
          const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
          console.error(`  ✗ Error: @${username} - ${errorMsg}`);
          return { 
            username, 
            demographics: null, 
            success: false, 
            error: error.code === 'ECONNABORTED' ? 'Request timeout' : errorMsg, 
            fromCache: false 
          };
        }
      };

      // Process usernames in batches to avoid overwhelming the API
      for (let i = 0; i < usernamesToFetch.length; i += BATCH_SIZE) {
        const batch = usernamesToFetch.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(usernamesToFetch.length / BATCH_SIZE);
        
        console.log(`  Processing batch ${batchNum}/${totalBatches} (${batch.length} accounts)...`);
        
        const batchPromises = batch.map(fetchDemographicsForUsername);
        const batchResults = await Promise.all(batchPromises);
        demographicsResults.push(...batchResults);
        
        // Add delay between batches to be respectful to the API
        if (i + BATCH_SIZE < usernamesToFetch.length) {
          console.log(`  ⏸️  Pausing 2 seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`  ✅ Completed fetching demographics for ${usernamesToFetch.length} accounts`);
      
      // Show summary of results
      const successCount = demographicsResults.filter(r => r.success).length;
      const failedCount = demographicsResults.filter(r => !r.success).length;
      
      if (failedCount > 0) {
        console.log(`\n  📊 Results Summary:`);
        console.log(`     ✓ Successful: ${successCount}`);
        console.log(`     ✗ Failed: ${failedCount}`);
        console.log(`\n  Failed accounts:`);
        demographicsResults.filter(r => !r.success).forEach(r => {
          console.log(`     - @${r.username}: ${r.error}`);
        });
        console.log('');
      }
      
      // EARLY RETRY: If ALL fetches failed and we have no cached data, trigger retry immediately
      if (successCount === 0 && failedCount > 0 && cachedInfluencers.length === 0) {
        console.log('\n🔄 EARLY RETRY: All accounts failed to fetch. Triggering immediate retry with different approach...');
        
        const retryPrompt = `Find REAL Instagram ${searchCriteria.category || 'sports'} influencers from ${searchCriteria.city || searchCriteria.state || 'India'}. 

CRITICAL: Search for VERIFIED, FAMOUS accounts that definitely exist. Examples of real sports influencers in India:
- Cricket players: "virat.kohli", "msdhoni", "rohitsharma45", "klrahul11"
- Football players: "sunilchhetri11", "sandeshjhingan"
- Fitness/Sports content: "beerbiceps", "sahilkhan", "jeetselal"
- Sports commentators: "harshabhogle", "akashchopra"

Search the web for:
1. "[category] Instagram influencers [location] verified"
2. "famous [category] Instagram accounts [location]"
3. "[location] [category] players Instagram"

Return ONLY real Instagram usernames (lowercase, no @) that you found via web search. Minimum 8-12 usernames.`;

        try {
          const retryResponse = await axios.post(
            PERPLEXITY_API_URL,
            {
              model: 'sonar',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert Instagram researcher. Find REAL, VERIFIED Instagram usernames via web search. Return valid JSON only with searchCriteria and usernames array.'
                },
                {
                  role: 'user',
                  content: retryPrompt
                }
              ],
              temperature: 0.3,
              top_p: 0.95,
              return_images: false,
              return_related_questions: false,
              search_recency_filter: 'year'
            },
            {
              headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 90000
            }
          );
          
          const retryText = retryResponse.data.choices[0].message.content;
          const cleanedRetryText = retryText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          
          const retryAiResponse = JSON.parse(cleanedRetryText);
          const retryUsernames = (retryAiResponse.usernames || []).slice(0, 10); // Limit to 10
          
          if (retryUsernames.length > 0) {
            console.log(`✅ Early retry found ${retryUsernames.length} new usernames. Fetching demographics...`);
            
            // Fetch demographics for retry usernames (BRIGHTSCRAPER_URL is already defined in this scope)
            const retryDemographicsResults: any[] = [];
            for (const username of retryUsernames) {
              try {
                const response = await axios.post(
                  `${BRIGHTSCRAPER_URL}/analyze`,
                  { username, max_posts: 6 },
                  { timeout: 180000, validateStatus: (status: number) => status >= 200 && status < 500 }
                );
                
                if (response.data && response.data.success && response.data.data) {
                  const demo = response.data.data;
                  if (demo.followers > 0 || demo.posts_count > 0) {
                    retryDemographicsResults.push({
                      username: demo.username,
                      demographics: demo,
                      success: true,
                      fromCache: false
                    });
                    console.log(`  ✓ Retry success for @${username}`);
                  }
                }
              } catch (error) {
                console.log(`  ✗ Retry failed for @${username}`);
              }
            }
            
            // Add successful retry results to demographicsResults
            if (retryDemographicsResults.length > 0) {
              console.log(`✅ Early retry successful! Found ${retryDemographicsResults.length} valid accounts`);
              demographicsResults.push(...retryDemographicsResults);
            }
          }
        } catch (retryError) {
          console.error('Early retry failed:', retryError);
        }
      }
    } else {
      console.log('\n[STEP 3] Skipping API calls - all data available in cache');
    }
    
    // Step 4: Save/Update database and prepare final results
    console.log('\n[STEP 4] Processing results and updating database...');
    const finalResults: any[] = [];
    
    // First, add all cached influencers to results
    for (const cachedInf of cachedInfluencers) {
      const infObject = cachedInf.toObject();
      
      finalResults.push({
        username: cachedInf.user_name,
        profile_name: cachedInf.profile_name,
        profile_pic_url: cachedInf.profile_pic_url || '',
        followers: cachedInf.instagramData?.followers || 0,
        following: cachedInf.instagramData?.following || 0,
        posts_count: cachedInf.instagramData?.posts_count || 0,
        biography: cachedInf.biography || '',
        is_verified: cachedInf.is_verified || false,
        is_business: cachedInf.is_business || false,
        avg_engagement: cachedInf.instagramData?.avg_engagement || 0,
        demographics: {
          gender_distribution: {
            male: cachedInf.instagramData?.genderDistribution?.find((g: any) => g.gender === 'MALE')?.distribution || 0,
            female: cachedInf.instagramData?.genderDistribution?.find((g: any) => g.gender === 'FEMALE')?.distribution || 0,
            unknown: cachedInf.instagramData?.genderDistribution?.find((g: any) => g.gender === 'UNKNOWN')?.distribution || 0
          },
          age_distribution: cachedInf.instagramData?.ageDistribution?.reduce((acc: any, item: any) => {
            acc[item.age] = item.value;
            return acc;
          }, {}) || {},
          country_distribution: cachedInf.instagramData?.audienceByCountry?.reduce((acc: any, item: any) => {
            acc[item.name] = item.value;
            return acc;
          }, {}) || {},
          city_distribution: cachedInf.instagramData?.audienceByCity?.reduce((acc: any, item: any) => {
            acc[item.name] = item.value;
            return acc;
          }, {}) || {},
          language_distribution: cachedInf.instagramData?.languageDistribution?.reduce((acc: any, item: any) => {
            acc[item.language] = item.value;
            return acc;
          }, {}) || {},
          audience_quality_score: cachedInf.instagramData?.audienceQualityScore || 0,
          fake_followers_percent: cachedInf.instagramData?.fakeFollowersPercent || 0,
          total_comments_analyzed: cachedInf.instagramData?.totalCommentsAnalyzed || 0,
          real_users_analyzed: cachedInf.instagramData?.realUsersAnalyzed || 0
        },
        saved_to_db: true,
        from_cache: true,
        last_fetched: cachedInf.lastDemographicsFetch || cachedInf.updatedAt
      });
      
      console.log(`  ✓ Added cached data for @${cachedInf.user_name}`);
    }
    
    // Now process newly fetched demographics
    for (const demoResult of demographicsResults) {
      if (demoResult.success && demoResult.demographics) {
        const demo = demoResult.demographics as DemographicsData;
        
        try {
          // Check if influencer already exists in database
          let existingInfluencer = await Influencer.findOne({ user_name: demo.username });
          
          if (existingInfluencer) {
            console.log(`  ↻ Updating existing influencer: @${demo.username}`);
            // Update existing influencer with new demographics data
            existingInfluencer.name = demo.profile_name || existingInfluencer.name || demo.username;
            existingInfluencer.profile_name = demo.profile_name;
            existingInfluencer.profile_pic_url = demo.profile_pic_url || existingInfluencer.profile_pic_url;
            existingInfluencer.biography = demo.biography;
            existingInfluencer.is_verified = demo.is_verified;
            existingInfluencer.is_business = demo.is_business;
            existingInfluencer.city = searchCriteria.city || existingInfluencer.city;
            existingInfluencer.state = searchCriteria.state || existingInfluencer.state;
            existingInfluencer.categoryInstagram = searchCriteria.category || existingInfluencer.categoryInstagram;
            existingInfluencer.lastDemographicsFetch = new Date(); // Track when demographics were fetched
            
            // Ensure collaborationCharges exists before spreading
            const existingCollaborationCharges = existingInfluencer.instagramData?.collaborationCharges || {
              reel: 0,
              story: 0,
              post: 0,
              oneMonthDigitalRights: 0
            };
            
            existingInfluencer.instagramData = {
              followers: demo.followers,
              following: demo.following,
              posts_count: demo.posts_count,
              avg_engagement: demo.avg_engagement,
              genderDistribution: [
                { gender: 'MALE', distribution: demo.gender_distribution.male || 0 },
                { gender: 'FEMALE', distribution: demo.gender_distribution.female || 0 },
                { gender: 'UNKNOWN', distribution: demo.gender_distribution.unknown || 0 }
              ],
              ageDistribution: Object.entries(demo.age_distribution || {}).map(([age, value]) => ({ age, value })),
              audienceByCountry: Object.entries(demo.country_distribution || {}).map(([name, value]) => ({ name, value: value as number, category: '' })),
              audienceByCity: Object.entries(demo.city_distribution || {}).map(([name, value]) => ({ name, value: value as number })),
              languageDistribution: Object.entries(demo.language_distribution || {}).map(([language, value]) => ({ language, value: value as number })),
              audienceQualityScore: demo.audience_quality_score,
              fakeFollowersPercent: demo.fake_followers_percent,
              totalCommentsAnalyzed: demo.total_comments_analyzed,
              realUsersAnalyzed: demo.real_users_analyzed,
              collaborationCharges: existingCollaborationCharges
            };
            const savedInfluencer = await existingInfluencer.save();
            console.log(`  ✓ Updated @${demo.username} - lastFetch: ${savedInfluencer.lastDemographicsFetch}`);
          } else {
            console.log(`  + Creating new influencer: @${demo.username}`);
            // Create new influencer document
            existingInfluencer = await Influencer.create({
              user_name: demo.username,
              name: demo.profile_name || demo.username,
              profile_name: demo.profile_name,
              profile_pic_url: demo.profile_pic_url || '',
              biography: demo.biography,
              is_verified: demo.is_verified,
              is_business: demo.is_business,
              city: searchCriteria.city || '',
              state: searchCriteria.state || '',
              categoryInstagram: searchCriteria.category || '',
              gender: 'Other', // Default value
              lastDemographicsFetch: new Date(), // Track when demographics were fetched
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
                ageDistribution: Object.entries(demo.age_distribution || {}).map(([age, value]) => ({ age, value })),
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
              },
              youtubeData: {
                followers: 0,
                collaborationCharges: {
                  reel: 0,
                  story: 0,
                  post: 0,
                  oneMonthDigitalRights: 0
                }
              }
            });
            console.log(`  ✓ Created @${demo.username} - lastFetch: ${existingInfluencer.lastDemographicsFetch}`);
          }
          
          // Add to final results
          finalResults.push({
            username: demo.username,
            profile_name: demo.profile_name,
            profile_pic_url: demo.profile_pic_url || '',
            followers: demo.followers,
            following: demo.following,
            posts_count: demo.posts_count,
            biography: demo.biography,
            is_verified: demo.is_verified,
            is_business: demo.is_business,
            avg_engagement: demo.avg_engagement,
            demographics: {
              gender_distribution: demo.gender_distribution,
              age_distribution: demo.age_distribution,
              country_distribution: demo.country_distribution,
              city_distribution: demo.city_distribution,
              language_distribution: demo.language_distribution,
              audience_quality_score: demo.audience_quality_score,
              fake_followers_percent: demo.fake_followers_percent,
              total_comments_analyzed: demo.total_comments_analyzed,
              real_users_analyzed: demo.real_users_analyzed
            },
            saved_to_db: true,
            from_cache: false,
            freshly_fetched: true
          });
          
        } catch (dbError: any) {
          console.error(`  ✗ Error saving @${demo.username} to database:`, dbError.message);
          // Still add to results even if DB save fails
          finalResults.push({
            username: demo.username,
            profile_name: demo.profile_name,
            followers: demo.followers,
            demographics: {
              gender_distribution: demo.gender_distribution,
              age_distribution: demo.age_distribution,
              country_distribution: demo.country_distribution,
              city_distribution: demo.city_distribution,
              language_distribution: demo.language_distribution,
              audience_quality_score: demo.audience_quality_score,
              fake_followers_percent: demo.fake_followers_percent
            },
            saved_to_db: false,
            db_error: dbError.message
          });
        }
      } else {
        // Demographics fetch failed
        finalResults.push({
          username: demoResult.username,
          demographics: null,
          saved_to_db: false,
          error: demoResult.error || 'Failed to fetch demographics'
        });
      }
    }

    // Step 5: Filter results - Only remove errors, keep all valid influencers regardless of follower count
    console.log('\n[STEP 5] Filtering results (removing only errors, keeping all valid influencers)...');
    
    const filterStats = {
      errors: 0,
      passed: 0
    };
    
    const filteredResults = finalResults.filter((influencer: any) => {
      if (influencer.error) {
        filterStats.errors++;
        console.log(`  ✗ Skipped @${influencer.username}: ${influencer.error}`);
        return false;
      }
      
      const followers = influencer.followers || 0;
      filterStats.passed++;
      console.log(`  ✓ Kept @${influencer.username}: ${followers.toLocaleString()} followers`);
      return true;
    });
    
    console.log(`\nFilter Summary:`);
    console.log(`  - Total processed: ${finalResults.length} influencers`);
    console.log(`  - Valid influencers returned: ${filterStats.passed}`);
    console.log(`  - Errors/Not found: ${filterStats.errors}`);
    console.log(`  - Note: No follower count filtering applied - returning all valid influencers`);
    
    console.log('\n[COMPLETE] Returning all valid influencers with full demographics');
    console.log(`Successfully processed ${filteredResults.length} influencers`);
    console.log('='.repeat(60));
    
    // Check if we have any valid results
    if (filteredResults.length === 0) {
      // If all accounts failed, try one more retry with even broader criteria
      if (filterStats.errors === finalResults.length && finalResults.length > 0) {
        console.log('\n🔄 All accounts failed. Attempting retry with broader search criteria...');
        
        // Expand the search criteria
        const retrySearchCriteria = {
          ...searchCriteria,
          minFollowers: Math.max(0, (searchCriteria.minFollowers || 1000) / 10), // Much lower minimum
          maxFollowers: (searchCriteria.maxFollowers || 100000) * 10, // Much higher maximum
          city: searchCriteria.city || 'Multiple',
          state: searchCriteria.state || 'Multiple'
        };
        
        const retryPrompt = `Find Instagram ${searchCriteria.category || 'influencers'} from ${searchCriteria.city || searchCriteria.state || 'India'}. 
        
Search for verified accounts with ANY follower count. Include:
- Professional athletes
- Sports content creators  
- Fitness coaches
- Sports commentators
- Any active Instagram accounts related to ${searchCriteria.category || 'sports'}

Return REAL Instagram usernames found via web search.`;

        try {
          const retryResponse = await axios.post(
            PERPLEXITY_API_URL,
            {
              model: 'sonar',
              messages: [
                {
                  role: 'system',
                  content: 'Find REAL Instagram usernames via web search. Return valid JSON only.'
                },
                {
                  role: 'user',
                  content: retryPrompt
                }
              ],
              temperature: 0.4,
              top_p: 0.95,
              return_images: false,
              return_related_questions: false,
              search_recency_filter: 'year'
            },
            {
              headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 90000
            }
          );
          
          const retryText = retryResponse.data.choices[0].message.content;
          const cleanedRetryText = retryText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          
          const retryAiResponse = JSON.parse(cleanedRetryText);
          const retryUsernames = retryAiResponse.usernames || [];
          
          if (retryUsernames.length > 0) {
            console.log(`✅ Retry found ${retryUsernames.length} usernames. Fetching demographics...`);
            
            // Fetch demographics for retry usernames (simplified version)
            const BRIGHTSCRAPER_URL = process.env.BRIGHTSCRAPER_URL || 'http://127.0.0.1:5000';
            const retryResults: any[] = [];
            
            for (const username of retryUsernames.slice(0, 5)) { // Limit to 5 for retry
              try {
                const response = await axios.post(
                  `${BRIGHTSCRAPER_URL}/analyze`,
                  { username, max_posts: 6 },
                  { timeout: 180000, validateStatus: (status: number) => status >= 200 && status < 500 }
                );
                
                if (response.data && response.data.success && response.data.data) {
                  const demo = response.data.data;
                  if (demo.followers > 0 || demo.posts_count > 0) {
                    retryResults.push({
                      username: demo.username,
                      profile_name: demo.profile_name,
                      profile_pic_url: demo.profile_pic_url || '',
                      followers: demo.followers,
                      following: demo.following,
                      posts_count: demo.posts_count,
                      biography: demo.biography || '',
                      is_verified: demo.is_verified || false,
                      is_business: demo.is_business || false,
                      avg_engagement: demo.avg_engagement || 0,
                      demographics: {
                        gender_distribution: demo.gender_distribution,
                        age_distribution: demo.age_distribution,
                        country_distribution: demo.country_distribution,
                        city_distribution: demo.city_distribution,
                        language_distribution: demo.language_distribution,
                        audience_quality_score: demo.audience_quality_score,
                        fake_followers_percent: demo.fake_followers_percent,
                        total_comments_analyzed: demo.total_comments_analyzed,
                        real_users_analyzed: demo.real_users_analyzed
                      },
                      fromCache: false,
                      freshly_fetched: true
                    });
                  }
                }
              } catch (error) {
                console.log(`  ✗ Retry failed for @${username}`);
              }
            }
            
            if (retryResults.length > 0) {
              console.log(`✅ Retry successful! Found ${retryResults.length} valid accounts`);
              res.status(200).json({
                success: true,
                result: retrySearchCriteria as any,
                data: retryResults,
                message: `Found ${retryResults.length} influencers matching your criteria (expanded search)`
              });
              return;
            }
          }
        } catch (retryError) {
          console.error('Retry attempt failed:', retryError);
        }
      }
      
      let reason = 'No influencers found matching your criteria.';
      
      if (filterStats.errors === finalResults.length) {
        reason = 'All suggested accounts could not be found or analyzed. The AI may have suggested non-existent accounts. Try a broader search or different criteria.';
      } else {
        reason = `Found ${finalResults.length} account(s), but all failed to fetch demographics. Please try again.`;
      }
      
      res.status(200).json({
        success: true,
        result: searchCriteria as any,
        data: [],
        message: reason,
        debug: {
          totalProcessed: finalResults.length,
          errors: filterStats.errors
        }
      });
      return;
    }
    
    // Return the filtered results
    res.status(200).json({
      success: true,
      result: searchCriteria as any,
      data: filteredResults,
      message: `Found ${filteredResults.length} influencers matching your criteria`
    });

  } catch (error) {
    console.error('\n[ERROR] in /api/ask endpoint:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      result: {} as ProcessedRequirements,
      data: [],
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
};

export const handleDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userName } = req.query as { userName: string };

    if (!userName) {
      res.status(400).json({
        success: false,
        message: "userName query parameter is required",
      });
      return;
    }

    // Fetch influencer details from the database
    const influencerDetails = await Influencer.findOne({ user_name: userName });

    if (!influencerDetails) {
      res.status(404).json({
        success: false,
        message: "Influencer not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: influencerDetails.toObject(),
    });

  } catch (error) {
    console.error('Error in /details endpoint:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

// Debug endpoint to check database content
export const handleDebugData = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalCount = await Influencer.countDocuments();
    
    // Get a sample of influencers to check data structure
    const sampleInfluencers = await Influencer.find({}).limit(3).lean();
    
    // Get unique cities and categories
    const cities = await Influencer.distinct('city');
    const categoriesInstagram = await Influencer.distinct('categoryInstagram');
    const categoriesYouTube = await Influencer.distinct('categoryYouTube');
    
    // Check follower ranges
    const followerStats = await Influencer.aggregate([
      {
        $group: {
          _id: null,
          minInstagramFollowers: { $min: "$instagramData.followers" },
          maxInstagramFollowers: { $max: "$instagramData.followers" },
          minYoutubeFollowers: { $min: "$youtubeData.followers" },
          maxYoutubeFollowers: { $max: "$youtubeData.followers" }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalCount,
        cities: cities.slice(0, 10), // First 10 cities
        categoriesInstagram: categoriesInstagram.slice(0, 10),
        categoriesYouTube: categoriesYouTube.slice(0, 10),
        followerStats: followerStats[0] || {},
        sampleInfluencers: sampleInfluencers.map(inf => ({
          name: inf.name,
          user_name: inf.user_name,
          city: inf.city,
          categoryInstagram: inf.categoryInstagram,
          categoryYouTube: inf.categoryYouTube,
          instagramFollowers: inf.instagramData?.followers,
          youtubeFollowers: inf.youtubeData?.followers,
          ageDistribution: inf.instagramData?.ageDistribution?.slice(0, 3) // First 3 age groups
        }))
      }
    });
  } catch (error) {
    console.error('Debug data error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Test Bright Data integration
export const handleTestBrightData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.query as { username: string };
    
    if (!username) {
      res.status(400).json({
        success: false,
        error: "username query parameter is required"
      });
      return;
    }

    console.log(`Testing Bright Data for username: ${username}`);

    // Test the connection first
    const connectionTest = await BrightDataService.testConnection();
    
    // Get enhanced profile data
    const enhancedData = await BrightDataService.getEnhancedProfileData(username);
    
    res.json({
      success: true,
      data: {
        connectionTest,
        brightDataAvailable: BrightDataService.isAvailable(),
        username,
        profile: enhancedData.profile,
        recentPosts: enhancedData.recentPosts,
        apiTokenConfigured: !!process.env.BRIGHT_DATA_API_TOKEN
      }
    });
  } catch (error) {
    console.error('Bright Data test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      brightDataAvailable: BrightDataService.isAvailable(),
      apiTokenConfigured: !!process.env.BRIGHT_DATA_API_TOKEN
    });
  }
};

// Test Bright Data snapshot
export const handleTestSnapshot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { snapshotId } = req.query as { snapshotId: string };
    
    if (!snapshotId) {
      res.status(400).json({
        success: false,
        error: "snapshotId query parameter is required"
      });
      return;
    }

    console.log(`Testing Bright Data snapshot: ${snapshotId}`);

    // Check progress first
    const progress = await BrightDataService.checkProgress(snapshotId);
    
    // Fetch snapshot data
    const snapshotData = await BrightDataService.fetchSnapshotData(snapshotId);
    
    res.json({
      success: true,
      data: {
        snapshotId,
        progress,
        profilesFound: snapshotData.length,
        profiles: snapshotData.slice(0, 5), // Show first 5 profiles
        brightDataAvailable: BrightDataService.isAvailable(),
        apiTokenConfigured: !!process.env.BRIGHT_DATA_API_TOKEN
      }
    });
  } catch (error) {
    console.error('Bright Data snapshot test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      brightDataAvailable: BrightDataService.isAvailable(),
      apiTokenConfigured: !!process.env.BRIGHT_DATA_API_TOKEN
    });
  }
};

// Handle Instagram reel URL and fetch data from Bright Data
export const handleInstagramReel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reelUrl } = req.body as { reelUrl: string };
    
    if (!reelUrl) {
      res.status(400).json({
        success: false,
        error: "reelUrl is required in request body"
      });
      return;
    }

    // Validate that it's an Instagram URL
    if (!reelUrl.includes('instagram.com')) {
      res.status(400).json({
        success: false,
        error: "URL must be a valid Instagram URL"
      });
      return;
    }

    console.log(`Processing Instagram reel URL: ${reelUrl}`);

    // Use the specific token for this endpoint
    const specificToken = '06da4e4a-d78c-4a0b-8c36-19f1f6b43326';
    
    // Create a temporary Bright Data service instance with the specific token
    const tempBrightDataService = {
      async scrapeInstagramReel(url: string) {
        const axios = require('axios');
        const BRIGHT_DATA_API_BASE = 'https://api.brightdata.com/datasets/v3/trigger';
        const BRIGHT_DATA_SNAPSHOT_BASE = 'https://api.brightdata.com/datasets/v3/snapshot';
        const BRIGHT_DATA_PROGRESS_BASE = 'https://api.brightdata.com/datasets/v3/progress';
        const INSTAGRAM_REELS_DATASET_ID = 'gd_lyclm20il4r5helnj';
        
        try {
          console.log(`Scraping Instagram reel from URL: ${url}`);
          
          const payload = [{ url }];
          
          const triggerUrl = `${BRIGHT_DATA_API_BASE}?dataset_id=${INSTAGRAM_REELS_DATASET_ID}&format=json&include_errors=true`;
          
          const response = await axios.post(triggerUrl, payload, {
            headers: {
              'Authorization': `Bearer ${specificToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          });

          console.log('Reel trigger response:', response.data);
          
          // Check if response contains a snapshot ID
          if (response.data && response.data.snapshot_id) {
            const snapshotId = response.data.snapshot_id;
            console.log(`Reel snapshot created: ${snapshotId}`);
            
            // Wait for the snapshot to complete using the same logic as BrightDataService
            const startTime = Date.now();
            const maxWaitTime = 120000; // 2 minutes
            const checkInterval = 5000; // Check every 5 seconds
            
            console.log(`Waiting for snapshot ${snapshotId} to complete...`);
            
            while (Date.now() - startTime < maxWaitTime) {
              try {
                // Check progress
                const progressResponse = await axios.get(
                  `${BRIGHT_DATA_PROGRESS_BASE}/${snapshotId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${specificToken}`,
                      'Content-Type': 'application/json'
                    },
                    timeout: 30000
                  }
                );
                
                const progress = progressResponse.data;
                console.log('Progress response:', progress);
                
                if (progress.status === 'completed' || progress.status === 'ready') {
                  console.log(`Snapshot ${snapshotId} ${progress.status}, fetching data...`);
                  
                  // Fetch snapshot data
                  const snapshotResponse = await axios.get(
                    `${BRIGHT_DATA_SNAPSHOT_BASE}/${snapshotId}?format=json`,
                    {
                      headers: {
                        'Authorization': `Bearer ${specificToken}`,
                        'Content-Type': 'application/json'
                      },
                      timeout: 60000
                    }
                  );
                  
                  console.log('Snapshot response received:', {
                    status: snapshotResponse.status,
                    dataLength: Array.isArray(snapshotResponse.data) ? snapshotResponse.data.length : 'not array'
                  });
                  
                  let results = [];
                  if (Array.isArray(snapshotResponse.data)) {
                    results = snapshotResponse.data;
                  } else if (snapshotResponse.data && Array.isArray(snapshotResponse.data.data)) {
                    results = snapshotResponse.data.data;
                  } else if (snapshotResponse.data && Array.isArray(snapshotResponse.data.results)) {
                    results = snapshotResponse.data.results;
                  }
                  
                  console.log(`Fetched ${results.length} items from snapshot`);
                  return results.length > 0 ? results[0] : null;
                } else if (progress.status === 'failed') {
                  console.error(`Snapshot ${snapshotId} failed:`, progress);
                  return null;
                } else {
                  console.log(`Snapshot ${snapshotId} still processing... (${progress.progress || 0}%)`);
                }
                
                // Wait before checking again
                await new Promise(resolve => setTimeout(resolve, checkInterval));
              } catch (error) {
                console.error(`Error checking snapshot ${snapshotId} progress:`, error);
                return null;
              }
            }
            
            console.error(`Snapshot ${snapshotId} timed out after ${maxWaitTime / 1000} seconds`);
            return null;
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
    };

    // Scrape the reel data from Bright Data using the specific token
    const reelData = await tempBrightDataService.scrapeInstagramReel(reelUrl);
    
    if (!reelData) {
      res.status(404).json({
        success: false,
        error: "Could not fetch reel data from Bright Data",
        brightDataAvailable: true,
        apiTokenConfigured: true
      });
      return;
    }

    res.json({
      success: true,
      data: {
        reel: reelData,
        metadata: {
          scrapedAt: new Date().toISOString(),
          originalUrl: reelUrl,
          brightDataAvailable: true,
          apiTokenConfigured: true,
          tokenUsed: specificToken
        }
      }
    });
  } catch (error) {
    console.error('Instagram reel processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      brightDataAvailable: true,
      apiTokenConfigured: true
    });
  }
};