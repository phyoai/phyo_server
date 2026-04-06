# Bright Data Integration Guide

## Overview

This document explains how Bright Data API is integrated into the `handleAsk` function to provide real-time Instagram influencer data alongside the existing database search functionality.

## What is Bright Data?

Bright Data is a leading web data platform that provides access to real-time web data through APIs and web scraping infrastructure. For this project, we use their Instagram scraper APIs to get up-to-date influencer profile and post data.

## Integration Architecture

The Bright Data integration enhances the existing influencer search functionality by:

1. **Database Search First**: The system still performs the existing MongoDB search based on user requirements
2. **Real-time Enhancement**: For found influencers, we fetch real-time data from Bright Data
3. **Enriched Results**: The response includes both database data and fresh Instagram metrics

## Key Features

### Real-time Data Collection
- **Live Follower Counts**: Get current follower numbers instead of potentially outdated database values
- **Profile Verification Status**: Check if accounts are verified
- **Recent Post Metrics**: Analyze recent posts for engagement rates
- **Hashtag Analysis**: Extract trending hashtags from recent content

### Robust Error Handling
- **Graceful Degradation**: If Bright Data is unavailable, the system falls back to database-only results
- **Retry Logic**: Automatic retries with exponential backoff for transient failures
- **Rate Limit Handling**: Respects API rate limits with proper delay mechanisms
- **Batch Processing**: Processes influencers in batches to avoid overwhelming the API

## Setup Instructions

### 1. Get Bright Data API Token

1. Sign up at [Bright Data](https://brightdata.com)
2. Navigate to your dashboard
3. Generate an API token for Instagram scrapers
4. Copy the token for configuration

### 2. Environment Configuration

Add your Bright Data API token to your `.env` file:

```bash
BRIGHT_DATA_API_TOKEN=your_bright_data_api_token_here
```

### 3. Verification

The system will automatically detect if Bright Data is available. Check the console logs for:
- `"BRIGHT_DATA_API_TOKEN not found. Bright Data integration will be disabled."` (if not configured)
- `"Bright Data service not available, returning basic influencer data"` (if disabled)
- `"Found X influencers from database. Enhancing with Bright Data..."` (if working)

## API Response Format

### Enhanced Response Structure

The `handleAsk` endpoint now returns enhanced influencer data:

```typescript
interface AskResponse {
  success: boolean;
  result: ProcessedRequirements;
  data: EnhancedInfluencer[];
  brightDataStatus: {
    enabled: boolean;
    profilesEnhanced: number;
    errors: number;
  };
  debug?: {...};
}
```

### Enhanced Influencer Data

Each influencer object now includes optional Bright Data fields:

```typescript
interface EnhancedInfluencer extends IInfluencer {
  brightDataProfile?: {
    realTimeFollowers?: number;
    verificationStatus?: boolean;
    lastUpdated?: string;
    profileUrl?: string;
    biography?: string;
    isBusinessAccount?: boolean;
  };
  brightDataPosts?: {
    recentPostsCount?: number;
    averageRecentLikes?: number;
    averageRecentComments?: number;
    lastPostDate?: string;
    hashtags?: string[];
  };
}
```

## Usage Examples

### Sample Request

```bash
POST /api/ask
Content-Type: application/json

{
  "prompt": "Find fitness influencers in New York with over 100k followers"
}
```

### Sample Response

```json
{
  "success": true,
  "result": {
    "city": "New York",
    "category": "fitness",
    "minFollowers": 100000,
    // ... other requirements
  },
  "data": [
    {
      "name": "John Fitness",
      "user_name": "johnfitness",
      "instagramData": {
        "followers": 95000, // Database value (might be outdated)
        // ... other database fields
      },
      "brightDataProfile": {
        "realTimeFollowers": 105000, // Fresh from Instagram
        "verificationStatus": true,
        "lastUpdated": "2024-01-15T10:30:00Z",
        "isBusinessAccount": true
      },
      "brightDataPosts": {
        "recentPostsCount": 5,
        "averageRecentLikes": 2500,
        "averageRecentComments": 150,
        "lastPostDate": "2024-01-14T18:00:00Z",
        "hashtags": ["#fitness", "#workout", "#motivation"]
      }
    }
  ],
  "brightDataStatus": {
    "enabled": true,
    "profilesEnhanced": 1,
    "errors": 0
  }
}
```

## Performance Considerations

### Batch Processing
- Influencers are processed in batches of 5 to avoid API rate limits
- 1-second delay between batches to be respectful to the API

### Timeout Handling
- 30-second timeout for each API call
- Automatic retry with exponential backoff (1s, 2s, 4s)

### Error Isolation
- Individual influencer enhancement failures don't affect the entire response
- Failed enhancements are logged but don't break the search flow

## Monitoring and Debugging

### Console Logs
The integration provides detailed logging:
- API availability status
- Enhancement progress
- Error details and retry attempts
- Final enhancement statistics

### Response Metadata
The `brightDataStatus` field in responses provides:
- Whether Bright Data is enabled
- Number of profiles successfully enhanced
- Number of errors encountered

## Troubleshooting

### Common Issues

1. **"Bright Data API token not configured"**
   - Solution: Add `BRIGHT_DATA_API_TOKEN` to your `.env` file

2. **"Failed to fetch data from Bright Data API after retries"**
   - Possible causes: Network issues, API quota exceeded, invalid token
   - Solution: Check your internet connection and API quota

3. **High error rates in brightDataStatus**
   - Possible causes: Rate limiting, invalid usernames, private profiles
   - Solution: Monitor the console logs for specific error details

### Testing Without Bright Data

The system gracefully handles missing Bright Data configuration:
- Set `BRIGHT_DATA_API_TOKEN=""` or remove it from `.env`
- The system will use database-only results
- All existing functionality remains intact

## Cost Optimization

### Smart Enhancement
- Only processes influencers found in the database search
- Skips enhancement for influencers without valid usernames
- Respects API rate limits to avoid additional charges

### Caching Opportunities
Future improvements could include:
- Cache recent Bright Data results to reduce API calls
- Implement intelligent refresh based on profile activity
- Use background jobs for bulk data updates

## Future Enhancements

### Planned Features
1. **Advanced Search**: Use Bright Data's search capabilities to find new influencers
2. **Historical Tracking**: Track influencer growth over time
3. **Content Analysis**: Deeper analysis of post content and engagement
4. **Audience Demographics**: Enhanced audience analysis from Bright Data

### Integration Points
- Background job for periodic data refresh
- Real-time notifications for influencer metric changes
- Advanced analytics dashboard with combined data sources 