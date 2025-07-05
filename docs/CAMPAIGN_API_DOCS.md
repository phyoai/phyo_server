# Campaign APIs Documentation

## Overview
The Campaign APIs provide comprehensive CRUD operations for managing influencer marketing campaigns. These APIs allow brands to create, manage, and track campaigns while enabling influencers to discover and apply to campaigns.

## Base URL
```
/api/campaigns
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### 1. Create Campaign
**POST** `/api/campaigns`

**Authentication:** Required

**Description:** Create a new campaign

**Request Body:**
```json
{
  "productImages": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "campaignName": "Summer Fashion Campaign 2024",
  "campaignType": "Product Promotion",
  "campaignBrief": "We're looking for fashion influencers to showcase our summer collection...",
  "deliverables": ["1 Instagram Post", "3 Instagram Stories", "1 Reel"],
  "compensation": {
    "type": "Monetary",
    "amount": 500,
    "currency": "USD",
    "description": "Payment will be made within 30 days of content delivery"
  },
  "timelines": {
    "applicationDeadline": "2024-03-15T23:59:59.000Z",
    "campaignStartDate": "2024-03-20T00:00:00.000Z",
    "campaignEndDate": "2024-04-15T23:59:59.000Z"
  },
  "targetInfluencer": {
    "numberOfInfluencers": 5,
    "targetNiche": ["Fashion", "Lifestyle"],
    "followerCount": {
      "min": 10000,
      "max": 100000
    },
    "countries": ["United States", "Canada"],
    "gender": ["Female"],
    "ageRange": {
      "min": 18,
      "max": 35
    }
  },
  "status": "Draft"
}
```

**Compensation Types:**
- `"Monetary"`: Cash payment (requires `amount` and `currency`)
- `"Barter/Gifting"`: Product gifting (use `giftValue` and `products`)
- `"Affiliate/Commission"`: Commission-based (use `commissionRate`)

**Response:**
```json
{
  "message": "Campaign created successfully",
  "data": {
    "_id": "campaign_id",
    "brandId": "brand_user_id",
    "campaignName": "Summer Fashion Campaign 2024",
    // ... other campaign data
    "createdAt": "2024-02-01T10:00:00.000Z",
    "updatedAt": "2024-02-01T10:00:00.000Z"
  }
}
```

### 2. Get All Campaigns
**GET** `/api/campaigns`

**Authentication:** Not required

**Description:** Get all campaigns with optional filtering and pagination

**Query Parameters:**
- `status` (optional): Filter by campaign status
- `campaignType` (optional): Filter by campaign type
- `brandId` (optional): Filter by brand ID
- `search` (optional): Search in campaign name, brief, or type
- `niche` (optional): Filter by target niche
- `minBudget` (optional): Minimum budget filter
- `maxBudget` (optional): Maximum budget filter
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:**
```
GET /api/campaigns?status=Active&niche=Fashion&page=1&limit=5
```

**Response:**
```json
{
  "message": "Campaigns retrieved successfully",
  "data": [
    {
      "_id": "campaign_id",
      "campaignName": "Summer Fashion Campaign 2024",
      "brandId": {
        "companyName": "Fashion Brand Inc.",
        "email": "brand@example.com"
      },
      // ... other campaign data
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 15,
    "itemsPerPage": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3. Get Campaign by ID
**GET** `/api/campaigns/:id`

**Authentication:** Not required

**Description:** Get detailed information about a specific campaign

**Response:**
```json
{
  "message": "Campaign retrieved successfully",
  "data": {
    "_id": "campaign_id",
    "brandId": {
      "companyName": "Fashion Brand Inc.",
      "email": "brand@example.com",
      "website": "https://fashionbrand.com"
    },
    "applicants": [
      {
        "name": "Influencer Name",
        "email": "influencer@example.com",
        "username": "influencer_handle"
      }
    ],
    "selectedInfluencers": [],
    // ... full campaign data
  }
}
```

### 4. Get Brand's Campaigns
**GET** `/api/campaigns/brand/my-campaigns`

**Authentication:** Required (Brand)

**Description:** Get campaigns created by the authenticated brand

**Query Parameters:**
- `status` (optional): Filter by campaign status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "message": "Brand campaigns retrieved successfully",
  "data": [
    {
      "_id": "campaign_id",
      "campaignName": "Summer Fashion Campaign 2024",
      "applicants": [...],
      "selectedInfluencers": [...],
      // ... campaign data
    }
  ],
  "pagination": { ... }
}
```

### 5. Update Campaign
**PATCH** `/api/campaigns/:id`

**Authentication:** Required (Campaign Owner)

**Description:** Update campaign details (only for campaigns that are not completed or cancelled)

**Request Body:** (Partial campaign data)
```json
{
  "campaignName": "Updated Campaign Name",
  "status": "Active",
  "compensation": {
    "type": "Monetary",
    "amount": 600,
    "currency": "USD"
  }
}
```

**Response:**
```json
{
  "message": "Campaign updated successfully",
  "data": {
    // ... updated campaign data
  }
}
```

### 6. Delete Campaign
**DELETE** `/api/campaigns/:id`

**Authentication:** Required (Campaign Owner)

**Description:** Delete a campaign (restrictions apply for active campaigns with applicants)

**Response:**
```json
{
  "message": "Campaign deleted successfully"
}
```

### 7. Apply to Campaign
**POST** `/api/campaigns/:id/apply`

**Authentication:** Required (Influencer)

**Description:** Apply to a campaign as an influencer

**Request Body:** (Empty)

**Response:**
```json
{
  "message": "Application submitted successfully"
}
```

### 8. Select Influencer
**POST** `/api/campaigns/:id/select`

**Authentication:** Required (Campaign Owner)

**Description:** Select an influencer who has applied to the campaign

**Request Body:**
```json
{
  "influencerId": "influencer_user_id"
}
```

**Response:**
```json
{
  "message": "Influencer selected successfully"
}
```

## Campaign Status Values
- `"Draft"`: Campaign is being created/edited
- `"Active"`: Campaign is live and accepting applications
- `"Paused"`: Campaign is temporarily paused
- `"Completed"`: Campaign has been completed
- `"Cancelled"`: Campaign has been cancelled

## Error Responses
All endpoints return appropriate HTTP status codes with error messages:

```json
{
  "message": "Error description",
  "error": "Detailed error message (in development)"
}
```

Common status codes:
- `400`: Bad Request (validation errors, business logic violations)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (campaign not found)
- `500`: Internal Server Error

## Example Campaign Creation (Full)

```json
{
  "productImages": [
    "https://example.com/product1.jpg",
    "https://example.com/product2.jpg"
  ],
  "campaignName": "Winter Collection Launch",
  "campaignType": "Product Launch",
  "campaignBrief": "We're launching our new winter collection and looking for fashion influencers to create authentic content showcasing our cozy sweaters and jackets. The campaign should highlight the comfort, style, and quality of our products.",
  "deliverables": [
    "1 Instagram Post with product styling",
    "3 Instagram Stories showing behind-the-scenes",
    "1 Reel showcasing the products in action"
  ],
  "compensation": {
    "type": "Barter/Gifting",
    "giftValue": 300,
    "products": ["Winter Sweater", "Wool Jacket"],
    "description": "Free products worth $300 plus potential for future collaborations"
  },
  "timelines": {
    "applicationDeadline": "2024-03-10T23:59:59.000Z",
    "campaignStartDate": "2024-03-15T00:00:00.000Z",
    "campaignEndDate": "2024-04-01T23:59:59.000Z"
  },
  "targetInfluencer": {
    "numberOfInfluencers": 3,
    "targetNiche": ["Fashion", "Lifestyle", "Winter Fashion"],
    "followerCount": {
      "min": 5000,
      "max": 50000
    },
    "countries": ["United States", "Canada", "United Kingdom"],
    "gender": ["Female", "Male"],
    "ageRange": {
      "min": 20,
      "max": 40
    }
  },
  "status": "Active"
}
``` 