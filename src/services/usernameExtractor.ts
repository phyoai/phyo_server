import axios from 'axios';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface UsernameExtractionResult {
  hasUsernames: boolean;
  usernames: string[];
  needsAI: boolean;
  count?: number; // Number of influencers requested by user
}

/**
 * Use ChatGPT to intelligently extract usernames from a prompt
 * This handles ALL edge cases including concatenated usernames, multiple separators, etc.
 */
export async function extractUsernamesWithGPT(prompt: string): Promise<UsernameExtractionResult> {
  try {
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY environment variable is required');
    }

    const systemPrompt = `You are a username extraction expert. Your job is to analyze prompts and determine if the user is asking for specific Instagram usernames or wants you to find influencers.

IMPORTANT RULES:
1. If the prompt mentions SPECIFIC usernames (like @vijay3guy, technicalguruji), extract ALL of them
2. Handle ALL separators: "and", "or", commas, spaces, line breaks
3. Fix concatenated usernames: "vijay3guyandtechnicalguruji" → ["vijay3guy", "technicalguruji"]
4. If the prompt asks to FIND/SEARCH influencers (like "find tech influencers from pune"), return needsAI: true
5. Extract the NUMBER of influencers requested (e.g., "top 5 tech influencers" → count: 5)
6. Default count is 4 if not specified

RESPONSE FORMAT (JSON only):
{
  "hasUsernames": true/false,
  "usernames": ["username1", "username2"],
  "needsAI": true/false,
  "count": number or null
}

EXAMPLES:

Input: "I need data of vijay3guy"
Output: {"hasUsernames": true, "usernames": ["vijay3guy"], "needsAI": false, "count": null}

Input: "provide me details of technicalguruji and vijay3guy"
Output: {"hasUsernames": true, "usernames": ["technicalguruji", "vijay3guy"], "needsAI": false, "count": null}

Input: "vijay3guyandtechnicalguruji"
Output: {"hasUsernames": true, "usernames": ["vijay3guy", "technicalguruji"], "needsAI": false, "count": null}

Input: "food influencers from pune"
Output: {"hasUsernames": false, "usernames": [], "needsAI": true, "count": 4}

Input: "top 5 tech creators from india"
Output: {"hasUsernames": false, "usernames": [], "needsAI": true, "count": 5}

Input: "give me data of @carryminati, ashishchanchlani and bhuvan"
Output: {"hasUsernames": true, "usernames": ["carryminati", "ashishchanchlani", "bhuvan"], "needsAI": false, "count": null}

Input: "find 10 food influencers from delhi, mumbai"
Output: {"hasUsernames": false, "usernames": [], "needsAI": true, "count": 10}

Now analyze this prompt and respond with JSON only (no markdown):`;

    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content?.trim() || '';
    
    // Remove markdown formatting if present
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const result: UsernameExtractionResult = JSON.parse(cleanedContent);
    
    // Ensure usernames are lowercase and cleaned
    if (result.usernames && result.usernames.length > 0) {
      result.usernames = result.usernames.map(u => 
        u.toLowerCase().replace(/^@/, '').trim()
      );
    }

    // Set default count if not specified and needsAI is true
    if (result.needsAI && !result.count) {
      result.count = 3;
    }

    console.log('✅ Perplexity Username Extraction Result:', result);
    return result;

  } catch (error: any) {
    console.error('❌ Perplexity username extraction failed:', error.message);
    
    // Fallback: simple pattern matching
    const usernames: string[] = [];
    const atMatches = prompt.matchAll(/@([a-z0-9._]+)/gi);
    for (const match of atMatches) {
      if (match[1]) {
        usernames.push(match[1].toLowerCase());
      }
    }

    // Check if it's likely a search query
    const searchKeywords = ['find', 'search', 'show', 'get', 'top', 'best', 'food', 'tech', 'fashion', 'from', 'in'];
    const needsAI = searchKeywords.some(keyword => prompt.toLowerCase().includes(keyword)) && usernames.length === 0;

    // Extract count from prompt
    const countMatch = prompt.match(/(\d+)\s*(?:influencer|creator|account|people|user)/i);
    const count = countMatch ? parseInt(countMatch[1]) : (needsAI ? 4 : null);

    return {
      hasUsernames: usernames.length > 0,
      usernames,
      needsAI,
      count: count || undefined
    };
  }
}
