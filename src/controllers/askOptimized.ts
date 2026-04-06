import { Request, Response } from "express";
import { extractUsernamesWithGPT } from "../services/usernameExtractor";
import { findInfluencersWithPerplexity } from "../services/perplexitySearch";
import { fetchDemographicsForUsernames } from "../services/demographicsFetcher";
import DemographicsCache from "../models/demographicsCache";
import getDemographics from "../utils/getDemographics";
import {
  getInstagramProfileData,
  scrapNewInstagramProfileData,
} from "../utils/getProfileData";

interface AskRequest {
  prompt: string;
}

interface AskResponse {
  success: boolean;
  result: {
    city: string;
    state: string;
    minFollowers: number;
    maxFollowers: number;
    category: string;
  };
  data: any[];
  message?: string;
  error?: string;
  citations?: string[];
}

/**
 * OPTIMIZED /api/ask HANDLER
 *
 * NEW FLOW:
 * 1. Use ChatGPT to extract usernames from prompt (handles ALL edge cases)
 * 2. If usernames found → check DB cache → fetch from BrightScraper if needed
 * 3. If no usernames → use Perplexity to find influencers based on criteria
 * 4. Check DB cache for Perplexity results → fetch from BrightScraper if needed
 * 5. Return results
 */

export const handleAsk = async (
  req: Request<{}, AskResponse, AskRequest>,
  res: Response<AskResponse>,
): Promise<void> => {
  const { prompt } = req.body;

  try {
    console.log("=".repeat(70));
    console.log(
      "🚀 NEW OPTIMIZED FLOW: Perplexity → Perplexity → Demographics",
    );
    console.log("=".repeat(70));
    console.log(`📝 Prompt: "${prompt}"\n`);

    // STEP 1: Use Perplexity to analyze prompt and extract usernames
    console.log("[STEP 1] Perplexity analyzing prompt...");
    const extraction = await extractUsernamesWithGPT(prompt);

    console.log("📊 Perplexity Analysis:");
    console.log(`  - Has Usernames: ${extraction.hasUsernames}`);
    console.log(`  - Needs AI Search: ${extraction.needsAI}`);
    console.log(`  - Requested Count: ${extraction.count || "default (4)"}`);
    if (extraction.usernames.length > 0) {
      console.log(
        `  - Usernames: ${extraction.usernames.map((u) => "@" + u).join(", ")}`,
      );
    }

    let usernamesToFetch: string[] = [];
    let searchCriteria: any = {
      city: "N/A",
      state: "N/A",
      minFollowers: 0,
      maxFollowers: 1000000000,
      category: "N/A",
    };
    let citations: string[] = [];

    // STEP 2: Branch based on extraction result
    // Find verified travel influencers in Delhi with 500k to 2M followers
    if (extraction.hasUsernames && extraction.usernames.length > 0) {
      // User asked for specific usernames
      console.log(`\n✅ SPECIFIC USERNAMES DETECTED`);
      console.log(`   Processing ${extraction.usernames.length} username(s)\n`);
      usernamesToFetch = extraction.usernames;
    } else if (extraction.needsAI) {
      // User wants to find influencers - use Perplexity
      console.log(`\n🔍 AI SEARCH NEEDED`);
      console.log(
        `   Using Perplexity to find ${extraction.count} influencer(s)...\n`,
      );

      console.log("[STEP 2] Perplexity searching for influencers...");
      const perplexityResult = await findInfluencersWithPerplexity(
        prompt,
        extraction.count || 3,
      );

      if (perplexityResult.usernames.length > 0) {
        console.log(
          `✅ Perplexity found ${perplexityResult.usernames.length} username(s):`,
        );
        console.log(
          `   ${perplexityResult.usernames.map((u) => "@" + u).join(", ")}`,
        );

        usernamesToFetch = perplexityResult.usernames;
        // usernamesToFetch = ["anshul.jeet444"];

        searchCriteria = perplexityResult.searchCriteria;
        citations = perplexityResult.citations || [];

        // fetch demographics from database for all usernames found by Perplexity and log results

        const normalizedUsernames = usernamesToFetch
          .map((username) => username.replace(/^@/, "").trim().toLowerCase())
          .filter(Boolean);

        let cachedDemographics = await DemographicsCache.find({
          username: { $in: normalizedUsernames },
        });

        // console.log(JSON.stringify(cachedDemographics, null, 2));
        console.log(
          `\n💾 Found cached demographics for ${cachedDemographics.length} username(s):`,
        );

        if (cachedDemographics.length === 0) {
          await Promise.all(normalizedUsernames.map((u) => getDemographics(u)));
        }

        cachedDemographics = await DemographicsCache.find({
          username: { $in: normalizedUsernames },
        });

        // if (cachedDemographics.length > 0) {
        //   res.status(200).json({
        //     success: true,
        //     result: searchCriteria,
        //     data: JSON.parse(JSON.stringify(cachedDemographics)),
        //   });
        //   return;
        // }

        let profileData = [] as any[];
        let scrapedData = {} as any;

        try {
          profileData = await Promise.all(
            normalizedUsernames.map((u) => getInstagramProfileData(u)),
          );
          console.log(
            `\n📊 Instagram profile data fetched for ${profileData.length} username(s):`,
          );

          // run scrapNewInstagramProfileData for any usernames that did not return profile data from getInstagramProfileData
          const usernamesForScraping = normalizedUsernames.filter(
            (u) => !profileData.some((p) => p?.username?.toLowerCase() === u)
          );

          if (usernamesForScraping.length > 0) {

           scrapedData =await scrapNewInstagramProfileData(usernamesForScraping);
          }


          // if (
          //   profileData.length !== normalizedUsernames.length ||
          //   profileData.some((item) => item == null)
          // ) {
          //   profileData = await scrapNewInstagramProfileData(normalizedUsernames);
          // }
        } catch (error) {
          console.error("❌ Error fetching Instagram profile data:", error);
        }

        // if (profileData.length != normalizedUsernames.length) {
        //   console.error("❌ Incomplete profile data fetched");
        // }
        if (profileData && cachedDemographics.length > 0) {
          res.status(200).json({
            success: true,
            result: searchCriteria,
            data: [
              {
                demographics: cachedDemographics,
                profileData: profileData,
                scrapedData: {
                  "job_id": scrapedData[0]?.job_id || null,
                  "job_type": scrapedData[0]?.job_type || null,
                  "status": scrapedData[0]?.status || null,
                  "queued_at": scrapedData[0]?.queued_at || null,
                  "usernames": scrapedData[0]?.usernames || [],
                  "result": scrapedData[0]?.result || {},
                },
              },
            ],
            message: `Retrieved ${cachedDemographics.length} cached demographic record(s) with profile data`,
          });
          return;
        }

        if (citations.length > 0) {
          console.log(`\n📚 Sources (${citations.length}):`);
          citations.slice(0, 3).forEach((citation, idx) => {
            console.log(`   ${idx + 1}. ${citation}`);
          });
        }
      } else {
        console.error("❌ Perplexity found no usernames");
        res.status(404).json({
          success: false,
          result: searchCriteria,
          data: [],
          message:
            "No influencers found matching your criteria. Please try a different search.",
          error: "No results from Perplexity",
        });
        return;
      }
    } else {
      // Unclear prompt
      console.log("\n⚠️  UNCLEAR PROMPT");
      res.status(400).json({
        success: false,
        result: searchCriteria,
        data: [],
        message:
          'Please specify either influencer usernames or search criteria (e.g., "food influencers from Mumbai")',
        error: "Unclear prompt",
      });
      return;
    }

    // STEP 3: Fetch demographics for all usernames
    console.log(
      `\n[STEP 3] Fetching demographics for ${usernamesToFetch.length} username(s)...`,
    );
    const { results, brightScraperAvailable } =
      await fetchDemographicsForUsernames(usernamesToFetch);

    // Check if BrightScraper is unavailable
    if (!brightScraperAvailable) {
      res.status(503).json({
        success: false,
        result: searchCriteria,
        data: [],
        error: "Demographics service unavailable",
        message: `BrightScraper service is not available. Please start it at ${process.env.BRIGHTSCRAPER_URL || "http://127.0.0.1:5000"}`,
      });
      return;
    }

    // STEP 4: Format and return results
    console.log("\n[STEP 4] Formatting response...");

    const formattedResults = results.map((result) => {
      if (result.error) {
        return {
          username: result.username,
          error: result.error,
          success: false,
        };
      }

      return {
        username: result.username,
        profile_name: result.data?.profile_name || result.username,
        profile_pic_url: result.data?.profile_pic_url || "",
        followers: result.data?.followers || 0,
        following: result.data?.following || 0,
        posts_count: result.data?.posts_count || 0,
        biography: result.data?.biography || "",
        is_verified: result.data?.is_verified || false,
        is_business: result.data?.is_business || false,
        avg_engagement: result.data?.avg_engagement || 0,
        demographics: {
          gender_distribution: result.data?.gender_distribution || {
            male: 0,
            female: 0,
            unknown: 0,
          },
          age_distribution: result.data?.age_distribution || {},
          country_distribution: result.data?.country_distribution || {},
          city_distribution: result.data?.city_distribution || {},
          language_distribution: result.data?.language_distribution || {},
          audience_quality_score: result.data?.audience_quality_score || 0,
          fake_followers_percent: result.data?.fake_followers_percent || 0,
          total_comments_analyzed: result.data?.total_comments_analyzed || 0,
          real_users_analyzed: result.data?.real_users_analyzed || 0,
        },
        fromCache: result.fromCache,
        lastUpdated: result.lastUpdated,
        success: true,
      };
    });

    const successCount = formattedResults.filter((r) => r.success).length;
    const failCount = formattedResults.filter((r) => !r.success).length;
    const cachedCount = formattedResults.filter((r) => r.fromCache).length;
    const freshCount = formattedResults.filter(
      (r) => r.success && !r.fromCache,
    ).length;

    // FILTER OUT FAILED RESULTS - Only return successful influencers
    const successfulResults = formattedResults.filter((r) => r.success);

    let message = `Retrieved ${successCount} influencer(s)`;
    if (cachedCount > 0) {
      message += ` (${cachedCount} from cache, ${freshCount} fresh)`;
    }
    if (failCount > 0) {
      message += ` - ${failCount} excluded (failed to fetch)`;
    }

    console.log("\n" + "=".repeat(70));
    console.log(`✅ SUCCESS: ${message}`);
    if (failCount > 0) {
      console.log(
        `⚠️  Note: ${failCount} profiles were excluded from results due to fetch failures`,
      );
    }
    console.log("=".repeat(70) + "\n");

    const response: AskResponse = {
      success: true,
      result: searchCriteria,
      data: successfulResults, // Only return successful results
      message,
    };

    if (citations.length > 0) {
      response.citations = citations;
    }

    res.status(200).json(response);
  } catch (error: any) {
    console.error("\n" + "=".repeat(70));
    console.error("❌ ERROR:", error.message);
    console.error("=".repeat(70) + "\n");

    res.status(500).json({
      success: false,
      result: {
        city: "N/A",
        state: "N/A",
        minFollowers: 0,
        maxFollowers: 0,
        category: "N/A",
      },
      data: [],
      error: error.message,
      message: "An error occurred while processing your request",
    });
  }
};

// Re-export other handlers from the old ask controller
// These handlers are kept for backward compatibility
export {
  handleDetails,
  handleDebugData,
  handleTestBrightData,
  handleTestSnapshot,
  handleInstagramReel,
} from "./ask";
