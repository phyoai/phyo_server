import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import Influencer from '../models/influencer';
import { 
  AskRequest, 
  AskResponse, 
  ProcessedRequirements
} from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface OpenAIResponse {
  city: string;
  state: string;
  minFollowers: number;
  maxFollowers: number;
  category: string;
  maleRatio: number;
  femaleRatio: number;
  maleComparison: '>=' | '<=';
  femaleComparison: '>=' | '<=';
  country: string;
  countryComparison: '>=' | '<=';
  countryValue: number;
  ageRange: string;
  ageComparison: '>=' | '<=';
  ageValue: number;
}


export const handleAsk = async (req: Request<{}, AskResponse, AskRequest>, res: Response<AskResponse>): Promise<void> => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      res.status(400).json({
        success: false,
        result: {} as ProcessedRequirements,
        data: [],
        error: "Prompt is required"
      });
      return;
    }

    const response = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { 
          role: "system", 
          content: "You are a influencer marketer. User will tell you there needs and you will have to note the requirements and if you do not understand what they want for some field so leave it empty string. Do not fill with fillers words like not specified etc. If only male ratio is passed than only pass male ratio and vice versa. and for the age distribution you will have to see the user demand and create a range seeing following ranges that in what range do his required audience fit and if it cover more than one range then create one range out of those two and make sure to return range like this [minage]-[maxage]. These are ranges in my schema 13-17, 18-24, 25-34, 35-44, 45-64, 65+" 
        },
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
    });

    const mathReasoning = (response.choices[0].message.parsed as unknown as OpenAIResponse) || {} as OpenAIResponse;
    
    const result: ProcessedRequirements = {
      city: mathReasoning.city || "",
      state: mathReasoning.state || "",
      minFollowers: mathReasoning.minFollowers || 0,
      maxFollowers: mathReasoning.maxFollowers || Number.MAX_SAFE_INTEGER,
      category: mathReasoning.category || "",
      maleRatio: mathReasoning.maleRatio || null,
      femaleRatio: mathReasoning.femaleRatio || null,
      maleComparison: mathReasoning.maleComparison === ">=" ? "$gte" : mathReasoning.maleComparison === "<=" ? "$lte" : "$gte",
      femaleComparison: mathReasoning.femaleComparison === ">=" ? "$gte" : mathReasoning.femaleComparison === "<=" ? "$lte" : "$gte",
      countryComparison: mathReasoning.countryComparison === ">=" ? "$gte" : mathReasoning.countryComparison === "<=" ? "$lte" : "$gte",
      countryValue: mathReasoning.countryValue || null,
      country: mathReasoning.country || null,
      ageRanges: mathReasoning.ageRange || null,
      ageComparison: mathReasoning.ageComparison === ">=" ? "$gte" : mathReasoning.ageComparison === "<=" ? "$lte" : "$gte",
      ageValue: mathReasoning.ageValue || null,
    };

    // Build MongoDB query
    const query: any = {
      $and: [
        { $or: [{ city: result.city }, { state: result.state }] },
        { $or: [
          { "instagramData.followers": { $gte: result.minFollowers } }, 
          { "youtubeData.followers": { $gte: result.minFollowers } }
        ]},
      ],
    };

    // Add category condition only if it's provided
    if (result.category) {
      query.$and.push({ 
        $or: [
          { categoryInstagram: result.category }, 
          { categoryYouTube: result.category }
        ] 
      });
    }

    // Add gender conditions
    if (result.maleRatio !== null || result.femaleRatio !== null) {
      const genderQuery: any[] = [];

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

    // Add country conditions
    if (result.country && result.countryValue !== null) {
      const countryQuery: any[] = [];

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

    // Add age conditions
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

    const foundInfluencers = await Influencer.find(query);
    
    if (!foundInfluencers || foundInfluencers.length === 0) {
      res.status(200).json({
        success: true,
        result,
        data: [],
      });
      return;
    }

    console.log({ foundInfluencers: foundInfluencers.length });

    // Return influencer data from database
    const results = foundInfluencers.map(inf => inf.toObject());

    res.status(200).json({
      success: true,
      result,
      data: results,
    });

  } catch (error) {
    console.error('Error in /api/ask endpoint:', error instanceof Error ? error.message : 'Unknown error');
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