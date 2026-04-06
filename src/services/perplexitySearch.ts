import axios from 'axios';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface PerplexitySearchResult {
  usernames: string[];
  searchCriteria: {
    city: string | null;
    state: string | null;
    minFollowers: number;
    maxFollowers: number;
    category: string | null;
    gender: string | null;
    ageGroup: string | null;
  };
  citations?: string[];
}

/**
 * Comprehensive prompt analysis to extract all search parameters
 */
interface PromptAnalysis {
  category: string | null;
  location: {
    city: string | null;
    state: string | null;
    country: string;
  };
  gender: 'male' | 'female' | 'any' | null;
  ageGroup: string | null; // e.g., "18-24", "25-34", "Gen Z", "Millennial", etc.
  followerRange: {
    min: number;
    max: number;
  };
  explicitRequirements: string[];
}

function analyzePrompt(prompt: string): PromptAnalysis {
  const lowerPrompt = prompt.toLowerCase();
  
  // 1. Extract CATEGORY - Comprehensive mapping
  const categoryMap: Record<string, string[]> = {
    'tech': ['tech', 'technology', 'gadget', 'software', 'coding', 'developer', 'programming', 'mobile', 'computer', 'review', 'unboxing'],
    'food': ['food', 'cooking', 'recipe', 'chef', 'culinary', 'restaurant', 'cuisine', 'meal', 'dish', 'baking', 'street food'],
    'fashion': ['fashion', 'style', 'outfit', 'clothing', 'designer', 'wardrobe', 'trend', 'styling', 'apparel'],
    'beauty': ['beauty', 'makeup', 'skincare', 'cosmetics', 'hair', 'nails', 'grooming'],
    'travel': ['travel', 'tourism', 'adventure', 'wanderlust', 'explorer', 'backpack', 'trip', 'vacation', 'destination'],
    'fitness': ['fitness', 'gym', 'workout', 'yoga', 'health', 'bodybuilding', 'exercise', 'training', 'muscle', 'wellness'],
    'gaming': ['gaming', 'gamer', 'esports', 'streamer', 'pubg', 'free fire', 'minecraft', 'game', 'gameplay'],
    'finance': ['finance', 'trading', 'stock', 'crypto', 'investment', 'money', 'business', 'entrepreneur'],
    'lifestyle': ['lifestyle', 'vlog', 'blogger', 'daily', 'routine', 'life', 'family'],
    'music': ['music', 'singer', 'musician', 'artist', 'dj', 'song', 'band'],
    'art': ['art', 'artist', 'design', 'creative', 'illustration', 'painting', 'drawing'],
    'photography': ['photography', 'photo', 'photographer', 'camera', 'picture'],
    'comedy': ['comedy', 'comedian', 'funny', 'humor', 'joke', 'roast', 'prank', 'entertainment'],
    'education': ['education', 'educational', 'teaching', 'tutorial', 'learning', 'study', 'knowledge', 'course'],
    'sports': ['sports', 'sport', 'athlete', 'cricket', 'football', 'basketball', 'tennis'],
    'podcast': ['podcast', 'podcaster', 'podcasting', 'talk show', 'interview', 'conversation']
  };
  
  let category: string | null = null;
  for (const [mainCat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => lowerPrompt.includes(kw))) {
      category = mainCat;
      break;
    }
  }
  
  // 2. Extract LOCATION - Comprehensive Indian cities and states
  const indianCities: Record<string, string> = {
    // Maharashtra
    'pune': 'Maharashtra', 'mumbai': 'Maharashtra', 'nagpur': 'Maharashtra', 'nashik': 'Maharashtra', 'thane': 'Maharashtra',
    // Delhi
    'delhi': 'Delhi', 'new delhi': 'Delhi', 'dilli': 'Delhi',
    // Karnataka (with typo variations)
    'bangalore': 'Karnataka', 'bengaluru': 'Karnataka', 'banglore': 'Karnataka', 'bangaluru': 'Karnataka',
    'mysore': 'Karnataka', 'mysuru': 'Karnataka', 'mangalore': 'Karnataka', 'hubli': 'Karnataka',
    // Telangana
    'hyderabad': 'Telangana', 'hydrabad': 'Telangana',
    // Tamil Nadu
    'chennai': 'Tamil Nadu', 'madras': 'Tamil Nadu', 'coimbatore': 'Tamil Nadu', 'madurai': 'Tamil Nadu', 'salem': 'Tamil Nadu',
    // West Bengal
    'kolkata': 'West Bengal', 'calcutta': 'West Bengal', 'durgapur': 'West Bengal',
    // Gujarat
    'ahmedabad': 'Gujarat', 'amdavad': 'Gujarat', 'surat': 'Gujarat', 'vadodara': 'Gujarat', 'rajkot': 'Gujarat',
    // Rajasthan
    'jaipur': 'Rajasthan', 'udaipur': 'Rajasthan', 'jodhpur': 'Rajasthan', 'kota': 'Rajasthan',
    // Uttar Pradesh
    'lucknow': 'Uttar Pradesh', 'agra': 'Uttar Pradesh', 'varanasi': 'Uttar Pradesh', 'kanpur': 'Uttar Pradesh', 'noida': 'Uttar Pradesh',
    // Punjab
    'chandigarh': 'Punjab', 'amritsar': 'Punjab', 'ludhiana': 'Punjab', 'jalandhar': 'Punjab',
    // Goa
    'goa': 'Goa', 'panaji': 'Goa',
    // Kerala
    'kochi': 'Kerala', 'cochin': 'Kerala', 'trivandrum': 'Kerala', 'thiruvananthapuram': 'Kerala', 'kozhikode': 'Kerala', 'thrissur': 'Kerala',
    // Madhya Pradesh
    'indore': 'Madhya Pradesh', 'bhopal': 'Madhya Pradesh',
    // Bihar
    'patna': 'Bihar',
    // Odisha
    'bhubaneswar': 'Odisha', 'bhubaneshwar': 'Odisha',
    // Assam
    'guwahati': 'Assam'
  };
  
  // Also check for states directly
  const indianStates = [
    'maharashtra', 'karnataka', 'tamil nadu', 'kerala', 'gujarat', 'rajasthan',
    'uttar pradesh', 'madhya pradesh', 'west bengal', 'punjab', 'haryana',
    'telangana', 'andhra pradesh', 'bihar', 'odisha', 'assam', 'jharkhand'
  ];
  
  let city: string | null = null;
  let state: string | null = null;
  const cities: string[] = [];
  const states: string[] = [];
  
  // Check for ALL cities mentioned (for multiple cities)
  for (const [cityName, stateName] of Object.entries(indianCities)) {
    if (lowerPrompt.includes(cityName)) {
      const capitalizedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1);
      cities.push(capitalizedCity);
      if (!states.includes(stateName)) {
        states.push(stateName);
      }
    }
  }
  
  // If no cities found, check for states
  if (cities.length === 0) {
    for (const stateName of indianStates) {
      if (lowerPrompt.includes(stateName)) {
        const capitalizedState = stateName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        states.push(capitalizedState);
      }
    }
  }
  
  // Set city and state based on what was found
  if (cities.length > 0) {
    city = cities.join(', '); // Join multiple cities: "Chandigarh, Delhi"
    state = states.length > 0 ? states.join(', ') : null;
  } else if (states.length > 0) {
    state = states.join(', ');
  }
  
  const country = 'India';
  
  // 3. Extract GENDER
  let gender: 'male' | 'female' | 'any' | null = null;
  if (lowerPrompt.match(/\b(male|man|men|guy|boys?|him|his)\b/)) {
    gender = 'male';
  } else if (lowerPrompt.match(/\b(female|woman|women|girl|ladies|her|she)\b/)) {
    gender = 'female';
  }
  
  // 4. Extract AGE GROUP
  let ageGroup: string | null = null;
  
  // Check for age ranges
  if (lowerPrompt.match(/\b(18[-\s]24|18\s*to\s*24)\b/)) {
    ageGroup = '18-24';
  } else if (lowerPrompt.match(/\b(25[-\s]34|25\s*to\s*34)\b/)) {
    ageGroup = '25-34';
  } else if (lowerPrompt.match(/\b(35[-\s]44|35\s*to\s*44)\b/)) {
    ageGroup = '35-44';
  } else if (lowerPrompt.match(/\b(45[-\s]54|45\s*to\s*54)\b/)) {
    ageGroup = '45-54';
  }
  
  // Check for generation keywords
  if (lowerPrompt.includes('gen z') || lowerPrompt.includes('genz')) {
    ageGroup = 'Gen Z (18-24)';
  } else if (lowerPrompt.includes('millennial')) {
    ageGroup = 'Millennial (25-40)';
  } else if (lowerPrompt.includes('young') || lowerPrompt.includes('youth')) {
    ageGroup = '18-24';
  } else if (lowerPrompt.includes('teen')) {
    ageGroup = '13-19';
  }
  
  // 5. Extract FOLLOWER RANGE - IMPROVED to handle k, M, B suffixes
  let minFollowers = 50000; // Default minimum
  let maxFollowers = 1000000000; // Default maximum

  // Helper function to convert follower count with suffix
  const parseFollowerCount = (numStr: string, suffix: string = ''): number => {
    const num = parseInt(numStr);
    const lowerSuffix = (suffix || '').toLowerCase().trim();

    if (lowerSuffix.includes('b')) return num * 1000000000; // Billion
    if (lowerSuffix.includes('m')) return num * 1000000;    // Million
    if (lowerSuffix.includes('k')) return num * 1000;       // Thousand

    // If no suffix but number is 1-99, assume 'k' (e.g., "50" = 50k)
    if (num >= 1 && num <= 999) return num * 1000;
    return num;
  };

  // Detect specific follower patterns: "500k to 2M followers", "1M-5M", etc.
  const followerRangeMatch = lowerPrompt.match(/(\d+)\s*([kmb]?)\s*(?:to|-|–|and)\s*(\d+)\s*([kmb])\s*followers?/i);

  console.log('🔍 Follower Range Detection Debug:');
  console.log(`   Prompt: "${prompt}"`);
  console.log(`   Lowercase: "${lowerPrompt}"`);
  console.log(`   Regex Match: ${followerRangeMatch ? 'YES' : 'NO'}`);
  if (followerRangeMatch) {
    console.log(`   Groups: [${followerRangeMatch.slice(1).join(', ')}]`);
  }

  if (followerRangeMatch) {
    // Group 1: first number, Group 2: first suffix, Group 3: second number, Group 4: second suffix
    minFollowers = parseFollowerCount(followerRangeMatch[1], followerRangeMatch[2]);
    maxFollowers = parseFollowerCount(followerRangeMatch[3], followerRangeMatch[4]);
    console.log(`   ✅ Parsed: ${minFollowers.toLocaleString()}-${maxFollowers.toLocaleString()}`);
  } else {
    // Try single follower count patterns
    const millionMatch = lowerPrompt.match(/(\d+)\s*m\+?\s*followers?/i);
    const kMatch = lowerPrompt.match(/(\d+)\s*k\+?\s*followers?/i);
    const billionMatch = lowerPrompt.match(/(\d+)\s*b\+?\s*followers?/i);

    console.log(`   millionMatch: ${millionMatch ? millionMatch[0] : 'NO'}`);
    console.log(`   kMatch: ${kMatch ? kMatch[0] : 'NO'}`);
    console.log(`   billionMatch: ${billionMatch ? billionMatch[0] : 'NO'}`);

    if (millionMatch) {
      minFollowers = parseInt(millionMatch[1]) * 1000000;
      console.log(`   ✅ Million match: ${minFollowers.toLocaleString()}`);
    } else if (billionMatch) {
      minFollowers = parseInt(billionMatch[1]) * 1000000000;
      console.log(`   ✅ Billion match: ${minFollowers.toLocaleString()}`);
    } else if (kMatch) {
      minFollowers = parseInt(kMatch[1]) * 1000;
      console.log(`   ✅ K match: ${minFollowers.toLocaleString()}`);
    } else if (lowerPrompt.includes('micro influencer')) {
      minFollowers = 10000;
      maxFollowers = 100000;
    } else if (lowerPrompt.includes('macro influencer')) {
      minFollowers = 100000;
      maxFollowers = 1000000;
    } else if (lowerPrompt.includes('mega influencer') || lowerPrompt.includes('celebrity')) {
      minFollowers = 1000000;
      maxFollowers = 100000000;
    } else if (lowerPrompt.includes('nano influencer')) {
      minFollowers = 1000;
      maxFollowers = 10000;
    }
  }
  
  // 6. Build explicit requirements list
  const explicitRequirements: string[] = [];
  if (category) explicitRequirements.push(`Category: ${category}`);
  if (city) explicitRequirements.push(`City: ${city}`);
  if (state && !city) explicitRequirements.push(`State: ${state}`);
  if (gender) explicitRequirements.push(`Gender: ${gender}`);
  if (ageGroup) explicitRequirements.push(`Age Group: ${ageGroup}`);
  if (minFollowers !== 50000 || maxFollowers !== 1000000000) {
    explicitRequirements.push(`Followers: ${minFollowers.toLocaleString()}-${maxFollowers.toLocaleString()}`);
  }
  
  return {
    category,
    location: { city, state, country },
    gender,
    ageGroup,
    followerRange: { min: minFollowers, max: maxFollowers },
    explicitRequirements
  };
}

