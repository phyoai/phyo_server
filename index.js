require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { OpenAI } = require("openai")
const influencer = require("./models/influencer")
const { connectToMongo } = require("./connections/db")
const axios = require("axios")
const dns = require("dns")
const http = require("http")
const socketIo = require("socket.io")
const { morganMiddleware } = require("./middleware/logger")
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler")
// const data = require("./data")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
    cors: {
        origin: ["https://phyo.ai", "http://phyo.ai:4000", "http://localhost:3000", "http://localhost:8000"],
        credentials: true
    }
})

const PORT = 4000

// Routes
const authRoute = require("./routes/auth")
const usersRoute = require("./routes/users")
const campaignsRoute = require("./routes/campaigns")
const conversationsRoute = require("./routes/conversations")
const messagesRoute = require("./routes/messages")
const filesRoute = require("./routes/files")
const influencersRoute = require("./routes/influencers")
const influencerDataRoute = require("./routes/influencerData")
const projectsRoute = require("./routes/projects")
const portfoliosRoute = require("./routes/portfolios")
const paymentsRoute = require("./routes/payments")
const adminRoute = require("./routes/admin")
const brandRoute = require("./routes/brand")
const influencerRoute = require("./routes/influencer")
const brandRequestsRoute = require("./routes/brandRequests")
const influencerRequestsRoute = require("./routes/influencerRequests")
const notificationsRoute = require("./routes/notifications")
const trendingRoute = require("./routes/trending")
const locationsRoute = require("./routes/locations")
const campaignDetailRoute = require("./routes/campaignDetail")
const campaignApplicationRoute = require("./routes/campaignApplication")
const discoveryRoute = require("./routes/discovery")
const accountRoute = require("./routes/account")
const messagesAndNotificationsRoute = require("./routes/messagesAndNotifications")
const helpSupportRoute = require("./routes/helpSupport")
const userProfileRoute = require("./routes/userProfile")
const favoritesRoute = require("./routes/favorites")
const reviewsRoute = require("./routes/reviews")
const analyticsRoute = require("./routes/analytics")
const collaborationRoute = require("./routes/collaboration")
const campaignStatusRoute = require("./routes/campaignStatus")
const campaignManagementRoute = require("./routes/campaignManagement")
const advancedCampaignRoute = require("./routes/advancedCampaign")
const subscriptionsRoute = require("./routes/subscriptions")
const notificationSettingsRoute = require("./routes/notificationSettings")
const profileRoute = require("./routes/profile")
const smsRoute = require("./routes/sms")
const listsRoute = require("./routes/lists")
const paymentMethodsRoute = require("./routes/paymentMethods")

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors({
    origin: ["https://phyo.ai", "http://phyo.ai:4000", "http://localhost:3000", "http://localhost:8000"],
    credentials: true
}))

// Request logging middleware
app.use(morganMiddleware)

// Mount all routes BEFORE starting the server
app.use("/api/auth", authRoute)
app.use("/api/users", usersRoute)
app.use("/api/influencers", influencersRoute)
app.use("/api/campaigns", campaignsRoute)
app.use("/api/conversations", conversationsRoute)
app.use("/api/messages", messagesRoute)
app.use("/api/files", filesRoute)
app.use("/api/influencer-data", influencerDataRoute)
app.use("/api/projects", projectsRoute)
app.use("/api/portfolios", portfoliosRoute)
app.use("/api/payments", paymentsRoute)
app.use("/api/admin", adminRoute)
app.use("/api/brand", brandRoute)
app.use("/api/influencer", influencerRoute)
app.use("/api/brand-requests", brandRequestsRoute)
app.use("/api/influencer-requests", influencerRequestsRoute)
app.use("/api/notifications", notificationsRoute)
app.use("/api/trending", trendingRoute)
app.use("/api", locationsRoute)
app.use("/api/campaigns", campaignDetailRoute)
app.use("/api/campaigns", campaignApplicationRoute)
app.use("/api/discover", discoveryRoute)
app.use("/api/account", accountRoute)
app.use("/api", messagesAndNotificationsRoute)
app.use("/api/help", helpSupportRoute)
app.use("/api/profile", userProfileRoute)
app.use("/api/favorites", favoritesRoute)
app.use("/api/reviews", reviewsRoute)
app.use("/api/analytics", analyticsRoute)
app.use("/api/collaborations", collaborationRoute)
app.use("/api/campaign-status", campaignStatusRoute)
app.use("/api/campaign-management", campaignManagementRoute)
app.use("/api/advanced-campaigns", advancedCampaignRoute)
app.use("/api/subscriptions", subscriptionsRoute)
app.use("/api/notification-settings", notificationSettingsRoute)
app.use("/api/profile", profileRoute)
app.use("/api/sms", smsRoute)
app.use("/api/lists", listsRoute)
app.use("/api/payment-methods", paymentMethodsRoute)

