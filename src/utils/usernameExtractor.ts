/**
 * Utility to extract Instagram usernames from text prompts
 */

/**
 * Extract Instagram username from a user prompt
 * Handles patterns like:
 * - "get data for vijay3guy"
 * - "show me @username"
 * - "data of instagram.com/username"
 * - "info about username"
 */
export function extractUsernameFromPrompt(prompt: string): string | null {
  if (!prompt) return null;
  
  const cleanPrompt = prompt.trim().toLowerCase();
  
  // Check if this is an AI generation request first
  const aiGenerationKeywords = [
    /\btop\s+\d+/i,
    /\bbest\s+\d+/i,
    /\bfind\s+(me\s+)?(\d+\s+)?(some|best|top)/i,
    /\bgive\s+(me\s+)?(\d+\s+)?(some|best|top)/i,
    /\bshow\s+(me\s+)?(\d+\s+)?(some|best|top)/i,
    /\bget\s+(me\s+)?(\d+\s+)?(some|best|top)/i,
    /\blist\s+(of\s+)?(\d+\s+)?(some|best|top)/i,
    /\brecommend/i,
    /\bsugg(est|estion)/i,
    /\b(some|any)\s+(good|famous|popular|trending)/i,
  ];
  
  for (const pattern of aiGenerationKeywords) {
    if (pattern.test(cleanPrompt)) {
      return null; // This is an AI generation request, not a specific username query
    }
  }
  
  // Pattern 1: Direct Instagram URL
  // e.g., "instagram.com/username" or "https://instagram.com/username"
  const urlMatch = cleanPrompt.match(/instagram\.com\/([a-z0-9._]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  
  // Pattern 2: Username with @ symbol
  // e.g., "@username" or "get data for @username"
  const atMatch = cleanPrompt.match(/@([a-z0-9._]+)/i);
  if (atMatch && atMatch[1]) {
    return atMatch[1];
  }
  
  // Pattern 3: Common phrases indicating a specific username
  // e.g., "data for vijay3guy", "get info of username", "show me username"
  const phrasePatterns = [
    /(?:data|info|details|profile|analytics)\s+(?:for|of|about)\s+([a-z0-9._]+)/i,
    /(?:get|show|fetch|find)\s+(?:me\s+)?(?:data|info|details)\s+(?:for|of|about)\s+([a-z0-9._]+)/i,
    /(?:analyze|check)\s+([a-z0-9._]+)/i,
  ];
  
  // Extensive list of common words that are NOT usernames
  const commonWords = [
    'india', 'indian', 'data', 'info', 'profile', 'user', 'follower', 'followers', 
    'post', 'posts', 'tech', 'food', 'fashion', 'fitness', 'travel', 'beauty', 
    'lifestyle', 'top', 'best', 'popular', 'famous', 'trending', 'vlogger', 'blogger', 
    'influencer', 'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 
    'youtube', 'instagram', 'twitter', 'facebook', 'some', 'any', 'list'
  ];
  
  for (const pattern of phrasePatterns) {
    const match = cleanPrompt.match(pattern);
    if (match && match[1]) {
      const potentialUsername = match[1];
      
      // Exclude common words AND ensure it has username-like characteristics
      const isCommonWord = commonWords.includes(potentialUsername.toLowerCase());
      const hasNumbersOrUnderscore = /[\d_]/.test(potentialUsername);
      const isLongEnough = potentialUsername.length >= 8;
      
      // Accept if it's not a common word AND (has numbers/underscore OR is long enough)
      if (!isCommonWord && (hasNumbersOrUnderscore || isLongEnough)) {
        return potentialUsername;
      }
    }
  }
  
  return null;
}

/**
 * Check if the prompt is asking for a specific username vs. a general search
 * Returns true if the prompt is clearly asking for one specific account
 */
export function isSpecificUsernameQuery(prompt: string): boolean {
  const username = extractUsernameFromPrompt(prompt);
  if (!username) return false;
  
  const cleanPrompt = prompt.trim().toLowerCase();
  
  // Indicators that suggest a specific username query
  const specificIndicators = [
    /(?:data|info|details|profile|analytics)\s+(?:for|of|about)/i,
    /(?:get|show|fetch|find)\s+(?:me\s+)?(?:data|info|details)/i,
    /(?:analyze|check)/i,
    /@[a-z0-9._]+/i,
    /instagram\.com/i
  ];
  
  return specificIndicators.some(pattern => pattern.test(cleanPrompt));
}

/**
 * Extract multiple usernames from a prompt
 * Useful if user asks for multiple specific accounts
 * Handles patterns like:
 * - "@user1 and @user2"
 * - "technicalguruji and vijay3guy"
 * - "data for user1, user2, and user3"
 */
export function extractMultipleUsernames(prompt: string): string[] {
  if (!prompt) return [];
  
  const usernames: string[] = [];
  
  // Extensive list of common words that are NOT usernames
  const commonWords = [
    'india', 'indian', 'data', 'info', 'profile', 'user', 'follower', 'followers', 
    'post', 'posts', 'tech', 'food', 'fashion', 'fitness', 'travel', 'beauty', 
    'lifestyle', 'and', 'or', 'for', 'me', 'the', 'get', 'show', 'give', 'find',
    'top', 'best', 'popular', 'famous', 'trending', 'vlogger', 'blogger', 'influencer',
    'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune', 'ahmedabad',
    'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam',
    'pimpri', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad',
    'meerut', 'rajkot', 'kalyan', 'vasai', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad',
    'amritsar', 'navi', 'allahabad', 'howrah', 'ranchi', 'gwalior', 'jabalpur', 'coimbatore',
    'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota', 'guwahati', 'chandigarh', 'solapur',
    'hubli', 'bareilly', 'moradabad', 'mysore', 'gurgaon', 'aligarh', 'jalandhar', 'tiruchirappalli',
    'bhubaneswar', 'salem', 'warangal', 'mira', 'thiruvananthapuram', 'bhiwandi', 'saharanpur',
    'guntur', 'amravati', 'bikaner', 'noida', 'jamshedpur', 'bhilai', 'cuttack', 'firozabad',
    'kochi', 'nellore', 'bhavnagar', 'dehradun', 'durgapur', 'asansol', 'rourkela', 'nanded',
    'kolhapur', 'ajmer', 'akola', 'gulbarga', 'jamnagar', 'ujjain', 'loni', 'siliguri',
    'jhansi', 'ulhasnagar', 'jammu', 'sangli', 'mangalore', 'erode', 'belgaum', 'ambattur',
    'tirunelveli', 'malegaon', 'gaya', 'jalgaon', 'udaipur', 'maheshtala', 'city', 'cities',
    'youtube', 'instagram', 'twitter', 'facebook', 'tiktok', 'snapchat', 'linkedin',
    'gaming', 'comedy', 'cooking', 'makeup', 'health', 'sports', 'music', 'dance',
    'art', 'photography', 'model', 'actor', 'actress', 'singer', 'musician', 'artist',
    'chef', 'doctor', 'engineer', 'teacher', 'student', 'entrepreneur', 'business',
    'list', 'lists', 'some', 'all', 'any', 'who', 'what', 'where', 'when', 'why', 'how'
  ];
  
  // Check if prompt is asking for AI to find influencers (not specific usernames)
  const aiGenerationKeywords = [
    /\btop\s+\d+/i,           // "top 5", "top 10"
    /\bbest\s+\d+/i,          // "best 5", "best 10"
    /\bfind\s+(me\s+)?(\d+\s+)?(some|best|top)/i,  // "find me 5 best"
    /\bgive\s+(me\s+)?(\d+\s+)?(some|best|top)/i,  // "give me top 5"
    /\bshow\s+(me\s+)?(\d+\s+)?(some|best|top)/i,  // "show me best 5"
    /\bget\s+(me\s+)?(\d+\s+)?(some|best|top)/i,   // "get me some"
    /\blist\s+(of\s+)?(\d+\s+)?(some|best|top)/i,  // "list of top"
    /\brecommend/i,           // "recommend"
    /\bsugg(est|estion)/i,    // "suggest", "suggestion"
    /\b(some|any)\s+(good|famous|popular|trending)/i,  // "some good", "any popular"
  ];
  
  // If prompt matches AI generation patterns, don't try to extract usernames
  for (const pattern of aiGenerationKeywords) {
    if (pattern.test(prompt)) {
      console.log('🚫 Detected AI generation query pattern - not extracting usernames');
      return [];
    }
  }
  
  // Only extract if there are EXPLICIT username markers (@, instagram.com)
  // Find all @username patterns
  const atMatches = prompt.matchAll(/@([a-z0-9._]+)/gi);
  for (const match of atMatches) {
    if (match[1]) {
      const username = match[1].toLowerCase();
      if (!usernames.includes(username) && !commonWords.includes(username)) {
        usernames.push(username);
      }
    }
  }
  
  // Find all instagram.com/username patterns
  const urlMatches = prompt.matchAll(/instagram\.com\/([a-z0-9._]+)/gi);
  for (const match of urlMatches) {
    if (match[1]) {
      const username = match[1].toLowerCase();
      if (!usernames.includes(username) && !commonWords.includes(username)) {
        usernames.push(username);
      }
    }
  }
  
  // ONLY try pattern matching if we have very specific phrases AND no AI generation keywords
  if (usernames.length === 0) {
    // Very strict pattern: "data for username1, username2"
    const strictPattern = /(?:data|info|details|profile|analytics)\s+(?:for|of|about)\s+([a-z0-9._,\s]+?)(?:\s*$|\.)/i;
    const strictMatch = prompt.match(strictPattern);
    
    if (strictMatch && strictMatch[1]) {
      const usernameSection = strictMatch[1];
      
      // Split by comma
      const potentialUsernames = usernameSection
        .split(/\s*,\s*/)
        .map(u => u.trim().toLowerCase())
        .map(u => u.replace(/[^a-z0-9._]/g, ''))
        .filter(u => u.length >= 3 && !commonWords.includes(u));
      
      // Additional validation: username must have numbers or underscores (typical Instagram pattern)
      // OR be at least 8 characters long (less likely to be a common word)
      for (const username of potentialUsernames) {
        if (!usernames.includes(username) && username.match(/^[a-z0-9._]+$/)) {
          const hasNumbersOrUnderscore = /[\d_]/.test(username);
          const isLongEnough = username.length >= 8;
          
          if (hasNumbersOrUnderscore || isLongEnough) {
            usernames.push(username);
          }
        }
      }
    }
  }
  
  return usernames;
}
