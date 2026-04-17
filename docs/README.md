# Phyo Platform API Documentation

Complete API documentation for the Phyo influencer marketing platform, including both **Influencer** and **Brand** registration and management APIs.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Influencer APIs](#influencer-apis)
5. [Brand APIs](#brand-apis)
6. [Lists APIs](#lists-apis)
7. [Admin APIs](#admin-apis)
8. [Postman Collection](#postman-collection)
9. [Environment Setup](#environment-setup)

---

## Overview

The Phyo Platform provides RESTful APIs for:
- **Influencer Registration & Management** - Register influencers, fetch Instagram demographics, manage profiles
- **Brand Registration & Management** - Register brands, upload documents, manage campaigns
- **Saved Influencer Lists** - Create lists, add influencers, manage statuses and notes, export list data
- **Admin Approval Workflow** - Review and approve/reject influencer and brand requests

**Key Features:**
- ✅ Multi-step registration with optional fields
- ✅ AWS S3 file uploads (profile pictures, documents)
- ✅ Automatic Instagram demographics fetching via BrightScraper
- ✅ JWT authentication
- ✅ Admin approval workflow
- ✅ User type conversion (USER → INFLUENCER/BRAND)

---

## Authentication

### JWT Token
Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Getting a Token
After registration and approval:
1. Login using the authentication endpoint
2. Receive JWT token in response
3. Use token in subsequent requests

---

## Base URL

**Development:**
```
http://localhost:4000
```

**Production:**
```
https://api.phyo.ai
```

---

## Influencer APIs

### 1. Submit Influencer Registration

Register as an influencer with Instagram account details.

**Endpoint:** `POST /api/influencer-requests/submit`

**Authentication:** Optional (uses `optionalAuth` middleware)
- If authenticated: USER → INFLUENCER conversion
- If not authenticated: New influencer registration

**Content-Type:** `multipart/form-data` or `application/json`

#### Request Body (All Fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instagram_username` | String | ✅ Yes | Instagram username (without @) |
| `full_name` | String | ✅ Yes | Full name of influencer |
| `email` | String | ✅ Yes | Email address |
| `phone` | String | No | Phone number with country code |
| `date_of_birth` | String | No | Date of birth (YYYY-MM-DD) |
| `gender` | String | No | Gender (Male/Female/Other/Prefer not to say) |
| `bio` | String | No | Short bio (max 500 chars) |
| `country` | String | No | Country name |
| `city` | String | No | City name |
| `profile_picture` | File | No | Profile picture (JPEG/PNG, max 5MB) |
| `categories` | Array | No | Content categories (Fashion, Beauty, etc.) |
| `languages` | Array | No | Languages spoken |
| `content_types` | Array | No | Content types (Posts, Stories, Reels, etc.) |
| `collaboration_preferences` | Object | No | Collaboration preferences |
| `collaboration_preferences.types` | Array | No | Types (Sponsored Post, Product Review, etc.) |
| `collaboration_preferences.min_budget` | Number | No | Minimum budget expectation |
| `collaboration_preferences.max_budget` | Number | No | Maximum budget expectation |
| `bank_details` | Object | No | Bank account details |
| `bank_details.account_holder_name` | String | No | Account holder name |
| `bank_details.account_number` | String | No | Account number |
| `bank_details.bank_name` | String | No | Bank name |
| `bank_details.ifsc_code` | String | No | IFSC code (India) |
| `bank_details.swift_code` | String | No | SWIFT code (International) |
| `social_links` | Object | No | Other social media links |
| `social_links.youtube` | String | No | YouTube channel URL |
| `social_links.tiktok` | String | No | TikTok profile URL |
| `social_links.facebook` | String | No | Facebook profile URL |
| `social_links.twitter` | String | No | Twitter/X profile URL |
| `verification_status` | String | No | Verification status (default: 'unverified') |
| `signup_method` | String | ✅ Yes | Signup method (email/google/instagram) |

#### Example Request (JSON)

```json
{
  "instagram_username": "johndoe",
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "date_of_birth": "1995-05-15",
  "gender": "Male",
  "bio": "Travel and lifestyle content creator",
  "country": "United States",
  "city": "New York",
  "categories": ["Travel", "Lifestyle", "Photography"],
  "languages": ["English", "Spanish"],
  "content_types": ["Posts", "Stories", "Reels"],
  "collaboration_preferences": {
    "types": ["Sponsored Post", "Product Review", "Brand Ambassador"],
    "min_budget": 500,
    "max_budget": 5000
  },
  "bank_details": {
    "account_holder_name": "John Doe",
    "account_number": "1234567890",
    "bank_name": "Chase Bank",
    "swift_code": "CHASUS33"
  },
  "social_links": {
    "youtube": "https://youtube.com/@johndoe",
    "tiktok": "https://tiktok.com/@johndoe",
    "twitter": "https://twitter.com/johndoe"
  },
  "signup_method": "email"
}
```

#### Example Request (Form-Data with File)

```bash
curl -X POST http://localhost:4000/api/influencer-requests/submit \
  -F "instagram_username=johndoe" \
  -F "full_name=John Doe" \
  -F "email=john@example.com" \
  -F "phone=+1234567890" \
  -F "date_of_birth=1995-05-15" \
  -F "gender=Male" \
  -F "bio=Travel and lifestyle content creator" \
  -F "country=United States" \
  -F "city=New York" \
  -F "categories=Travel" \
  -F "categories=Lifestyle" \
  -F "languages=English" \
  -F "content_types=Posts" \
  -F "content_types=Reels" \
  -F "collaboration_preferences[types]=Sponsored Post" \
  -F "collaboration_preferences[min_budget]=500" \
  -F "collaboration_preferences[max_budget]=5000" \
  -F "social_links[youtube]=https://youtube.com/@johndoe" \
  -F "signup_method=email" \
  -F "profile_picture=@/path/to/profile.jpg"
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Influencer registration submitted successfully! Demographics will be fetched automatically.",
  "request_id": "64f5a6b7c8d9e0f1a2b3c4d5",
  "is_conversion": false,
  "demographics_status": "pending"
}
```

---

### 2. Get Influencer Profile

Get the authenticated influencer's profile.

**Endpoint:** `GET /api/influencer-requests/profile`

**Authentication:** ✅ Required (JWT token for INFLUENCER type)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Response (Success)

```json
{
  "success": true,
  "influencer": {
    "_id": "64f5a6b7c8d9e0f1a2b3c4d5",
    "email": "john@example.com",
    "type": "INFLUENCER",
    "instagram_username": "johndoe",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "date_of_birth": "1995-05-15T00:00:00.000Z",
    "gender": "Male",
    "bio": "Travel and lifestyle content creator",
    "country": "United States",
    "city": "New York",
    "profile_picture": "https://s3.amazonaws.com/bucket/influencers/johndoe/profile-123.jpg",
    "categories": ["Travel", "Lifestyle", "Photography"],
    "languages": ["English", "Spanish"],
    "content_types": ["Posts", "Stories", "Reels"],
    "collaboration_preferences": {
      "types": ["Sponsored Post", "Product Review"],
      "min_budget": 500,
      "max_budget": 5000
    },
    "social_links": {
      "youtube": "https://youtube.com/@johndoe",
      "tiktok": "https://tiktok.com/@johndoe"
    },
    "demographics": {
      "followers_count": 125000,
      "following_count": 1200,
      "posts_count": 450,
      "engagement_rate": 4.2,
      "avg_likes": 5250,
      "avg_comments": 180,
      "audience_demographics": {
        "age_groups": {
          "18-24": 35,
          "25-34": 45,
          "35-44": 15,
          "45+": 5
        },
        "gender_split": {
          "male": 42,
          "female": 58
        },
        "top_countries": ["United States", "Canada", "United Kingdom"],
        "top_cities": ["New York", "Los Angeles", "London"]
      }
    },
    "status": "approved",
    "verification_status": "verified",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-20T14:25:00.000Z"
  }
}
```

---

### 3. Update Influencer Profile

Update the authenticated influencer's profile.

**Endpoint:** `PUT /api/influencer-requests/profile`

**Authentication:** ✅ Required (JWT token for INFLUENCER type)

**Content-Type:** `multipart/form-data` or `application/json`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Request Body (All Optional)

All fields from the registration endpoint are optional. Send only the fields you want to update.

#### Example Request (JSON)

```json
{
  "bio": "Updated bio - Adventure seeker and storyteller",
  "city": "Los Angeles",
  "categories": ["Travel", "Adventure", "Photography"],
  "collaboration_preferences": {
    "min_budget": 1000,
    "max_budget": 10000
  },
  "social_links": {
    "youtube": "https://youtube.com/@johndoe_updated",
    "facebook": "https://facebook.com/johndoe"
  }
}
```

#### Example Request (Form-Data with File)

```bash
curl -X PUT http://localhost:4000/api/influencer-requests/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "bio=Updated bio" \
  -F "city=Los Angeles" \
  -F "categories=Travel" \
  -F "categories=Adventure" \
  -F "profile_picture=@/path/to/new_profile.jpg"
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Influencer profile updated successfully",
  "influencer": {
    "_id": "64f5a6b7c8d9e0f1a2b3c4d5",
    "instagram_username": "johndoe",
    "bio": "Updated bio - Adventure seeker and storyteller",
    "city": "Los Angeles",
    "profile_picture": "https://s3.amazonaws.com/bucket/influencers/johndoe/profile-456.jpg"
  },
  "uploaded_files": {
    "profile_picture": "https://s3.amazonaws.com/bucket/influencers/johndoe/profile-456.jpg"
  }
}
```

---

### 4. Get Instagram Demographics

Fetch or retrieve Instagram demographics for the authenticated influencer.

**Endpoint:** `GET /api/influencer-requests/demographics`

**Authentication:** ✅ Required (JWT token for INFLUENCER type)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Response (Success - Demographics Available)

```json
{
  "success": true,
  "demographics": {
    "followers_count": 125000,
    "following_count": 1200,
    "posts_count": 450,
    "engagement_rate": 4.2,
    "avg_likes": 5250,
    "avg_comments": 180,
    "audience_demographics": {
      "age_groups": {
        "18-24": 35,
        "25-34": 45,
        "35-44": 15,
        "45+": 5
      },
      "gender_split": {
        "male": 42,
        "female": 58
      },
      "top_countries": ["United States", "Canada", "United Kingdom"],
      "top_cities": ["New York", "Los Angeles", "London"]
    },
    "last_updated": "2024-01-20T14:25:00.000Z"
  }
}
```

#### Response (Pending)

```json
{
  "success": false,
  "message": "Demographics fetch is in progress. Please try again in a few moments.",
  "status": "pending"
}
```

---

## Brand APIs

### 1. Submit Brand Registration

Register as a brand/company.

**Endpoint:** `POST /api/brand-requests/submit`

**Authentication:** Optional (uses `optionalAuth` middleware)
- If authenticated: USER → BRAND conversion
- If not authenticated: New brand registration

**Content-Type:** `multipart/form-data` or `application/json`

#### Request Body (All Fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `company_name` | String | ✅ Yes | Company/Brand name |
| `website_url` | String | ✅ Yes | Company website URL |
| `industry` | String | ✅ Yes | Industry/Category |
| `company_type` | String | No | Brand/Agency/Marketplace |
| `company_size` | String | No | 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+ |
| `company_description` | String | No | Company description |
| `location` | String | No | Company location |
| `country` | String | No | Country name |
| `company_logo` | File | No | Company logo (JPEG/PNG, max 5MB) |
| `brand_images` | File[] | No | Brand images (max 10, 5MB each) |
| `social_media` | Object | No | Social media links |
| `social_media.facebook` | String | No | Facebook page URL |
| `social_media.instagram` | String | No | Instagram profile URL |
| `social_media.twitter` | String | No | Twitter/X profile URL |
| `social_media.linkedin` | String | No | LinkedIn company URL |
| `social_media.youtube` | String | No | YouTube channel URL |
| `social_media.tiktok` | String | No | TikTok profile URL |
| `brand_story` | String | No | Brand story (max 2000 chars) |
| `verification_documents` | Object | No | Verification documents |
| `verification_documents.business_registration` | String/File | No | Business registration certificate |
| `verification_documents.tax_id` | String | No | Tax ID/GST number |
| `verification_documents.company_registration_number` | String | No | Company registration number |
| `verification_documents.authorization_letter` | String/File | No | Authorization letter |
| `billing_info` | Object | No | Billing information |
| `billing_info.billing_address` | String | No | Billing address |
| `billing_info.contact_person` | String | No | Billing contact person |
| `billing_info.finance_email` | String | No | Finance contact email |
| `payment_method` | Object | No | Payment method details |
| `payment_method.card_details` | Object | No | Card details (tokenized) |
| `payment_method.bank_account` | Object | No | Bank account details (tokenized) |
| `payment_method.default_payment` | String | No | card/bank |
| `payment_method.budget_limit` | Number | No | Budget limit |
| `subscription_plan` | String | No | FREE/BASIC/PROFESSIONAL/ENTERPRISE |
| `team_members` | Array | No | Team members |
| `team_members[].email` | String | No | Team member email |
| `team_members[].role` | String | No | Role name |
| `team_members[].permissions` | Array | No | Permission strings |
| `preferences` | Object | No | User preferences |
| `preferences.notifications` | Boolean | No | Enable notifications |
| `preferences.email_preferences` | Array | No | Email preference strings |
| `preferences.timezone` | String | No | Timezone (default: UTC) |
| `preferences.language` | String | No | Language code (default: en) |
| `contact` | Object | ✅ Yes | Contact information |
| `contact.first_name` | String | ✅ Yes | Contact first name |
| `contact.last_name` | String | ✅ Yes | Contact last name |
| `contact.email` | String | ✅ Yes | Contact email |
| `contact.phone` | String | No | Contact phone |
| `contact.job_title` | String | No | Contact job title |
| `account` | Object | ✅ Yes | Account information |
| `account.signup_method` | String | ✅ Yes | email/google/linkedin/sso |

#### Example Request (JSON - Minimal)

```json
{
  "company_name": "Acme Inc.",
  "website_url": "https://acme.com",
  "industry": "Technology",
  "contact": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@acme.com"
  },
  "account": {
    "signup_method": "email"
  }
}
```

#### Example Request (JSON - Complete)

```json
{
  "company_name": "Acme Inc.",
  "website_url": "https://acme.com",
  "industry": "Technology",
  "company_type": "Brand",
  "company_size": "51-200",
  "company_description": "Leading technology company specializing in innovative solutions",
  "location": "New York",
  "country": "USA",
  "social_media": {
    "facebook": "https://facebook.com/acme",
    "instagram": "https://instagram.com/acme",
    "linkedin": "https://linkedin.com/company/acme",
    "twitter": "https://twitter.com/acme"
  },
  "brand_story": "Our company was founded in 2015 with a vision to revolutionize...",
  "verification_documents": {
    "tax_id": "TAX123456",
    "company_registration_number": "REG123456"
  },
  "billing_info": {
    "billing_address": "123 Main St, New York, NY 10001",
    "contact_person": "Jane Smith",
    "finance_email": "finance@acme.com"
  },
  "payment_method": {
    "default_payment": "card",
    "budget_limit": 50000
  },
  "subscription_plan": "PROFESSIONAL",
  "team_members": [
    {
      "email": "team1@acme.com",
      "role": "Manager",
      "permissions": ["view_campaigns", "create_campaigns", "manage_team"]
    }
  ],
  "preferences": {
    "notifications": true,
    "email_preferences": ["weekly_digest", "campaign_updates"],
    "timezone": "America/New_York",
    "language": "en"
  },
  "contact": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@acme.com",
    "phone": "+1234567890",
    "job_title": "Marketing Director"
  },
  "account": {
    "signup_method": "email"
  }
}
```

#### Example Request (Form-Data with Files)

```bash
curl -X POST http://localhost:4000/api/brand-requests/submit \
  -F "company_name=Acme Inc." \
  -F "website_url=https://acme.com" \
  -F "industry=Technology" \
  -F "company_type=Brand" \
  -F "company_size=51-200" \
  -F "company_description=Leading tech company" \
  -F "location=New York" \
  -F "country=USA" \
  -F "brand_story=Our story begins..." \
  -F "contact[first_name]=John" \
  -F "contact[last_name]=Doe" \
  -F "contact[email]=john@acme.com" \
  -F "contact[phone]=+1234567890" \
  -F "contact[job_title]=CEO" \
  -F "account[signup_method]=email" \
  -F "social_media[facebook]=https://facebook.com/acme" \
  -F "social_media[instagram]=https://instagram.com/acme" \
  -F "verification_documents[tax_id]=TAX123456" \
  -F "subscription_plan=PROFESSIONAL" \
  -F "company_logo=@/path/to/logo.png" \
  -F "brand_images=@/path/to/image1.jpg" \
  -F "brand_images=@/path/to/image2.jpg" \
  -F "business_registration=@/path/to/cert.pdf" \
  -F "authorization_letter=@/path/to/auth.pdf"
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Brand registration submitted successfully! We will review your application and confirm by email within 24-48 hours.",
  "request_id": "64f5a6b7c8d9e0f1a2b3c4d6",
  "is_conversion": false
}
```

---

### 2. Get Brand Profile

Get the authenticated brand's profile.

**Endpoint:** `GET /api/brand-requests/profile`

**Authentication:** ✅ Required (JWT token for BRAND type)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Response (Success)

```json
{
  "success": true,
  "brand": {
    "_id": "64f5a6b7c8d9e0f1a2b3c4d6",
    "email": "john@acme.com",
    "type": "BRAND",
    "company_name": "Acme Inc.",
    "website_url": "https://acme.com",
    "industry": "Technology",
    "company_type": "Brand",
    "company_size": "51-200",
    "company_description": "Leading technology company",
    "location": "New York",
    "country": "USA",
    "company_logo": "https://s3.amazonaws.com/bucket/brands/john@acme.com/logo-123.png",
    "brand_images": [
      "https://s3.amazonaws.com/bucket/brands/john@acme.com/img1-123.jpg",
      "https://s3.amazonaws.com/bucket/brands/john@acme.com/img2-123.jpg"
    ],
    "social_media": {
      "facebook": "https://facebook.com/acme",
      "instagram": "https://instagram.com/acme",
      "linkedin": "https://linkedin.com/company/acme"
    },
    "brand_story": "Our company was founded...",
    "verification_documents": {
      "business_registration": "https://s3.amazonaws.com/bucket/brands/john@acme.com/cert-123.pdf",
      "tax_id": "TAX123456",
      "company_registration_number": "REG123456"
    },
    "billing_info": {
      "billing_address": "123 Main St, New York, NY 10001",
      "contact_person": "Jane Smith",
      "finance_email": "finance@acme.com"
    },
    "subscription_plan": "PROFESSIONAL",
    "team_members": [
      {
        "email": "team1@acme.com",
        "role": "Manager",
        "permissions": ["view_campaigns", "create_campaigns"]
      }
    ],
    "preferences": {
      "notifications": true,
      "email_preferences": ["weekly_digest"],
      "timezone": "America/New_York",
      "language": "en"
    },
    "status": "approved",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-20T14:25:00.000Z"
  }
}
```

---

### 3. Update Brand Profile

Update the authenticated brand's profile.

**Endpoint:** `PUT /api/brand-requests/profile`

**Authentication:** ✅ Required (JWT token for BRAND type)

**Content-Type:** `multipart/form-data` or `application/json`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Request Body (All Optional)

All fields from the registration endpoint are optional. Send only the fields you want to update.

#### Example Request (JSON)

```json
{
  "company_description": "Updated company description",
  "location": "San Francisco",
  "social_media": {
    "twitter": "https://twitter.com/acme_updated",
    "youtube": "https://youtube.com/acme"
  },
  "billing_info": {
    "billing_address": "456 New Street, San Francisco, CA 94102",
    "finance_email": "newfin@acme.com"
  },
  "subscription_plan": "ENTERPRISE",
  "preferences": {
    "notifications": false,
    "language": "es"
  }
}
```

#### Example Request (Form-Data with Files)

```bash
curl -X PUT http://localhost:4000/api/brand-requests/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "company_description=Updated description" \
  -F "location=San Francisco" \
  -F "social_media[twitter]=https://twitter.com/acme" \
  -F "company_logo=@/path/to/new_logo.png" \
  -F "brand_images=@/path/to/new_image1.jpg" \
  -F "business_registration=@/path/to/new_cert.pdf"
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Brand profile updated successfully",
  "brand": {
    "_id": "64f5a6b7c8d9e0f1a2b3c4d6",
    "company_name": "Acme Inc.",
    "company_description": "Updated description",
    "location": "San Francisco",
    "company_logo": "https://s3.amazonaws.com/bucket/brands/john@acme.com/logo-456.png"
  },
  "uploaded_files": {
    "company_logo": "https://s3.amazonaws.com/bucket/brands/john@acme.com/logo-456.png",
    "brand_images": [
      "https://s3.amazonaws.com/bucket/brands/john@acme.com/img-456.jpg"
    ],
    "business_registration": "https://s3.amazonaws.com/bucket/brands/john@acme.com/cert-456.pdf"
  }
}
```

---

## Lists APIs

For the complete Lists API reference, see [LISTS_API_DOCS.md](./LISTS_API_DOCS.md).

---

## Admin APIs

### 1. Get All Influencer Requests

Get all influencer registration requests.

**Endpoint:** `GET /api/influencer-requests/admin/requests`

**Authentication:** ✅ Required (Admin only)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | String | Filter by status: pending/approved/rejected |
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Items per page (default: 20) |

**Example:**
```
GET /api/influencer-requests/admin/requests?status=pending&page=1&limit=10
```

#### Response (Success)

```json
{
  "success": true,
  "requests": [
    {
      "_id": "64f5a6b7c8d9e0f1a2b3c4d5",
      "instagram_username": "johndoe",
      "full_name": "John Doe",
      "email": "john@example.com",
      "status": "pending",
      "demographics": null,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

---

### 2. Get Influencer Request by ID

Get a specific influencer request by ID.

**Endpoint:** `GET /api/influencer-requests/admin/requests/:id`

**Authentication:** ✅ Required (Admin only)

#### Response (Success)

```json
{
  "success": true,
  "request": {
    "_id": "64f5a6b7c8d9e0f1a2b3c4d5",
    "instagram_username": "johndoe",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "bio": "Travel and lifestyle creator",
    "categories": ["Travel", "Lifestyle"],
    "demographics": {
      "followers_count": 125000,
      "engagement_rate": 4.2
    },
    "status": "pending",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 3. Approve Influencer Request

Approve an influencer registration request.

**Endpoint:** `PUT /api/influencer-requests/admin/requests/:id/approve`

**Authentication:** ✅ Required (Admin only)

#### Response (Success)

```json
{
  "success": true,
  "message": "Influencer request approved successfully",
  "request": {
    "_id": "64f5a6b7c8d9e0f1a2b3c4d5",
    "status": "approved",
    "approved_at": "2024-01-20T10:00:00.000Z"
  }
}
```

---

### 4. Reject Influencer Request

Reject an influencer registration request.

**Endpoint:** `PUT /api/influencer-requests/admin/requests/:id/reject`

**Authentication:** ✅ Required (Admin only)

**Request Body:**

```json
{
  "rejection_reason": "Instagram account does not meet minimum follower requirements"
}
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Influencer request rejected",
  "request": {
    "_id": "64f5a6b7c8d9e0f1a2b3c4d5",
    "status": "rejected",
    "rejection_reason": "Instagram account does not meet minimum follower requirements",
    "rejected_at": "2024-01-20T10:00:00.000Z"
  }
}
```

---

### 5. Get All Brand Requests

Get all brand registration requests.

**Endpoint:** `GET /api/brand-requests/admin/requests`

**Authentication:** ✅ Required (Admin only)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | String | Filter by status: pending/approved/rejected |
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Items per page (default: 20) |

**Example:**
```
GET /api/brand-requests/admin/requests?status=pending&page=1&limit=10
```

#### Response (Success)

```json
{
  "success": true,
  "requests": [
    {
      "_id": "64f5a6b7c8d9e0f1a2b3c4d6",
      "company_name": "Acme Inc.",
      "email": "john@acme.com",
      "industry": "Technology",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "totalPages": 2
}
```

---

### 6. Get Brand Request by ID

Get a specific brand request by ID.

**Endpoint:** `GET /api/brand-requests/admin/requests/:id`

**Authentication:** ✅ Required (Admin only)

#### Response (Success)

```json
{
  "success": true,
  "request": {
    "_id": "64f5a6b7c8d9e0f1a2b3c4d6",
    "company_name": "Acme Inc.",
    "website_url": "https://acme.com",
    "industry": "Technology",
    "company_type": "Brand",
    "email": "john@acme.com",
    "status": "pending",
    "verification_documents": {
      "tax_id": "TAX123456"
    },
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 7. Approve Brand Request

Approve a brand registration request.

**Endpoint:** `PUT /api/brand-requests/admin/requests/:id/approve`

**Authentication:** ✅ Required (Admin only)

#### Response (Success)

```json
{
  "success": true,
  "message": "Brand request approved successfully",
  "request": {
    "_id": "64f5a6b7c8d9e0f1a2b3c4d6",
    "status": "approved",
    "approved_at": "2024-01-20T10:00:00.000Z"
  }
}
```

---

### 8. Reject Brand Request

Reject a brand registration request.

**Endpoint:** `PUT /api/brand-requests/admin/requests/:id/reject`

**Authentication:** ✅ Required (Admin only)

**Request Body:**

```json
{
  "rejection_reason": "Unable to verify business registration documents"
}
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Brand request rejected",
  "request": {
    "_id": "64f5a6b7c8d9e0f1a2b3c4d6",
    "status": "rejected",
    "rejection_reason": "Unable to verify business registration documents",
    "rejected_at": "2024-01-20T10:00:00.000Z"
  }
}
```

---

### 9. Get Request Statistics

Get statistics for influencer and brand requests.

**Endpoint:** `GET /api/influencer-requests/admin/requests/stats` (Influencer)
**Endpoint:** `GET /api/brand-requests/admin/requests/stats` (Brand)

**Authentication:** ✅ Required (Admin only)

#### Response (Success)

```json
{
  "success": true,
  "stats": {
    "total": 100,
    "pending": 25,
    "approved": 60,
    "rejected": 15
  }
}
```

---

## Postman Collection

A complete Postman collection is available at:
```
phyo_docker/server/docs/Phyo-Platform-Complete.postman_collection.json
```

**To Import:**
1. Open Postman
2. Click **Import** button
3. Select the JSON file
4. All endpoints will be imported with example requests

---

## Environment Setup

### Development Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/phyo

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Email Configuration
EMAIL_USER=phyo.aiofficial@gmail.com
EMAIL_PASS=your_email_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Client URL
CLIENT_URL=http://localhost:3000

# AWS S3 Configuration (Optional - falls back to local storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=phyo-platform-assets

# BrightScraper API (for Instagram demographics)
BRIGHTSCRAPER_API_URL=http://localhost:5000
```

---

## File Upload Configuration

### S3 Folder Structure

**Influencers:**
```
s3://bucket-name/influencers/{instagram_username}/
  ├── profile-{timestamp}.jpg
  └── documents/
```

**Brands:**
```
s3://bucket-name/brands/{email}/
  ├── logo-{timestamp}.png
  ├── images/
  │   ├── img1-{timestamp}.jpg
  │   └── img2-{timestamp}.jpg
  └── documents/
      ├── cert-{timestamp}.pdf
      └── auth-{timestamp}.pdf
```

### File Upload Limits

| Type | Max Size | Max Count | Formats |
|------|----------|-----------|---------|
| Profile Picture | 5 MB | 1 | JPEG, PNG, GIF, WebP |
| Company Logo | 5 MB | 1 | JPEG, PNG, GIF, WebP |
| Brand Images | 5 MB each | 10 | JPEG, PNG, GIF, WebP |
| Documents | 10 MB | - | PDF, DOC, DOCX, Images |

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Duplicate entry (e.g., email already exists) |
| `FILE_UPLOAD_ERROR` | File upload failed |
| `DEMOGRAPHICS_FETCH_FAILED` | Failed to fetch Instagram demographics |
| `SERVER_ERROR` | Internal server error |

---

## Support

For API support or questions:
- Email: support@phyo.ai
- Documentation: https://docs.phyo.ai
- Status Page: https://status.phyo.ai

---

**Last Updated:** December 11, 2024
**API Version:** 1.0.0