// 404 Handler - catch undefined routes
app.use(notFoundHandler)

// Global error handler - must be last
app.use(errorHandler)

// Initialize server after MongoDB connection
connectToMongo(process.env.MONGO_URI)
    .then(() => {
        console.log("Mongo Connected");
        // Start server only after MongoDB connection is established
        server.listen(PORT, () => {
            console.log("Server is running on port ", PORT);
        });
    })
    .catch(err => {
        console.error("Mongo connection failed:", err);
        process.exit(1);
    })

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

const headers = {
    authority: "i.instagram.com",
    accept: "/",
    "accept-language": "en-US,en;q=0.9,hi;q=0.8",
    "content-type": "application/x-www-form-urlencoded",
    cookie: `ig_did=4F8F57CA-BF49-4B85-8C52-611B0F525ACB; datr=dPE1Zc5Ddn8P6Q-xSRlNIMgG; ig_nrcb=1; ds_user_id=45032874760; ps_n=0; ps_l=0; mid=ZbqF0AAEAAHkroAy-X6KDIIhEDoQ; csrftoken=iBZmKJWoMnM6dEZhsp3JiS6ssjxq5MDQ; shbid="8503\\05445032874760\\0541741773742:01f7031d590a0902f9cc558f4016652ca4375b7b09a433547d9c7639e765399fa2195d60"; shbts="1710237742\\05445032874760\\0541741773742:01f70fb21741748081c033e6c761ef73a7f73432a9cac667babc7c7f35a66fac1b1c22bb"; rur="NAO\\05445032874760\\0541741773914:01f7c8c343f2aac7691a16e0b705b714253744eebe5b8caad15c902cae2dba7fc7fff837"; csrftoken=iBZmKJWoMnM6dEZhsp3JiS6ssjxq5MDQ`,
    // "sec-ch-ua": `"Chromium";v="122", "Not(A↵";v="24", "Google Chrome";v="122"`,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": `"macOS"`,
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "none",
    "user-agent": `'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'`,
    "x-asbd-id": "198387",
    "x-csrftoken": "iBZmKJWoMnM6dEZhsp3JiS6ssjxq5MDQ",
    "x-ig-app-id": "936619743392459",
    "x-ig-www-claim": "hmac.AR1yCz586xi6ZoH24dmvdq_ckLvj3lmcN1JbVTnAPHMcnl73",
    "x-instagram-ajax": "1",
    "x-requested-with": "XMLHttpRequest",
};

app.get("/", async (req, res) => {
    res.send("Home page of phyo")
})