/**
 * Simple category extractor for backward compatibility
 */
function extractCategoryFromPrompt(prompt: string): string | null {
  return analyzePrompt(prompt).category;
}

/**
 * Use Perplexity to find Instagram influencers based on search criteria
 * Perplexity will search the web and find real, verified usernames
 */
export async function findInfluencersWithPerplexity(
  prompt: string,
  requestedCount: number = 5
): Promise<PerplexitySearchResult> {
  
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  // Analyze the prompt comprehensively
  const analysis = analyzePrompt(prompt);
  
  console.log('🔍 Prompt Analysis:', {
    category: analysis.category || 'Not specified',
    city: analysis.location.city || 'Not specified',
    state: analysis.location.state || 'Not specified',
    gender: analysis.gender || 'Not specified',
    ageGroup: analysis.ageGroup || 'Not specified',
    followers: `${analysis.followerRange.min.toLocaleString()}-${analysis.followerRange.max.toLocaleString()}`,
    requirements: analysis.explicitRequirements.join(', ') || 'None'
  });

  // Build search instructions based on what was specified
  const searchInstructions: string[] = [];
  
  if (analysis.category) {
    searchInstructions.push(`1. CATEGORY: "${analysis.category}" - This is MANDATORY. Search: "top ${analysis.category} Instagram influencers"`);
  } else {
    searchInstructions.push(`1. CATEGORY: Not specified - Find top/popular influencers in general`);
  }
  
  if (analysis.location.city) {
    const cityList = analysis.location.city.includes(',') 
      ? analysis.location.city.split(',').map(c => c.trim()).join(' OR ')
      : analysis.location.city;
    searchInstructions.push(`2. LOCATION: "${analysis.location.city}" - Find influencers from ANY of these cities. Include influencers from all mentioned locations.`);
  } else if (analysis.location.state) {
    searchInstructions.push(`2. LOCATION: "${analysis.location.state}" - Find influencers from this state`);
  } else {
    searchInstructions.push(`2. LOCATION: Pan-India - Find top national influencers`);
  }
  
  if (analysis.gender) {
    searchInstructions.push(`3. GENDER: ${analysis.gender.toUpperCase()} influencers only`);
  }
  
  if (analysis.ageGroup) {
    searchInstructions.push(`4. AGE GROUP: Target audience or influencer age is ${analysis.ageGroup}`);
  }
  
  searchInstructions.push(`${searchInstructions.length + 1}. FOLLOWERS: Minimum ${analysis.followerRange.min.toLocaleString()} to Maximum ${analysis.followerRange.max.toLocaleString()} followers`);
  searchInstructions.push(`${searchInstructions.length + 1}. QUANTITY: Return AT LEAST ${requestedCount} REAL Instagram @usernames (preferably ${Math.max(10, requestedCount * 2)})`);

  const systemPrompt = `You are an Instagram influencer researcher. Find REAL, VERIFIED usernames matching these EXACT requirements:

USER REQUEST: "${prompt}"

⚠️ CRITICAL: Find ${Math.max(requestedCount, 5)} OR MORE influencers. Diversity > Single Results.

📋 REQUIREMENTS (ALL MUST BE SATISFIED):
${searchInstructions.join('\n')}

🎯 SEARCH STRATEGY:
${analysis.category 
  ? `- PRIMARY Search: "${analysis.category} Instagram influencers ${analysis.location.city || analysis.location.state || 'India'}${analysis.gender ? ' ' + analysis.gender : ''}"
${analysis.location.city && analysis.location.city.includes(',') 
  ? `- MULTIPLE CITIES DETECTED: Search for influencers from each city separately:
  ${analysis.location.city.split(',').map(c => `  * "${analysis.category} influencers ${c.trim()}"`).join('\n  ')}
- Include influencers from ALL mentioned cities (diversify results)` 
  : ''}
- ALTERNATIVE Search: "best ${analysis.category} content creators Instagram ${analysis.location.city || analysis.location.state || 'India'}"
- VERIFY: Each influencer MUST create ${analysis.category.toUpperCase()} content
- REJECT: Tech influencers if category is ${analysis.category}
- REJECT: Food influencers if category is ${analysis.category}
- REJECT: Any non-${analysis.category} influencers`
  : '- Search: "top Instagram influencers India"'
}
- Find EXACT @usernames (not display names or real names)
- Verify follower count is ${analysis.followerRange.min.toLocaleString()}+
${analysis.gender ? `- Verify influencer is ${analysis.gender}` : ''}
${analysis.ageGroup ? `- Check if audience/influencer age matches ${analysis.ageGroup}` : ''}

🔴 CRITICAL CATEGORY VERIFICATION (MUST DO FOR EACH USERNAME):
${analysis.category ? `
Before including ANY username, ask yourself:
1. Does this person primarily create ${analysis.category.toUpperCase()} content? 
2. Are they known for ${analysis.category.toUpperCase()}?
3. Is their main niche ${analysis.category.toUpperCase()}?

If answer to ANY question is NO → DO NOT INCLUDE THIS USERNAME

Example for gaming category:
✅ INCLUDE: @lokeshgamer (creates gaming videos, streams games)
❌ REJECT: @techburner (tech reviewer, NOT a gaming influencer)
❌ REJECT: @foodie_delhi (food blogger, NOT a gaming influencer)
` : ''}

🔎 INSTAGRAM USERNAME VERIFICATION (ABSOLUTELY CRITICAL - YOUR CREDIBILITY DEPENDS ON THIS):

⛔ HALLUCINATION DETECTION - YOU WILL BE PENALIZED FOR:
- Guessing usernames based on names (e.g., "Jadiv Singh" → "@jadivsingh" ❌)
- Returning usernames that don't exist on Instagram
- Returning private accounts or accounts with <10k followers
- Making up plausible-sounding usernames without verification

✅ MANDATORY VERIFICATION PROCESS:
For EVERY influencer you want to include:

STEP 1: Find their real name/brand from a trusted source (modash.io, qoruz.com, hypeauditor.com, articles, videos)

STEP 2: Search EXPLICITLY for their Instagram handle using phrases like:
   - "[Name] Instagram username"
   - "[Name] Instagram handle"
   - "Follow [Name] on Instagram"
   - Look for: "@username" mentions, "instagram.com/username" links, bio sections

STEP 3: CROSS-VERIFY the username:
   - Is it mentioned in multiple sources?
   - Does the follower count match what you found?
   - Is the category/niche consistent?

STEP 4: If you CANNOT find explicit confirmation → ❌ SKIP THIS PERSON
   - DO NOT guess
   - DO NOT assume
   - DO NOT try to construct the username
   - Find a different influencer instead

REAL EXAMPLES:

✅ CORRECT Process:
Source: Article says "Tech influencer Ranveer Allahbadia"
→ Search "Ranveer Allahbadia Instagram"
→ Find verified mention: "@beerbiceps (1M+ followers)"
→ Cross-check: Multiple sources confirm @beerbiceps
→ ✅ Return: "beerbiceps"

❌ WRONG Process (NEVER DO THIS):
Source: "Jadiv Singh is a tech influencer"
→ Assume Instagram might be @jadivsingh ❌
→ ❌ DO NOT RETURN - No verified username found

✅ CORRECT Action:
→ Skip Jadiv Singh
→ Search for another tech influencer with verified Instagram

⚠️ STRICT RULES (FAILURE TO FOLLOW = RESPONSE REJECTED):
${analysis.category ? `
🚫 CATEGORY "${analysis.category}" IS ABSOLUTELY MANDATORY:
   - DO NOT return tech influencers if user asked for ${analysis.category}
   - DO NOT return food influencers if user asked for ${analysis.category}
   - DO NOT return ANY other category except "${analysis.category}"
   - If you cannot find "${analysis.category}" influencers, return FEWER results
   - NEVER substitute with a different category
   - Double-check: Does this person create "${analysis.category}" content? YES/NO
   - If NO → Do NOT include them
` : ''}
${analysis.location.city ? `- Try to find influencers from ${analysis.location.city} first, then expand if needed` : ''}
${analysis.gender ? `- ONLY return ${analysis.gender} influencers` : ''}
${analysis.ageGroup ? `- Consider age group ${analysis.ageGroup} for audience or influencer` : ''}
- Extract @username format (e.g., @techburner → techburner)
- Return ${requestedCount} VERIFIED usernames
- If you can't find ${requestedCount} VERIFIED usernames, return fewer (quality > quantity)
- NEVER guess or hallucinate usernames

📊 QUALITY CHECKLIST (Before returning ANY username):
□ Username is explicitly mentioned in at least one trusted source
□ Follower count is verified to be BETWEEN ${analysis.followerRange.min.toLocaleString()} - ${analysis.followerRange.max.toLocaleString()}
□ Account is public and active (not private/suspended)
□ Find MULTIPLE influencers (at least ${requestedCount}, preferably ${Math.max(10, requestedCount * 2)})
${analysis.category ? `□ Category matches "${analysis.category}" EXACTLY (NOT tech, NOT food, NOT any other category - ONLY "${analysis.category}")
□ Primary content is ${analysis.category} (check their bio, recent posts, description)
□ They are known as a ${analysis.category} influencer (not just someone who occasionally posts about ${analysis.category})` : ''}
${analysis.gender ? `□ Gender matches "${analysis.gender}"` : ''}
${analysis.ageGroup ? `□ Age group/audience matches "${analysis.ageGroup}"` : ''}

If ANY checkbox fails → Remove that username and find a replacement

🚨 COMMON MISTAKES TO AVOID:
${analysis.category === 'gaming' ? `
❌ DO NOT return tech reviewers (they review gadgets, not gaming)
❌ DO NOT return general tech influencers
✅ ONLY return gaming streamers, esports players, game reviewers
` : ''}
${analysis.category === 'food' ? `
❌ DO NOT return lifestyle vloggers who occasionally eat
❌ DO NOT return travel influencers
✅ ONLY return food bloggers, chefs, restaurant reviewers, cooking channels
` : ''}
${analysis.category === 'tech' ? `
❌ DO NOT return gaming influencers
❌ DO NOT return general lifestyle vloggers
✅ ONLY return tech reviewers, gadget unboxers, tech news channels
` : ''}

RESPONSE FORMAT (valid JSON only):
{
  "searchCriteria": {
    "city": ${analysis.location.city ? `"${analysis.location.city}"` : 'null'},
    "state": ${analysis.location.state ? `"${analysis.location.state}"` : 'null'}, 
    "minFollowers": ${analysis.followerRange.min},
    "maxFollowers": ${analysis.followerRange.max},
    "category": ${analysis.category ? `"${analysis.category}"` : 'null'},
    "gender": ${analysis.gender ? `"${analysis.gender}"` : 'null'},
    "ageGroup": ${analysis.ageGroup ? `"${analysis.ageGroup}"` : 'null'}
  },
  "usernames": ["username1", "username2", "username3"]
}

EXAMPLES:

Input: "tech influencers from pune"
Requirements: Category=tech, Location=Pune
Output: {"searchCriteria": {"city":"Pune","state":"Maharashtra","minFollowers":50000,"maxFollowers":1000000000,"category":"tech","gender":null,"ageGroup":null}, "usernames":["technicalguruji","techburner","trakintech"]}
Note: ALL three are TECH influencers who review gadgets/technology

Input: "gaming influencers from delhi"
Requirements: Category=gaming, Location=Delhi
Output: {"searchCriteria": {"city":"Delhi","state":"Delhi","minFollowers":50000,"maxFollowers":1000000000,"category":"gaming","gender":null,"ageGroup":null}, "usernames":["carryminati","scout_op","dynamo_gaming"]}
Note: ALL three are GAMING influencers (streamers/esports) - NOT tech reviewers like techburner

Input: "give me top influencers from india"
Requirements: Location=India (no specific category)
Output: {"searchCriteria": {"city":null,"state":null,"minFollowers":50000,"maxFollowers":1000000000,"category":null,"gender":null,"ageGroup":null}, "usernames":["virat.kohli","priyankachopra","shraddhakapoor"]}

Input: "female fitness influencers"
Requirements: Category=fitness, Gender=female
Output: {"searchCriteria": {"city":null,"state":null,"minFollowers":50000,"maxFollowers":1000000000,"category":"fitness","gender":"female","ageGroup":null}, "usernames":["yasminkarachiwala","shilpashetty","malaika_arora"]}
Note: ALL three are FITNESS influencers - NOT beauty or lifestyle

Input: "Gen Z fashion influencers from Mumbai"
Requirements: Category=fashion, Location=Mumbai, AgeGroup=Gen Z
Output: {"searchCriteria": {"city":"Mumbai","state":"Maharashtra","minFollowers":50000,"maxFollowers":1000000000,"category":"fashion","gender":null,"ageGroup":"Gen Z (18-24)"}, "usernames":["komalspandana","dollysingh","kusha"]}
Note: ALL three are FASHION influencers - NOT beauty or lifestyle

Input: "food influencers from Chandigarh and Delhi with 200k+ followers"
Requirements: Category=food, Location=Chandigarh AND Delhi, MinFollowers=200k
Output: {"searchCriteria": {"city":"Chandigarh, Delhi","state":"Punjab, Delhi","minFollowers":200000,"maxFollowers":1000000000,"category":"food","gender":null,"ageGroup":null}, "usernames":["dfordelhi","chandigarhfoodie","thedelhibelly"]}
Note: Include influencers from BOTH cities - mix from Chandigarh AND Delhi

Input: "find influencers from bangalore who do podcasts"
Requirements: Category=podcast, Location=Bangalore
Output: {"searchCriteria": {"city":"Bangalore","state":"Karnataka","minFollowers":50000,"maxFollowers":1000000000,"category":"podcast","gender":null,"ageGroup":null}, "usernames":["ranveerallahbadia","thetalkchannelpodcast","theindianhacker"]}
Note: ALL three are PODCAST creators from Bangalore - NOT just lifestyle influencers

Now find ${requestedCount} usernames for: "${prompt}"

${analysis.category ? `
🔴 FINAL REMINDER - CATEGORY IS "${analysis.category.toUpperCase()}":
- Search specifically for "${analysis.category} influencers"
- Verify each person creates ${analysis.category} content
- DO NOT include tech influencers unless category is tech
- DO NOT include food influencers unless category is food
- DO NOT include gaming influencers unless category is gaming
- When in doubt, search "[username] niche category" to verify
` : ''}

✅ Return ONLY valid JSON. Satisfy all requirements above.`;

  try {
    console.log(`🔍 Asking Perplexity to find ${requestedCount} VERIFIED influencers...`);
    
    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: 'sonar',          // Using sonar model (base subscription)
        messages: [
          {
            role: 'system',
            content: 'You are a professional influencer researcher. Your reputation depends on returning ONLY verified, real Instagram usernames that EXACTLY match the requested category. Never guess or hallucinate usernames. Never substitute categories. Quality over quantity. Category accuracy is CRITICAL.'
          },
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        temperature: 0.1,        // Very low temperature for maximum accuracy and fact-based responses
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'year',  // More recent data
        max_tokens: 2000         // More tokens for detailed verification
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 90000
      }
    );

    const responseText = response.data.choices[0].message.content;
    const citations = response.data.citations || [];

    console.log('📄 Perplexity Raw Response:', responseText.substring(0, 300) + '...');
    
    if (citations.length > 0) {
      console.log(`✅ Found ${citations.length} citations (web sources)`);
    } else {
      console.warn('⚠️  No citations - Perplexity may not have searched the web!');
    }

    // Parse response - handle JSON with extra text
    let cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Extract JSON if there's extra text after it
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    const result = JSON.parse(cleanedText);

    // Comprehensive validation of all parameters
    console.log('\n🔍 Validating Perplexity Response...');
    let hasWarnings = false;
    
    // 1. Validate CATEGORY - STRICT VALIDATION
    if (analysis.category && result.searchCriteria?.category) {
      const returnedCategory = result.searchCriteria.category.toLowerCase();
      const requestedCategory = analysis.category.toLowerCase();
      
      // STRICT: Categories must match exactly
      if (returnedCategory !== requestedCategory) {
        console.error(`❌ CATEGORY MISMATCH - REJECTING RESPONSE!`);
        console.error(`   Requested: "${requestedCategory}"`);
        console.error(`   Got: "${returnedCategory}"`);
        console.error(`   This is NOT acceptable. Re-throwing to force retry.`);
        
        throw new Error(`Category mismatch: requested "${requestedCategory}" but got "${returnedCategory}". Perplexity did not follow instructions.`);
      } else {
        console.log(`✅ Category match: "${returnedCategory}"`);
      }
    } else if (analysis.category && !result.searchCriteria?.category) {
      console.error(`❌ CATEGORY MISSING - User requested "${analysis.category}" but Perplexity returned null!`);
      throw new Error(`Category missing: user requested "${analysis.category}" but Perplexity did not specify category.`);
    }
    
    // 2. Validate LOCATION (if specified)
    if (analysis.location.city && result.searchCriteria?.city) {
      const returnedCity = result.searchCriteria.city.toLowerCase();
      const requestedCities = analysis.location.city.toLowerCase().split(',').map(c => c.trim());
      
      // Check if returned city matches ANY of the requested cities
      const hasMatch = requestedCities.some(reqCity => 
        returnedCity.includes(reqCity) || reqCity.includes(returnedCity)
      );
      
      if (!hasMatch) {
        console.warn(`⚠️  LOCATION MISMATCH!`);
        console.warn(`   Requested: "${analysis.location.city}"`);
        console.warn(`   Got: "${result.searchCriteria.city}"`);
        hasWarnings = true;
      } else {
        console.log(`✅ Location match: "${result.searchCriteria.city}"`);
      }
    }
    
    // 3. Validate GENDER (if specified)
    if (analysis.gender && result.searchCriteria?.gender) {
      if (result.searchCriteria.gender !== analysis.gender) {
        console.warn(`⚠️  GENDER MISMATCH!`);
        console.warn(`   Requested: "${analysis.gender}"`);
        console.warn(`   Got: "${result.searchCriteria.gender}"`);
        hasWarnings = true;
      } else {
        console.log(`✅ Gender match: "${result.searchCriteria.gender}"`);
      }
    }
    
    // 4. Validate AGE GROUP (if specified)
    if (analysis.ageGroup && result.searchCriteria?.ageGroup) {
      console.log(`✅ Age group: "${result.searchCriteria.ageGroup}"`);
    }
    
    // 5. Validate FOLLOWER RANGE - Use original analysis values for accuracy
    const validateMin = result.searchCriteria?.minFollowers || analysis.followerRange.min;
    const validateMax = result.searchCriteria?.maxFollowers || analysis.followerRange.max;

    // Override with correct parsed values from our analysis
    result.searchCriteria.minFollowers = analysis.followerRange.min;
    result.searchCriteria.maxFollowers = analysis.followerRange.max;

    console.log(`✅ Follower range: ${analysis.followerRange.min.toLocaleString()}-${analysis.followerRange.max.toLocaleString()}`);
    if (validateMin && validateMin >= analysis.followerRange.min && validateMin <= analysis.followerRange.max) {
      console.log(`   ✓ Perplexity's returned range: ${validateMin.toLocaleString()}-${validateMax?.toLocaleString() || '?'}`);
    }
    
    if (hasWarnings) {
      console.warn(`\n⚠️  Response may not fully match requirements!`);
    } else {
      console.log(`✅ All requirements satisfied!\n`);
    }

    // Clean usernames
    if (result.usernames && Array.isArray(result.usernames)) {
      result.usernames = result.usernames
        .map((u: string) => u.toLowerCase().replace(/^@/, '').trim())
        .filter((u: string) => {
          // Filter out invalid/generic patterns
          if (u.length === 0) return false;
          
          // Remove generic patterns like "city_category"
          if (/^(pune|mumbai|delhi|bangalore|india|city)_(food|tech|fashion|travel|fitness)/i.test(u)) {
            console.warn(`⚠️  Filtered generic username: ${u}`);
            return false;
          }
          
          // Must be valid Instagram format
          if (!/^[a-z0-9._]+$/.test(u)) {
            console.warn(`⚠️  Filtered invalid format: ${u}`);
            return false;
          }
          
          return true;
        })
        .slice(0, requestedCount); // Enforce count limit
    }

    // Ensure searchCriteria exists with all fields
    if (!result.searchCriteria) {
      result.searchCriteria = {
        city: analysis.location.city || null,
        state: analysis.location.state || null,
        minFollowers: analysis.followerRange.min,
        maxFollowers: analysis.followerRange.max,
        category: analysis.category || null,
        gender: analysis.gender || null,
        ageGroup: analysis.ageGroup || null
      };
    } else {
      // Fill in any missing fields from analysis
      result.searchCriteria.city = result.searchCriteria.city || analysis.location.city || null;
      result.searchCriteria.state = result.searchCriteria.state || analysis.location.state || null;
      result.searchCriteria.category = result.searchCriteria.category || analysis.category || null;
      result.searchCriteria.gender = result.searchCriteria.gender || analysis.gender || null;
      result.searchCriteria.ageGroup = result.searchCriteria.ageGroup || analysis.ageGroup || null;
      result.searchCriteria.minFollowers = Math.max(result.searchCriteria.minFollowers || 0, analysis.followerRange.min);
      result.searchCriteria.maxFollowers = result.searchCriteria.maxFollowers || analysis.followerRange.max;
    }

    result.citations = citations;

    if (result.usernames.length === 0) {
      console.error(`❌ PROBLEM: Perplexity returned 0 usernames!`);
      console.error(`   This likely means:`);
      console.error(`   1. Perplexity couldn't find influencers in that location/category`);
      console.error(`   2. Web search didn't return relevant results`);
      console.error(`   3. Try broader search terms or check Perplexity API settings`);
    } else {
      console.log(`✅ Perplexity found ${result.usernames.length} usernames:`, result.usernames);
    }

    return result;

  } catch (error: any) {
    console.error('❌ Perplexity search failed:', error.message);
    console.error('   Full error:', error);
    
    // Return empty result on error with all fields
    return {
      usernames: [],
      searchCriteria: {
        city: analysis?.location?.city || null,
        state: analysis?.location?.state || null,
        minFollowers: analysis?.followerRange?.min || 0,
        maxFollowers: analysis?.followerRange?.max || 1000000000,
        category: analysis?.category || null,
        gender: analysis?.gender || null,
        ageGroup: analysis?.ageGroup || null
      },
      citations: []
    };
  }
}
