# Testing Bright Data Integration

## Overview

This guide explains how to test the Bright Data integration in the `handleAsk` function.

## Testing Scenarios

### 1. Test with Bright Data Enabled

**Prerequisites:**
- Valid `BRIGHT_DATA_API_TOKEN` in `.env` file
- Server running with the environment variable loaded

**Test Request:**
```bash
curl -X POST http://localhost:4000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Find fitness influencers in California with over 50k followers"
  }'
```

**Expected Response:**
- `brightDataStatus.enabled` should be `true`
- Some influencers should have `brightDataProfile` and/or `brightDataPosts` fields
- `brightDataStatus.profilesEnhanced` should be > 0 if influencers were found

### 2. Test without Bright Data (Fallback Mode)

**Setup:**
- Remove or comment out `BRIGHT_DATA_API_TOKEN` from `.env`
- Restart the server

**Test Request:**
```bash
curl -X POST http://localhost:4000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Find tech influencers in New York"
  }'
```

**Expected Response:**
- `brightDataStatus.enabled` should be `false`
- `brightDataStatus.profilesEnhanced` should be `0`
- Basic influencer data should still be returned from the database

### 3. Test Error Handling

**Scenario: Invalid API Token**
- Set `BRIGHT_DATA_API_TOKEN=invalid_token` in `.env`
- Restart server and make a request

**Expected Behavior:**
- Server should not crash
- Response should include error information in `brightDataStatus`
- Basic database search should still work

## Verification Steps

### 1. Console Log Verification

When Bright Data is working correctly, you should see logs like:
```
Found 3 influencers from database. Enhancing with Bright Data...
Bright Data enhancement complete: 2 profiles enhanced, 1 errors
```

When Bright Data is disabled:
```
BRIGHT_DATA_API_TOKEN not found. Bright Data integration will be disabled.
Bright Data service not available, returning basic influencer data
```

### 2. Response Structure Verification

Check that enhanced responses include:

```json
{
  "success": true,
  "data": [
    {
      // ... regular influencer fields ...
      "brightDataProfile": {
        "realTimeFollowers": 125000,
        "verificationStatus": true,
        "lastUpdated": "2024-01-15T10:30:00.000Z",
        "isBusinessAccount": true
      },
      "brightDataPosts": {
        "recentPostsCount": 5,
        "averageRecentLikes": 2500,
        "hashtags": ["#fitness", "#motivation"]
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

### 3. Performance Testing

**Load Test:**
```bash
# Test multiple concurrent requests
for i in {1..5}; do
  curl -X POST http://localhost:4000/api/ask \
    -H "Content-Type: application/json" \
    -d '{"prompt": "Find influencers in Los Angeles"}' &
done
wait
```

**Expected Behavior:**
- All requests should complete successfully
- No rate limit errors from Bright Data (due to batching)
- Reasonable response times (under 60 seconds per request)

## Manual Testing with Postman

### Import Collection

Use the existing Postman collection and add a new request:

**Request Name:** Test Bright Data Integration
**Method:** POST
**URL:** `{{base_url}}/api/ask`
**Body (JSON):**
```json
{
  "prompt": "Find lifestyle influencers in Miami with verification badges"
}
```

### Test Variations

Try different prompts to test various scenarios:

1. **Location-based search:**
   ```json
   {"prompt": "Find influencers in Tokyo, Japan"}
   ```

2. **Category-based search:**
   ```json
   {"prompt": "Find gaming influencers with over 100k followers"}
   ```

3. **Complex requirements:**
   ```json
   {"prompt": "Find verified beauty influencers in London with high engagement"}
   ```

## Debugging Common Issues

### Issue: No Enhancement Data

**Symptoms:**
- `brightDataStatus.enabled` is `true`
- `brightDataStatus.profilesEnhanced` is `0`
- No `brightDataProfile` or `brightDataPosts` fields

**Possible Causes:**
1. Influencers in database have invalid usernames
2. Instagram profiles are private
3. API quota exceeded

**Debug Steps:**
1. Check console logs for specific error messages
2. Verify influencer usernames in database are valid
3. Check Bright Data dashboard for quota usage

### Issue: Slow Response Times

**Symptoms:**
- Requests take over 60 seconds
- Timeout errors

**Possible Causes:**
1. Large number of influencers found in database
2. Bright Data API slowness
3. Network connectivity issues

**Solutions:**
1. Reduce batch size in the code (currently 5)
2. Implement result limiting for testing
3. Check network connectivity

### Issue: High Error Rates

**Symptoms:**
- `brightDataStatus.errors` is high
- Many "Failed to enhance influencer" warnings in logs

**Debug Steps:**
1. Check individual error messages in console
2. Verify API token permissions
3. Check Bright Data service status

## Testing Checklist

- [ ] Test with valid Bright Data token
- [ ] Test without Bright Data token (fallback mode)
- [ ] Test with invalid Bright Data token
- [ ] Verify console logging is working
- [ ] Check response structure includes `brightDataStatus`
- [ ] Verify enhanced influencer data format
- [ ] Test error handling doesn't break basic functionality
- [ ] Verify batch processing works with multiple influencers
- [ ] Check performance with concurrent requests
- [ ] Test various prompt types and complexities

## Automated Testing (Future Enhancement)

Consider adding these automated tests:

```typescript
// Example Jest test
describe('Bright Data Integration', () => {
  it('should enhance influencers when API is available', async () => {
    const response = await request(app)
      .post('/api/ask')
      .send({ prompt: 'Find fitness influencers' });
    
    expect(response.body.brightDataStatus.enabled).toBe(true);
    expect(response.body.data[0]).toHaveProperty('brightDataProfile');
  });

  it('should fallback gracefully when API is unavailable', async () => {
    // Mock API unavailability
    const response = await request(app)
      .post('/api/ask')
      .send({ prompt: 'Find tech influencers' });
    
    expect(response.body.success).toBe(true);
    expect(response.body.brightDataStatus.enabled).toBe(false);
  });
});
``` 