// Debug endpoint to check available influencers
app.get("/api/debug/influencers", async (req, res) => {
    try {
        const count = await influencer.countDocuments();
        const sampleInfluencers = await influencer.find()
            .limit(10)
            .select('user_name city state categoryInstagram lastDemographicsFetch createdAt updatedAt instagramData.followers');
        
        return res.json({
            success: true,
            total_count: count,
            sample_data: sampleInfluencers,
            message: "This shows a sample of influencers in your database with fetch timestamps"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post("/api/ask", async (req, res) => {
    const { prompt } = req.body
    try {
        console.log('='.repeat(60));
        console.log('NEW FLOW: AI Generates Usernames + Fetch Demographics');
        console.log('='.repeat(60));
        
        // Step 1: AI generates influencer usernames based on the request
        console.log('\n[STEP 1] Asking AI to suggest Instagram usernames...');
        const response = await openai.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                { 
                    role: "system", 
                    content: "You are an expert Instagram influencer researcher. Based on the user's requirements (category, location, follower count), suggest 5-10 real Instagram usernames that match the criteria. Also extract the search criteria details. Return actual Instagram usernames without @ symbol."
                },
                { role: "user", content: prompt }
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "influencer_suggestions",
                    schema: {
                        type: "object",
                        properties: {
                            searchCriteria: {
                                type: "object",
                                properties: {
                                    city: { type: "string" },
                                    state: { type: "string" },
                                    minFollowers: { type: "number" },
                                    maxFollowers: { type: "number" },
                                    category: { type: "string" }
                                },
                                required: ["city", "state", "minFollowers", "maxFollowers", "category"],
                                additionalProperties: false
                            },
                            usernames: {
                                type: "array",
                                items: { type: "string" },
                                description: "Array of Instagram usernames without @ symbol"
                            }
                        },
                        required: ["searchCriteria", "usernames"],
                        additionalProperties: false,
                    },
                    strict: true,
                }
            }
        });
        
        const aiResponse = response.choices[0].message.parsed || {};
        const searchCriteria = aiResponse.searchCriteria || {};
        const usernames = aiResponse.usernames || [];
        
        console.log('Search Criteria:', searchCriteria);
        console.log(`AI Suggested ${usernames.length} usernames:`, usernames);

        if (usernames.length === 0) {
            return res.status(200).json({
                success: true,
                searchCriteria,
                data: [],
                message: 'AI could not suggest any influencers for your criteria'
            });
        }

        // Step 2: Check which usernames need fresh data (15-day cache)
        console.log('\n[STEP 2] Checking database cache (15-day validity)...');
        const CACHE_VALIDITY_DAYS = 15;
        const cacheValidityMs = CACHE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
        const now = new Date();
        
        const usernameStatus = [];
        const usernamesToFetch = [];
        const cachedInfluencers = [];
        
        for (const username of usernames) {
            const existingInfluencer = await influencer.findOne({ user_name: username });
            
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
                    const timeSinceLastFetch = now - new Date(lastFetched);
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

        // Step 3: Fetch demographics only for usernames that need it
        let demographicsResults = [];
        
        if (usernamesToFetch.length > 0) {
            console.log('\n[STEP 3] Fetching demographics from BrightScraper API...');
            const BRIGHTSCRAPER_URL = process.env.BRIGHTSCRAPER_URL || 'http://localhost:5000';
            
            const demographicsPromises = usernamesToFetch.map(async (username) => {
                try {
                    console.log(`  → Fetching demographics for @${username}`);
                    const response = await axios.post(
                        `${BRIGHTSCRAPER_URL}/analyze`,
                        { username, max_posts: 6 },
                        { timeout: 120000 } // 120 second timeout per request
                    );
                    
                    if (response.data && response.data.success) {
                        console.log(`  ✓ Demographics received for @${username}`);
                        return {
                            username,
                            demographics: response.data.data,
                            success: true,
                            fromCache: false
                        };
                    } else {
                        console.log(`  ✗ Failed to get demographics for @${username}`);
                        return { username, demographics: null, success: false, fromCache: false };
                    }
                } catch (error) {
                    console.error(`  ✗ Error fetching demographics for @${username}:`, error.message);
                    return { username, demographics: null, success: false, error: error.message, fromCache: false };
                }
            });

            // Wait for all demographics to be fetched
            demographicsResults = await Promise.all(demographicsPromises);
        } else {
            console.log('\n[STEP 3] Skipping API calls - all data available in cache');
        }
        
        // Step 4: Save/Update database and prepare final results
        console.log('\n[STEP 4] Processing results and updating database...');
        const finalResults = [];
        
        // First, add all cached influencers to results
        for (const cachedInf of cachedInfluencers) {
            const infObject = cachedInf.toObject();
            
            finalResults.push({
                username: cachedInf.user_name,
                profile_name: cachedInf.profile_name,
                followers: cachedInf.instagramData?.followers || 0,
                following: cachedInf.instagramData?.following || 0,
                posts_count: cachedInf.instagramData?.posts_count || 0,
                biography: cachedInf.biography || '',
                is_verified: cachedInf.is_verified || false,
                is_business: cachedInf.is_business || false,
                avg_engagement: cachedInf.instagramData?.avg_engagement || 0,
                demographics: {
                    gender_distribution: {
                        male: cachedInf.instagramData?.genderDistribution?.find(g => g.gender === 'MALE')?.distribution || 0,
                        female: cachedInf.instagramData?.genderDistribution?.find(g => g.gender === 'FEMALE')?.distribution || 0,
                        unknown: cachedInf.instagramData?.genderDistribution?.find(g => g.gender === 'UNKNOWN')?.distribution || 0
                    },
                    age_distribution: cachedInf.instagramData?.ageDistribution?.reduce((acc, item) => {
                        acc[item.age] = item.value;
                        return acc;
                    }, {}) || {},
                    country_distribution: cachedInf.instagramData?.audienceByCountry?.reduce((acc, item) => {
                        acc[item.name] = item.value;
                        return acc;
                    }, {}) || {},
                    city_distribution: cachedInf.instagramData?.audienceByCity?.reduce((acc, item) => {
                        acc[item.name] = item.value;
                        return acc;
                    }, {}) || {},
                    language_distribution: cachedInf.instagramData?.languageDistribution?.reduce((acc, item) => {
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
                const demo = demoResult.demographics;
                
                try {
                    // Check if influencer already exists in database
                    let existingInfluencer = await influencer.findOne({ user_name: demo.username });
                    
                    if (existingInfluencer) {
                        console.log(`  ↻ Updating existing influencer: @${demo.username}`);
                        // Update existing influencer with new demographics data
                        existingInfluencer.profile_name = demo.profile_name;
                        existingInfluencer.biography = demo.biography;
                        existingInfluencer.is_verified = demo.is_verified;
                        existingInfluencer.is_business = demo.is_business;
                        existingInfluencer.city = searchCriteria.city || existingInfluencer.city;
                        existingInfluencer.state = searchCriteria.state || existingInfluencer.state;
                        existingInfluencer.categoryInstagram = searchCriteria.category || existingInfluencer.categoryInstagram;
                        existingInfluencer.lastDemographicsFetch = new Date(); // Track when demographics were fetched
                        existingInfluencer.instagramData = {
                            ...existingInfluencer.instagramData,
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
                            audienceByCountry: Object.entries(demo.country_distribution || {}).map(([name, value]) => ({ name, value })),
                            audienceByCity: Object.entries(demo.city_distribution || {}).map(([name, value]) => ({ name, value })),
                            languageDistribution: Object.entries(demo.language_distribution || {}).map(([language, value]) => ({ language, value })),
                            audienceQualityScore: demo.audience_quality_score,
                            fakeFollowersPercent: demo.fake_followers_percent,
                            totalCommentsAnalyzed: demo.total_comments_analyzed,
                            realUsersAnalyzed: demo.real_users_analyzed
                        };
                        const savedInfluencer = await existingInfluencer.save();
                        console.log(`  ✓ Updated @${demo.username} - lastFetch: ${savedInfluencer.lastDemographicsFetch}`);
                    } else {
                        console.log(`  + Creating new influencer: @${demo.username}`);
                        // Create new influencer document
                        existingInfluencer = await influencer.create({
                            user_name: demo.username,
                            profile_name: demo.profile_name,
                            name: demo.profile_name,
                            biography: demo.biography,
                            is_verified: demo.is_verified,
                            is_business: demo.is_business,
                            city: searchCriteria.city || '',
                            state: searchCriteria.state || '',
                            categoryInstagram: searchCriteria.category || '',
                            lastDemographicsFetch: new Date(), // Track when demographics were fetched
                            instagramData: {
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
                                audienceByCountry: Object.entries(demo.country_distribution || {}).map(([name, value]) => ({ name, value })),
                                audienceByCity: Object.entries(demo.city_distribution || {}).map(([name, value]) => ({ name, value })),
                                languageDistribution: Object.entries(demo.language_distribution || {}).map(([language, value]) => ({ language, value })),
                                audienceQualityScore: demo.audience_quality_score,
                                fakeFollowersPercent: demo.fake_followers_percent,
                                totalCommentsAnalyzed: demo.total_comments_analyzed,
                                realUsersAnalyzed: demo.real_users_analyzed
                            }
                        });
                        console.log(`  ✓ Created @${demo.username} - lastFetch: ${existingInfluencer.lastDemographicsFetch}`);
                    }
                    
                    // Add to final results
                    finalResults.push({
                        username: demo.username,
                        profile_name: demo.profile_name,
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
                    
                } catch (dbError) {
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

        console.log('\n[COMPLETE] Returning results with full demographics');
        console.log(`Successfully processed ${finalResults.length} influencers`);
        console.log('='.repeat(60));
        
        return res.status(200).json({
            success: true,
            searchCriteria,
            total_found: finalResults.length,
            data: finalResults,
        });

    } catch (error) {
        console.error('\n[ERROR] in /api/ask endpoint:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});



const getSnapshot = async (snapshotId, maxRetries = 5, retryDelay = 5000) => {
    if (!snapshotId) {
        throw new Error('Snapshot ID is required');
    }

    // Initial delay before first attempt
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let retries = 0;

    while (retries < maxRetries) {
        try {
            // Use the provided specific URL format with the passed snapshot ID
            const resp = await axios({
                method: "get",
                url: `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
                headers: {
                    Authorization: `Bearer de8a3a9b9ffeaefbf16d559ab912f36407edc8406f05156021e3e69ddc2ad719`,
                },
                timeout: 15000 // 15 second timeout
            });

            console.log(`Snapshot status: ${resp.data.status}`);

            // If data is already available in the response
            if (resp.data && Array.isArray(resp.data)) {
                console.log('Snapshot data received directly');
                return resp.data;
            }

            if (resp.data.status === 'running') {
                if (retries >= maxRetries - 1) {
                    throw new Error('Maximum retries reached while waiting for snapshot');
                }

                console.log(`Retry ${retries + 1}/${maxRetries}: Snapshot is not ready yet, retrying in ${retryDelay / 1000}s...`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                retries++;
            } else if (resp.data.status === 'success' || resp.data.status === 'complete') {
                console.log('Snapshot is ready, fetching data');

                // Fetch the actual data using the format=json endpoint with the dynamic snapshot ID
                const dataResp = await axios({
                    method: "get",
                    url: `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
                    headers: {
                        Authorization: `Bearer de8a3a9b9ffeaefbf16d559ab912f36407edc8406f05156021e3e69ddc2ad719`,
                    },
                    timeout: 15000
                });

                return dataResp.data;
            } else {
                throw new Error(`Unexpected snapshot status: ${resp.data.status}`);
            }
        } catch (error) {
            console.error(`Error fetching snapshot ${snapshotId}:`, error.message);

            if (retries >= maxRetries - 1) {
                throw new Error(`Failed to fetch snapshot after ${maxRetries} attempts: ${error.message}`);
            }

            console.log(`Retry ${retries + 1}/${maxRetries}: Error occurred, retrying in ${retryDelay / 1000}s...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            retries++;
        }
    }

    throw new Error(`Failed to fetch snapshot after ${maxRetries} attempts`);
};


app.get("/details", async (req, res) => {
    const { userName } = req.query;

    try {
        // Fetch influencer details from the database
        let influencerDetails = await influencer.findOne({ user_name: userName });

        if (!influencerDetails) {
            return res.status(404).json({
                success: false,
                message: "Influencer not found",
            });
        }

        // Updated URL for BrightData API
        const resp = await axios({
            method: "post",
            url: "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_l1vikfch901nx3by4&include_errors=true",
            data: { url: `https://instagram.com/${influencerDetails.user_name}` },
            headers: {
                Authorization: `Bearer de8a3a9b9ffeaefbf16d559ab912f36407edc8406f05156021e3e69ddc2ad719`,
                "Content-Type": "application/json",
            },
        });

        const snapshotId = resp.data.snapshot_id;
        console.log(`Details Snapshot ID: ${snapshotId}`);

        // Wait for the snapshot data with the dynamic snapshot ID
        const snapshotData = await getSnapshot(snapshotId, 10, 8000); // Increased retries and delay
        console.log('Details snapshot data received');

        if (!snapshotData || !snapshotData[0]) {
            return res.status(404).json({
                success: false,
                message: "No data found for this influencer",
            });
        }

        const data = snapshotData[0];
        let posts = data.posts || [];

        let totalLikes = 0;
        let totalComments = 0;

        posts.forEach((post) => {
            totalLikes += post.likes || 0;
            totalComments += post.comments || 0;
        });

        const avgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
        const avgComments = posts.length > 0 ? totalComments / posts.length : 0;
        const avgEngagement = data.avg_engagement || 0;

        influencerDetails = {
            ...influencerDetails._doc, // Spread the existing details from the database
            image: data?.profile_image_link || '',
            name: data?.profile_name || '',
            userCount: data?.followers || 0,
            instagramData: {
                ...influencerDetails.instagramData,
                avgLikes,
                avgComments,
                avgEngagement,
            }
        };

        return res.status(200).json({
            success: true,
            data: influencerDetails,
        });
    } catch (error) {
        console.error('Error in /details endpoint:', error.message);
        return res.status(500).json({
            success: false,
            message: error?.response?.data?.message || "Internal server error",
        });
    }
});

app.post("/influencer", async (req, res) => {
    await influencer.create({
        name: "Star anonymous"
    })
    res.send("influencer created")
})

app.patch("/editInfluencer/:username", async (req, res) => {
    try {
        const { username } = req.params
        const { averageViews, averageComments, averageEngagement, averageLikes, image } = req.body
        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Provide Username to edit the influencer"
            })
        }

        if (!averageViews || !averageComments || !averageEngagement || !averageLikes || !image) {
            return res.status(400).json({
                success: false,
                message: "Provide all the fields"
            })
        }

        const foundInfluencer = await influencer.findOne({ user_name: username })

        if (!foundInfluencer) {
            return res.status(400).json({
                success: false,
                message: "Influencer with this username is not available in our records"
            })
        }

        foundInfluencer.averageLikes = averageLikes;
        foundInfluencer.averageViews = averageViews;
        foundInfluencer.averageComments = averageComments;
        foundInfluencer.averageEngagement = averageEngagement;
        foundInfluencer.image = image

        await foundInfluencer.save()

        // await influencer.findOneAndUpdate({user_name: username}, {averageViews, averageComments, averageEngagement, averageLikes})

        return res.status(200).json({
            success: true,
            message: "Influencer Updated",
        })

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error?.message || "Internal server error",
        });
    }
})
// WebSocket setup
io.on('connection', (socket) => {
    console.log('New WebSocket connection:', socket.id);

    socket.on('join-conversation', (conversationId) => {
        socket.join(`conversation-${conversationId}`);
        console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    socket.on('send-message', (data) => {
        io.to(`conversation-${data.conversationId}`).emit('message-received', data);
    });

    socket.on('user-typing', (data) => {
        socket.to(`conversation-${data.conversationId}`).emit('user-typing', data);
    });

    socket.on('stop-typing', (data) => {
        socket.to(`conversation-${data.conversationId}`).emit('stop-typing', data);
    });

    socket.on('disconnect', () => {
        console.log('WebSocket disconnected:', socket.id);
    });
});

// WebSocket test endpoint
app.get('/api/websocket/test', (req, res) => {
    res.json({
        success: true,
        message: 'WebSocket server is running',
        socketServerInfo: {
            engine: 'socket.io',
            clients: io.engine.clientsCount
        }
    });
});

// Server is now started in the MongoDB connection callback above