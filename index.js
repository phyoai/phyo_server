require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { OpenAI } = require("openai")
const influencer = require("./models/influencer")
const { connectToMongo } = require("./connections/db")
const axios = require("axios")
// const data = require("./data")

const app = express()
const PORT = 8000

const authRoute = require("./routes/user")

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors({
    origin: "https://phyo.ai",
    credentials: true
}))
connectToMongo(process.env.MONGO_URI)
    .then(console.log("Mongo Connected"))

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

app.post("/api/ask", async (req, res) => {
    const { prompt } = req.body
    try {
        const response = await openai.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                { role: "system", content: "You are a influencer marketer. User will tell you there needs and you will have to note the requirements and if you do not understand what they want for some field so leave it empty string. Do not fill with fillers words like not specified etc. If only male ratio is passed than only pass male ratio and vice versa. and for the age distribution you will have to see the user demand and create a range seeing following ranges that in what range do his required audience fit and if it cover more than one range then create one range out of those two and make sure to return range like this [minage]-[maxage]. These are ranges in my schema 13-17, 18-24, 25-34, 35-44, 45-64, 65+ " },
                { role: "user", content: prompt }
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "influencer_requirements",
                    schema: {
                        type: "object",
                        properties: {
                            city: { type: "string" },
                            state: { type: "string" },
                            minFollowers: { type: "number" },
                            maxFollowers: { type: "number" },
                            category: { type: "string" },
                            maleRatio: { type: "number" },
                            femaleRatio: { type: "number" },
                            maleComparison: { type: "string", enum: [">=", "<="] },
                            femaleComparison: { type: "string", enum: [">=", "<="] },
                            country: { type: "string" },
                            countryComparison: { type: "string", enum: [">=", "<="] },
                            countryValue: { type: "number" },
                            ageRange: { type: "string" },
                            ageComparison: { type: "string", enum: [">=", "<="] },
                            ageValue: { type: "number" },
                        },
                        required: ["city", "category", "minFollowers", "maxFollowers", "state", "maleRatio", "femaleRatio", "maleComparison", "femaleComparison", "country", "countryComparison", "countryValue", "ageRange", "ageComparison", "ageValue"],
                        additionalProperties: false,
                    },
                    strict: true,
                }
            }
        })
        const math_reasoning = response.choices[0].message.parsed || {};
        const result = {
            city: math_reasoning.city || "",
            state: math_reasoning.state || "",
            minFollowers: math_reasoning.minFollowers || 0,
            maxFollowers: math_reasoning.maxFollowers || Infinity,
            category: math_reasoning.category || "",
            maleRatio: math_reasoning.maleRatio || null,
            femaleRatio: math_reasoning.femaleRatio || null,
            maleComparison: math_reasoning.maleComparison === ">=" ? "$gte" : math_reasoning.maleComparison === "<=" ? "$lte" : "$gte",
            femaleComparison: math_reasoning.femaleComparison === ">=" ? "$gte" : math_reasoning.femaleComparison === "<=" ? "$lte" : "$gte",
            countryComparison: math_reasoning.countryComparison === ">=" ? "$gte" : math_reasoning.countryComparison === "<=" ? "$lte" : "$gte",
            countryValue: math_reasoning.countryValue || null,
            country: math_reasoning.country || null,
            ageRanges: math_reasoning.ageRange || null,
            ageComparison: math_reasoning.ageComparison === ">=" ? "$gte" : math_reasoning.ageComparison === "<=" ? "$lte" : "$gte",
            ageValue: math_reasoning.ageValue || null,
        };

        const query = {
            $and: [
                { $or: [{ city: result.city }, { state: result.state }] },
                { $or: [{ "instagramData.followers": { $gte: result.minFollowers } }, { "youtubeData.followers": { $gte: result.minFollowers } }] },
            ],
        };

        // Add category condition only if it's provided
        if (result.category) {
            query.$and.push({ $or: [{ categoryInstagram: result.category }, { categoryYouTube: result.category }] });
        }

        if (result.maleRatio !== null || result.femaleRatio !== null) {
            const genderQuery = [];

            if (result.maleRatio !== null) {
                genderQuery.push(
                    { "instagramData.genderDistribution": { $elemMatch: { gender: "MALE", distribution: { [result.maleComparison]: result.maleRatio } } } },
                    { "youtubeData.genderDistribution": { $elemMatch: { gender: "MALE", distribution: { [result.maleComparison]: result.maleRatio } } } },
                );
            }

            if (result.femaleRatio !== null) {
                genderQuery.push(
                    { "instagramData.genderDistribution": { $elemMatch: { gender: "FEMALE", distribution: { [result.femaleComparison]: result.femaleRatio } } } },
                    { "youtubeData.genderDistribution": { $elemMatch: { gender: "FEMALE", distribution: { [result.femaleComparison]: result.femaleRatio } } } },
                );
            }

            query.$and.push({ $or: genderQuery });
        }
        if (result.country && result.countryValue !== null) {
            const countryQuery = [];

            countryQuery.push({
                "instagramData.audienceByCountry": {
                    $elemMatch: { name: result.country, value: { [result.countryComparison]: result.countryValue } }
                }
            });

            countryQuery.push({
                "youtubeData.audienceByCountry": {
                    $elemMatch: { name: result.country, value: { [result.countryComparison]: result.countryValue } }
                }
            });

            query.$and.push({ $or: countryQuery });
        }

        if (result.ageRanges && result.ageComparison && result.ageValue !== null) {
            const ageQuery = {
                $expr: {
                    [result.ageComparison]: [
                        {
                            $sum: {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: "$instagramData.ageDistribution",
                                            as: "age",
                                            cond: {
                                                $and: [
                                                    {
                                                        $gte: [
                                                            {
                                                                $convert: {
                                                                    input: { $arrayElemAt: [{ $split: ["$$age.age", "-"] }, 0] },
                                                                    to: "int",
                                                                    onError: 0,
                                                                    onNull: 0
                                                                }
                                                            },
                                                            parseInt(result.ageRanges.split("-")[0]) // Lower bound
                                                        ]
                                                    },
                                                    {
                                                        $lte: [
                                                            {
                                                                $convert: {
                                                                    input: { $arrayElemAt: [{ $split: ["$$age.age", "-"] }, 1] },
                                                                    to: "int",
                                                                    onError: 0,
                                                                    onNull: 0
                                                                }
                                                            },
                                                            parseInt(result.ageRanges.split("-")[result.ageRanges.split("-").length - 1]) // Upper bound
                                                        ]
                                                    }
                                                ]
                                            }
                                        }
                                    },
                                    as: "filteredAge",
                                    in: "$$filteredAge.value"
                                }
                            }
                        },
                        result.ageValue
                    ]
                }
            };
            query.$and.push(ageQuery);
        }

        const foundInfluencers = await influencer.find(query);
        if (!foundInfluencers || foundInfluencers.length === 0) {
            return res.status(200).json({
                success: true,
                result,
                data: [],
            });
        }

        console.log({ foundInfluencers });

        // Return basic data immediately without waiting for Brightdata API
        const basicResults = foundInfluencers.map(inf => ({
            ...inf.toObject(),
            image: null,
            instagramData: {
                ...inf.instagramData,
                averageLikes: 0,
                averageComments: 0,
                averageEngagement: 0,
            }
        }));

        // Optional: Start the Brightdata API request in the background
        // This is non-blocking and will not delay the response
        try {
            let urls = [];
            foundInfluencers.forEach((inf) => {
                urls.push({ url: `https://www.instagram.com/${inf.user_name}/` });
            });

            // Send request to Brightdata API without awaiting the result
            axios({
                method: "post",
                url: "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lk5ns7kz21pck8jpis&include_errors=true&type=discover_new&discover_by=url",
                data: urls,
                headers: {
                    Authorization: `Bearer de8a3a9b9ffeaefbf16d559ab912f36407edc8406f05156021e3e69ddc2ad719`,
                    "Content-Type": "application/json",
                },
                timeout: 10000 // 10 second timeout
            }).then(async resp => {
                console.log(`Background Brightdata request started, Snapshot ID: ${resp.data.snapshot_id}`);

                // You could optionally fetch the data here if needed
                try {
                    const snapshotData = await getSnapshot(resp.data.snapshot_id, 5, 5000);
                    console.log(`Background data loaded for ${snapshotData.length} influencers`);
                    // Process snapshot data if needed
                } catch (snapshotError) {
                    console.error('Error getting snapshot data:', snapshotError.message);
                }

            }).catch(error => {
                console.error('Error starting Brightdata request:', error.message);
            });
        } catch (error) {
            console.error('Error in background Brightdata processing:', error.message);
            // Do not let this error affect the response
        }

        // Return the basic results immediately
        return res.status(200).json({
            success: true,
            result,
            data: basicResults,
        });

    } catch (error) {
        console.error('Error in /api/ask endpoint:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// Updated getSnapshot function
const getSnapshot = async (snapshotId, maxRetries = 5, retryDelay = 5000) => {
    if (!snapshotId) {
        throw new Error('Snapshot ID is required');
    }

    // Initial delay before first attempt
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let retries = 0;

    while (retries < maxRetries) {
        try {
            // Using the direct format=json endpoint instead of compress=true
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

                // Fetch the actual data using the format=json endpoint
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

        // Wait for the snapshot data with the correct snapshotId parameter
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

app.use("/api/user", authRoute)

app.listen(PORT, () => {
    console.log("Server is running on ", PORT);
})