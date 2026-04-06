# Meta Ads Manager Integration API Documentation

## Overview
This API provides endpoints to connect and manage Meta (Facebook/Instagram) Ad Manager accounts for brands. It implements OAuth 2.0 flow to securely connect brand's ad accounts and fetch campaign data.

## Environment Variables Required

Add these to your `.env` file:

```env
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=https://yourplatform.com/api/meta/oauth/callback
FRONTEND_URL=http://localhost:3000
```

## Facebook App Setup

1. Go to https://developers.facebook.com/apps/
2. Create a new app and select "Business" type
3. Add "Facebook Login" product
4. Configure OAuth settings:
   - Valid OAuth Redirect URIs: `https://yourplatform.com/api/meta/oauth/callback`
5. Add required permissions in App Review:
   - `ads_management`
   - `business_management`
   - `pages_show_list`
   - `pages_read_engagement`
   - `public_profile`
   - `email`
   - `instagram_basic`
   - `instagram_manage_insights`

## API Endpoints

### 1. Get Meta OAuth URL
**GET** `/api/meta/oauth/url`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://www.facebook.com/v19.0/dialog/oauth?client_id=..."
}
```

**Description:** Returns the OAuth URL that the frontend should redirect users to for connecting their Meta account.

---

### 2. OAuth Callback (Handled by Backend)
**GET** `/api/meta/oauth/callback`

**Query Parameters:**
- `code`: Authorization code from Meta
- `state`: User ID for security

**Description:** This endpoint handles the OAuth callback from Meta. It exchanges the authorization code for access tokens and saves the connection to the database. Users are redirected back to the frontend after completion.

**Redirect URLs:**
- Success: `{FRONTEND_URL}/dashboard/ad-accounts?status=connected&platform=meta`
- Error: `{FRONTEND_URL}/dashboard/ad-accounts?status=error&platform=meta`

---

### 3. Get Connection Status
**GET** `/api/meta/status`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (Connected):**
```json
{
  "success": true,
  "connected": true,
  "connection": {
    "platform": "meta",
    "business_id": "1234567890",
    "page_name": "Brand India",
    "ad_accounts_count": 2,
    "connected_at": "2024-01-15T10:30:00.000Z",
    "token_expires_at": "2024-03-15T10:30:00.000Z",
    "is_token_expired": false
  }
}
```

**Response (Not Connected):**
```json
{
  "success": true,
  "connected": false,
  "message": "Meta Ads Manager not connected"
}
```

---

### 4. Get Connected Ad Accounts
**GET** `/api/meta/ad-accounts`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "ad_accounts": [
    {
      "ad_account_id": "act_123456789012345",
      "name": "Brand India Ads",
      "currency": "INR"
    },
    {
      "ad_account_id": "act_987654321098765",
      "name": "Brand International Ads",
      "currency": "USD"
    }
  ],
  "page_info": {
    "page_id": "1010101010",
    "page_name": "Brand India"
  },
  "business_id": "1234567890"
}
```

---

### 5. Disconnect Meta Account
**DELETE** `/api/meta/disconnect`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Meta Ads Manager disconnected successfully"
}
```

## Database Schema

The integration creates a new collection `brandadaccounts` with the following structure:

```javascript
{
  brand_id: "user_id_here",
  platform: "meta",
  meta_access_token: "EAAG...",
  meta_token_expires_at: "2024-03-15T10:30:00.000Z",
  business_id: "1234567890",
  page_id: "1010101010",
  page_name: "Brand India",
  page_access_token: "EAAG...",
  ad_account_ids: [
    {
      ad_account_id: "act_123456789012345",
      name: "Brand India Ads",
      currency: "INR"
    }
  ],
  connected_at: "2024-01-15T10:30:00.000Z",
  is_active: true,
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z"
}
```

## Frontend Integration Example

### 1. Connect Flow
```javascript
// Get OAuth URL
const response = await fetch('/api/meta/oauth/url', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { authUrl } = await response.json();

// Redirect user to Meta
window.location.href = authUrl;
```

### 2. Check Connection Status
```javascript
const response = await fetch('/api/meta/status', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { connected, connection } = await response.json();

if (connected) {
  console.log(`Connected ${connection.ad_accounts_count} ad accounts`);
} else {
  // Show connect button
}
```

### 3. Get Ad Accounts
```javascript
const response = await fetch('/api/meta/ad-accounts', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { ad_accounts, page_info } = await response.json();
console.log('Ad Accounts:', ad_accounts);
console.log('Page Info:', page_info);
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (in development mode only)"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing parameters)
- `401`: Unauthorized (invalid/missing token or expired Meta token)
- `404`: Not Found (connection not found)
- `500`: Internal Server Error

## Security Considerations

1. **State Parameter**: Uses user ID as state parameter to prevent CSRF attacks
2. **Token Storage**: Access tokens are securely stored in the database
3. **Token Expiry**: Automatically checks for token expiration
4. **Scope Limitation**: Requests only necessary permissions
5. **Authentication**: All endpoints (except callback) require valid JWT token

## Token Management

- Short-lived tokens are automatically exchanged for long-lived tokens (60 days)
- Token expiry is tracked and checked on each request
- When tokens expire, users need to reconnect their account

## Next Steps

After implementing this API, you can:

1. **Campaign Data**: Fetch campaign performance data using the stored access tokens
2. **Ad Creation**: Create ads programmatically using the Meta Marketing API
3. **Audience Insights**: Get detailed audience analytics
4. **Branded Content**: Manage branded content partnerships with influencers

## Testing

Use the following test endpoints to verify the integration:

1. Test OAuth URL generation: `GET /api/meta/oauth/url`
2. Test connection status: `GET /api/meta/status`
3. Test the full OAuth flow with a test Facebook account

Remember to use test ad accounts during development to avoid affecting real campaigns.
