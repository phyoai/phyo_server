# Bright Data API Integration

## Overview

The Bright Data API integration enhances the influencer search capabilities by providing access to real-time Instagram data. This integration works alongside the existing local database to provide comprehensive influencer discovery.

## Features

- **Real-time Instagram Data**: Access to live Instagram influencer data
- **Advanced Analytics**: Detailed engagement metrics and audience demographics
- **Comprehensive Search**: Search by location, category, follower count, and more
- **Dual Data Sources**: Combines local database with Bright Data API results
- **Deduplication**: Automatically removes duplicate results from multiple sources

## Setup

### Environment Variables

Add the following to your `.env` file:

```env
BRIGHTDATA_API_KEY=your_brightdata_api_key_here
```

### API Key Setup

1. Sign up for a Bright Data account at [brightdata.com](https://brightdata.com)
2. Navigate to your dashboard
3. Generate an API key for Instagram data
4. Add the API key to your environment variables

## API Endpoints

### 1. Enhanced AI Search (Combined Results)

**POST** `/api/ask`

This endpoint now searches both local database and Bright Data API, providing comprehensive results.

**Request Body:**
```json
{
  "prompt": "I need influencers in New York with 10k to 100k followers in the fashion category, primarily female audience aged 18-35"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "city": "New York",
    "category": "fashion",
    "minFollowers": 10000,
    "maxFollowers": 100000,
    "ageRanges": "18-24",
    "femaleRatio": 70,
    "maleRatio": 30
  },
  "data": [
    {
      "name": "Fashion Influencer",
      "user_name": "fashion_influencer",
      "instagramData": {
        "followers": 50000,
        "engagement_rate": 3.2
      },
      "source": "brightdata"
    }
  ],
  "dataSource": "both",
  "brightDataResults": [
    // Results specifically from Bright Data
  ]
}
```

### 2. Bright Data Influencer Details

**GET** `/api/ask/brightdata/details?userName=username`

Get detailed information about a specific influencer from Bright Data.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Influencer Name",
    "user_name": "username",
    "instagramData": {
      "followers": 50000,
      "engagement_rate": 3.2,
      "genderDistribution": [
        { "gender": "FEMALE", "distribution": 70 },
        { "gender": "MALE", "distribution": 30 }
      ],
      "ageDistribution": [
        { "age": "18-24", "value": 45 },
        { "age": "25-34", "value": 35 }
      ]
    },
    "source": "brightdata"
  }
}
```

### 3. Bright Data Analytics

**GET** `/api/ask/brightdata/analytics?userName=username`

Get detailed analytics for an influencer.

**Response:**
```json
{
  "success": true,
  "data": {
    "engagement_rate": 3.2,
    "average_likes": 1500,
    "average_comments": 120,
    "reach_rate": 15.5,
    "impression_rate": 22.3
  },
  "source": "brightdata"
}
```

### 4. Bright Data Posts

**GET** `/api/ask/brightdata/posts?userName=username&limit=10`

Get recent posts from an influencer.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "post_id",
      "caption": "Post caption",
      "media_url": "https://...",
      "like_count": 1500,
      "comment_count": 120,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "source": "brightdata",
  "count": 10
}
```

### 5. Bright Data API Status

**GET** `/api/ask/brightdata/status`

Check if Bright Data API is available and configured.

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "hasApiKey": true,
    "message": "Bright Data API is available"
  }
}
```

## Search Parameters

The Bright Data integration supports the following search parameters:

### Location-based Search
- `location`: City or region name
- `country`: Country name

### Category-based Search
- `query`: Category or niche (e.g., "fashion", "fitness", "food")

### Follower-based Search
- `min_followers`: Minimum follower count
- `max_followers`: Maximum follower count

### Demographic Search
- `gender`: "male" or "female"
- `age_range`: Age range in format "18-24", "25-34", etc.

### Result Limits
- `limit`: Maximum number of results (default: 50)

## Data Transformation

The Bright Data service automatically transforms API responses to match the local database schema:

### Instagram Data Mapping
- `followers_count` → `instagramData.followers`
- `gender_distribution` → `instagramData.genderDistribution`
- `age_distribution` → `instagramData.ageDistribution`
- `top_countries` → `instagramData.audienceByCountry`

### Engagement Metrics
- `engagement_rate` → `averageEngagement`
- `average_likes` → `averageLikes`
- `average_comments` → `averageComments`

## Error Handling

The integration includes comprehensive error handling:

### API Unavailable
```json
{
  "success": false,
  "message": "Bright Data API is not available"
}
```

### Rate Limiting
The service handles rate limiting gracefully and will fall back to local database results.

### Network Errors
Network errors are logged and don't affect the overall search functionality.

## Performance Considerations

### Caching
- Consider implementing caching for frequently requested influencer data
- Cache results for 24 hours to reduce API calls

### Rate Limiting
- Bright Data API has rate limits
- The service includes built-in rate limiting protection

### Fallback Strategy
- If Bright Data is unavailable, the system falls back to local database
- No single point of failure

## Usage Examples

### Basic Search
```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Find fashion influencers in Los Angeles with 50k+ followers"}'
```

### Get Influencer Details
```bash
curl "http://localhost:3000/api/ask/brightdata/details?userName=fashion_influencer"
```

### Check API Status
```bash
curl "http://localhost:3000/api/ask/brightdata/status"
```

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   - Ensure `BRIGHTDATA_API_KEY` is set in your environment
   - Check the status endpoint to verify configuration

2. **No Results from Bright Data**
   - Verify the search parameters are valid
   - Check if the influencer exists on Instagram
   - Ensure the API key has proper permissions

3. **Rate Limiting**
   - Implement caching to reduce API calls
   - Consider upgrading your Bright Data plan

4. **Network Errors**
   - Check your internet connection
   - Verify the Bright Data API endpoint is accessible

### Debug Information

The enhanced `/api/ask` endpoint includes debug information when no results are found:

```json
{
  "success": true,
  "result": {...},
  "data": [],
  "debug": {
    "totalInfluencers": 1000,
    "categoryMatches": 50,
    "cityMatches": 25,
    "query": {...}
  }
}
```

## Best Practices

1. **Environment Configuration**
   - Always use environment variables for API keys
   - Never commit API keys to version control

2. **Error Handling**
   - Always check the `dataSource` field in responses
   - Implement fallback strategies for API failures

3. **Performance**
   - Use appropriate result limits
   - Implement caching for frequently accessed data

4. **Monitoring**
   - Monitor API usage and rate limits
   - Log errors for debugging

## Future Enhancements

- **Caching Layer**: Implement Redis caching for API responses
- **Batch Processing**: Support for bulk influencer data retrieval
- **Advanced Analytics**: More detailed engagement metrics
- **Webhook Support**: Real-time data updates
- **Custom Filters**: User-defined search criteria 