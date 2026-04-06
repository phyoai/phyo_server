# Google OAuth Setup Guide

This guide will help you set up Google OAuth integration for your application.

## Prerequisites

1. A Google Cloud Console account
2. Node.js and npm installed
3. Your application running locally

## Step 1: Create Google OAuth Application

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (for development)
     - `https://yourdomain.com/auth/google/callback` (for production)
5. Copy the Client ID and Client Secret

## Step 2: Configure Environment Variables

Add the following to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Step 3: Install Dependencies

The required dependencies are already installed:

```bash
npm install google-auth-library
```

## Step 4: Test the Integration

### Using the Test Script

```bash
npm run test:google-oauth
```

### Using Postman

1. Import the `Google_OAuth_Tests.postman_collection.json` file
2. Set up environment variables:
   - `base_url`: `http://localhost:3000`
   - `google_id_token`: Your Google ID token
   - `authorization_code`: Your authorization code

### Manual Testing

1. Start your server: `npm run dev`
2. Use the API endpoints:
   - `POST /auth/google` - Google OAuth login/signup
   - `GET /auth/google/callback` - OAuth callback

## Step 5: Client-Side Integration

### HTML Setup

Add the Google Sign-In button to your HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
<body>
  <div id="g_id_onload"
       data-client_id="YOUR_GOOGLE_CLIENT_ID"
       data-callback="handleCredentialResponse">
  </div>
  <div class="g_id_signin" data-type="standard"></div>
</body>
</html>
```

### JavaScript Handler

```javascript
function handleCredentialResponse(response) {
  const idToken = response.credential;
  
  // Send to your server
  fetch('/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idToken: idToken,
      type: 'BRAND', // or 'INFLUENCER' or 'SERVICE_PROVIDER'
      companyName: 'Your Company',
      industry: 'Your Industry'
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Login successful:', data);
    localStorage.setItem('token', data.token);
    // Redirect or update UI
  })
  .catch(error => {
    console.error('Login failed:', error);
  });
}
```

## Step 6: Production Deployment

1. Update your Google OAuth credentials with production URLs
2. Set environment variables in your production environment
3. Ensure HTTPS is enabled for production
4. Update client-side code with production Google Client ID

## Troubleshooting

### Common Issues

1. **"Invalid Google token" error**
   - Check that your Google Client ID matches between client and server
   - Ensure the token is not expired

2. **"User not found" error**
   - This happens when trying to use callback with a new user
   - Use the main `/auth/google` endpoint for new user registration

3. **CORS errors**
   - Ensure your Google OAuth origins are correctly configured
   - Check that your server CORS settings allow your domain

4. **Environment variable issues**
   - Verify that `GOOGLE_CLIENT_ID` is set correctly
   - Restart your server after changing environment variables

### Debug Mode

Enable debug logging by adding to your server:

```javascript
// In your auth controller
console.log('Google OAuth payload:', payload);
```

## Security Best Practices

1. **Never expose client secrets** in client-side code
2. **Always verify tokens** server-side
3. **Use HTTPS** in production
4. **Validate user input** before processing
5. **Implement rate limiting** for OAuth endpoints
6. **Log OAuth events** for security monitoring

## API Reference

### POST /auth/google

**Request:**
```json
{
  "idToken": "google_id_token",
  "type": "BRAND|INFLUENCER|SERVICE_PROVIDER",
  "companyName": "Company Name", // Required for BRAND
  "industry": "Industry", // Required for BRAND
  "name": "User Name", // Required for INFLUENCER
  "username": "username", // Required for INFLUENCER
  "services": ["service1", "service2"] // Required for SERVICE_PROVIDER
}
```

**Response:**
```json
{
  "message": "Google OAuth login successful",
  "token": "jwt_token",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "type": "BRAND",
    "googleId": "google_user_id",
    "googleName": "User Name",
    "googlePicture": "profile_picture_url",
    "isOAuthUser": true
  }
}
```

### GET /auth/google/callback

**Query Parameters:**
- `code`: Authorization code from Google

**Response:**
```json
{
  "message": "Google OAuth callback successful",
  "token": "jwt_token",
  "user": {
    // User object
  }
}
```

## Support

For issues with Google OAuth integration:

1. Check the Google Cloud Console for API quotas and errors
2. Verify your OAuth credentials are correct
3. Test with the provided test scripts
4. Check server logs for detailed error messages 