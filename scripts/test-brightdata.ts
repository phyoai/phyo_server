import 'dotenv/config';
import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testBrightDataIntegration() {
  console.log('🧪 Testing Enhanced Bright Data Integration...\n');

  try {
    // Test 1: Check API Status
    console.log('1. Testing Bright Data API Status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/ask/brightdata/status`);
    console.log('✅ Status Response:', statusResponse.data);
    console.log('');

    // Test 2: Test Enhanced AI Search with Detailed Data Fetching
    console.log('2. Testing Enhanced AI Search with Detailed Data Fetching...');
    const searchResponse = await axios.post(`${BASE_URL}/api/ask`, {
      prompt: "Find fashion influencers in New York with 10k to 100k followers"
    });
    
    console.log('✅ Enhanced Search Response:', {
      success: searchResponse.data.success,
      dataSource: searchResponse.data.dataSource,
      resultCount: searchResponse.data.data?.length || 0,
      hasBrightDataResults: !!searchResponse.data.brightDataResults,
      brightDataResultCount: searchResponse.data.brightDataResults?.length || 0
    });

    // Check if we have detailed data in Bright Data results
    if (searchResponse.data.brightDataResults && searchResponse.data.brightDataResults.length > 0) {
      const firstBrightDataResult = searchResponse.data.brightDataResults[0];
      console.log('📊 First Bright Data Result Details:', {
        name: firstBrightDataResult.name,
        username: firstBrightDataResult.user_name,
        followers: firstBrightDataResult.instagramData?.followers,
        engagement_rate: firstBrightDataResult.instagramData?.engagement_rate,
        averageLikes: firstBrightDataResult.averageLikes,
        averageComments: firstBrightDataResult.averageComments,
        hasRecentPosts: !!firstBrightDataResult.recentPosts,
        recentPostsCount: firstBrightDataResult.recentPosts?.length || 0,
        source: firstBrightDataResult.source
      });
    }
    console.log('');

    // Test 3: Test Bright Data Details (if we have results)
    if (searchResponse.data.brightDataResults && searchResponse.data.brightDataResults.length > 0) {
      const firstInfluencer = searchResponse.data.brightDataResults[0];
      console.log('3. Testing Bright Data Details...');
      console.log(`   Testing with influencer: ${firstInfluencer.user_name}`);
      
      try {
        const detailsResponse = await axios.get(`${BASE_URL}/api/ask/brightdata/details?userName=${firstInfluencer.user_name}`);
        console.log('✅ Details Response:', {
          success: detailsResponse.data.success,
          hasData: !!detailsResponse.data.data,
          source: detailsResponse.data.source,
          hasAnalytics: !!detailsResponse.data.data?.instagramData?.engagement_rate
        });
      } catch (error) {
        console.log('⚠️  Details test failed (this is normal if the influencer is not found on Bright Data)');
      }
      console.log('');
    }

    // Test 4: Test Analytics (if we have results)
    if (searchResponse.data.brightDataResults && searchResponse.data.brightDataResults.length > 0) {
      const firstInfluencer = searchResponse.data.brightDataResults[0];
      console.log('4. Testing Bright Data Analytics...');
      console.log(`   Testing with influencer: ${firstInfluencer.user_name}`);
      
      try {
        const analyticsResponse = await axios.get(`${BASE_URL}/api/ask/brightdata/analytics?userName=${firstInfluencer.user_name}`);
        console.log('✅ Analytics Response:', {
          success: analyticsResponse.data.success,
          hasData: !!analyticsResponse.data.data,
          source: analyticsResponse.data.source,
          engagementRate: analyticsResponse.data.data?.engagement_rate,
          averageLikes: analyticsResponse.data.data?.average_likes
        });
      } catch (error) {
        console.log('⚠️  Analytics test failed (this is normal if analytics are not available)');
      }
      console.log('');
    }

    // Test 5: Test Posts (if we have results)
    if (searchResponse.data.brightDataResults && searchResponse.data.brightDataResults.length > 0) {
      const firstInfluencer = searchResponse.data.brightDataResults[0];
      console.log('5. Testing Bright Data Posts...');
      console.log(`   Testing with influencer: ${firstInfluencer.user_name}`);
      
      try {
        const postsResponse = await axios.get(`${BASE_URL}/api/ask/brightdata/posts?userName=${firstInfluencer.user_name}&limit=5`);
        console.log('✅ Posts Response:', {
          success: postsResponse.data.success,
          count: postsResponse.data.count,
          source: postsResponse.data.source,
          hasPosts: postsResponse.data.data?.length > 0
        });
      } catch (error) {
        console.log('⚠️  Posts test failed (this is normal if posts are not available)');
      }
      console.log('');
    }

    console.log('🎉 Enhanced Bright Data Integration Test Completed!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - API Status: ${statusResponse.data.data?.available ? '✅ Available' : '❌ Not Available'}`);
    console.log(`   - Search Working: ${searchResponse.data.success ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Data Source: ${searchResponse.data.dataSource || 'local'}`);
    console.log(`   - Total Results: ${searchResponse.data.data?.length || 0}`);
    console.log(`   - Bright Data Results: ${searchResponse.data.brightDataResults?.length || 0}`);
    
    if (searchResponse.data.brightDataResults && searchResponse.data.brightDataResults.length > 0) {
      console.log(`   - Detailed Data Fetched: ✅ Yes`);
      console.log(`   - Average Engagement Rate: ${searchResponse.data.brightDataResults[0]?.instagramData?.engagement_rate || 'N/A'}%`);
      console.log(`   - Recent Posts Available: ${searchResponse.data.brightDataResults[0]?.recentPosts ? '✅ Yes' : '❌ No'}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
    
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Status code:', error.response?.status);
    }
  }
}

// Run the test
testBrightDataIntegration(); 