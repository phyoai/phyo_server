# User to Brand Conversion API Documentation

## Overview
This API allows existing USER type accounts to request conversion to BRAND accounts. The admin reviews and approves/declines these requests. Once approved, the user's account type changes to BRAND and they continue using their existing login credentials.

## Authentication Flow

### 1. User Signup (New Flow)

**Endpoint:** `POST /api/user/signup`

**Required Fields for USER type:**
- `email` (string, required)
- `password` (string, required, min 6 characters)
- `type` (string, required, must be "USER")
- `name` (string, required)
- `username` (string, required, unique)
- `gender` (string, required, must be "Male", "Female", or "Other")
- `phoneNumber` (string, optional)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "type": "USER",
  "name": "John Doe",
  "username": "johndoe",
  "gender": "Male",
  "phoneNumber": "+1234567890"
}
```

**Response (201 Created):**
```json
{
  "message": "Registration initiated. Please check your email for verification code.",
  "email": "user@example.com"
}
```

**Note:** User will receive an OTP via email to verify their email address.

---

### 1b. User Signup via Google OAuth

**Endpoint:** `POST /api/user/google-auth`

**Required Fields for USER type:**
- `idToken` (string, required) - Google ID token
- `type` (string, required, must be "USER")
- `gender` (string, required, must be "Male", "Female", or "Other")
- `phoneNumber` (string, optional)

**Request Body:**
```json
{
  "idToken": "google_id_token_here",
  "type": "USER",
  "gender": "Male",
  "phoneNumber": "+1234567890"
}
```

**Response (200 OK):**
```json
{
  "message": "Google OAuth login successful",
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "email": "user@gmail.com",
    "type": "USER",
    "name": "John Doe",
    "username": "johndoe",
    "gender": "Male",
    "phoneNumber": "+1234567890",
    "googleId": "google_id",
    "googleEmail": "user@gmail.com",
    "googleName": "John Doe",
    "googlePicture": "https://lh3.googleusercontent.com/...",
    "isOAuthUser": true,
    "isEmailVerified": true,
    "brandRegistrationStatus": "NONE",
    "currentPlan": "BRONZE",
    "creditsRemaining": 3
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "message": "Gender is required for USER registration. Please provide gender (Male, Female, or Other)"
}
```

**Note:** 
- Google OAuth users don't need email verification (pre-verified)
- Username is auto-generated from email or Google name
- Google profile picture is used as default profile picture

---

## User-to-Brand Conversion APIs

### 2. Submit Brand Conversion Request

**Endpoint:** `POST /api/user-to-brand/submit`

**Authentication:** Required (Bearer token)

**Description:** Authenticated USER can submit a request to convert their account to a BRAND account.

**Request Headers:**
```
Authorization: Bearer <user_token>
```

**Request Body:**
```json
{
  "company_name": "Tech Innovations Inc.",
  "website_url": "https://www.techinnovations.com",
  "industry": "Technology",
  "company_type": "Brand",
  "company_size": "51-200",
  "contact": {
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "job_title": "Marketing Manager"
  }
}
```

**Field Validations:**
- `company_name` (string, required)
- `website_url` (string, required, must be valid URL)
- `industry` (string, required)
- `company_type` (string, optional): "Brand", "Agency", or "Marketplace"
- `company_size` (string, optional): "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
- `contact.first_name` (string, required)
- `contact.last_name` (string, required)
- `contact.phone` (string, optional)
- `contact.job_title` (string, optional)

**Success Response (200 OK):**
```json
{
  "message": "Brand registration request submitted successfully! We will review your application and confirm by email within 24-48 hours.",
  "request_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "status": "PENDING"
}
```

**Error Responses:**

401 Unauthorized:
```json
{
  "message": "Unauthorized"
}
```

400 Bad Request (Already a brand):
```json
{
  "message": "You are already registered as a brand."
}
```

400 Bad Request (Pending request exists):
```json
{
  "message": "You already have a pending brand registration request.",
  "status": "PENDING",
  "request_id": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

400 Bad Request (Wrong user type):
```json
{
  "message": "Only USER type accounts can request brand conversion."
}
```

---

### 3. Get My Brand Registration Status

**Endpoint:** `GET /api/user-to-brand/my-status`

**Authentication:** Required (Bearer token)

**Description:** Get the current status of the user's brand conversion request.

**Request Headers:**
```
Authorization: Bearer <user_token>
```

**Success Response (200 OK) - No Request:**
```json
{
  "status": "NONE",
  "type": "USER",
  "message": "No brand registration request found."
}
```

**Success Response (200 OK) - Pending Request:**
```json
{
  "status": "PENDING",
  "type": "USER",
  "request": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "company_name": "Tech Innovations Inc.",
    "industry": "Technology",
    "submitted_at": "2025-12-04T10:00:00.000Z",
    "reviewed_at": null,
    "admin_notes": null,
    "rejection_reason": null
  }
}
```

**Success Response (200 OK) - Approved (Already Brand):**
```json
{
  "status": "APPROVED",
  "type": "BRAND",
  "message": "You are already registered as a brand."
}
```

**Success Response (200 OK) - Declined Request:**
```json
{
  "status": "DECLINED",
  "type": "USER",
  "request": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "company_name": "Tech Innovations Inc.",
    "industry": "Technology",
    "submitted_at": "2025-12-04T10:00:00.000Z",
    "reviewed_at": "2025-12-05T14:30:00.000Z",
    "admin_notes": "Company details could not be verified",
    "rejection_reason": "Unable to verify company website and registration details"
  }
}
```

---

## Admin APIs

### 4. Get All User-to-Brand Requests

**Endpoint:** `GET /api/user-to-brand/admin/all`

**Authentication:** Required (Admin Bearer token)

**Description:** Admin can view all user-to-brand conversion requests with filtering, search, and pagination.

**Query Parameters:**
- `status` (string, optional): "PENDING", "APPROVED", "DECLINED", or "ALL" (default: all)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `search` (string, optional): Search by company name, user email, user name, contact name, or industry

**Request Headers:**
```
Authorization: Bearer <admin_token>
```

**Example Request:**
```
GET /api/user-to-brand/admin/all?status=PENDING&page=1&limit=20&search=tech
```

**Success Response (200 OK):**
```json
{
  "requests": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "userId": "60f7b3b3b3b3b3b3b3b3b3b4",
      "userEmail": "user@example.com",
      "userName": "John Doe",
      "company_name": "Tech Innovations Inc.",
      "website_url": "https://www.techinnovations.com",
      "industry": "Technology",
      "company_type": "Brand",
      "company_size": "51-200",
      "contact": {
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1234567890",
        "job_title": "Marketing Manager"
      },
      "status": "PENDING",
      "created_at": "2025-12-04T10:00:00.000Z",
      "updated_at": "2025-12-04T10:00:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_requests": 87,
    "limit": 20
  }
}
```

---

### 5. Get Single User-to-Brand Request

**Endpoint:** `GET /api/user-to-brand/admin/:id`

**Authentication:** Required (Admin Bearer token)

**Description:** Admin can view details of a specific user-to-brand conversion request.

**Request Headers:**
```
Authorization: Bearer <admin_token>
```

**Success Response (200 OK):**
```json
{
  "request": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "userId": "60f7b3b3b3b3b3b3b3b3b3b4",
    "userEmail": "user@example.com",
    "userName": "John Doe",
    "company_name": "Tech Innovations Inc.",
    "website_url": "https://www.techinnovations.com",
    "industry": "Technology",
    "company_type": "Brand",
    "company_size": "51-200",
    "contact": {
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "job_title": "Marketing Manager"
    },
    "status": "PENDING",
    "created_at": "2025-12-04T10:00:00.000Z",
    "updated_at": "2025-12-04T10:00:00.000Z"
  },
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b4",
    "email": "user@example.com",
    "type": "USER",
    "createdAt": "2025-11-01T08:00:00.000Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "message": "Brand conversion request not found"
}
```

---

### 6. Approve User-to-Brand Request

**Endpoint:** `POST /api/user-to-brand/admin/:id/approve`

**Authentication:** Required (Admin Bearer token)

**Description:** Admin approves the user-to-brand conversion request. This will:
1. Convert the USER account to BRAND type
2. Preserve all existing user data and credentials
3. Send approval email to the user (without new credentials)
4. Update request status to APPROVED

**Request Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "admin_notes": "Company verified successfully. All documents are in order."
}
```

**Success Response (200 OK):**
```json
{
  "message": "User account successfully converted to Brand. User can continue using their existing credentials.",
  "brand_id": "60f7b3b3b3b3b3b3b3b3b3b4"
}
```

**Error Responses:**

404 Not Found:
```json
{
  "message": "Brand conversion request not found"
}
```

400 Bad Request (Already reviewed):
```json
{
  "message": "Brand conversion request has already been reviewed"
}
```

400 Bad Request (User already brand):
```json
{
  "message": "User is already registered as a brand."
}
```

---

### 7. Decline User-to-Brand Request

**Endpoint:** `POST /api/user-to-brand/admin/:id/decline`

**Authentication:** Required (Admin Bearer token)

**Description:** Admin declines the user-to-brand conversion request with a reason.

**Request Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "admin_notes": "Internal notes for admin records",
  "rejection_reason": "Unable to verify company website and registration details. Please ensure your company information is accurate and the website is accessible."
}
```

**Success Response (200 OK):**
```json
{
  "message": "Brand conversion request declined successfully. Notification email sent to the user."
}
```

**Error Responses:**

404 Not Found:
```json
{
  "message": "Brand conversion request not found"
}
```

400 Bad Request (Already reviewed):
```json
{
  "message": "Brand conversion request has already been reviewed"
}
```

---

### 8. Get User-to-Brand Request Statistics

**Endpoint:** `GET /api/user-to-brand/admin/stats`

**Authentication:** Required (Admin Bearer token)

**Description:** Get statistics about user-to-brand conversion requests for the admin dashboard.

**Request Headers:**
```
Authorization: Bearer <admin_token>
```

**Success Response (200 OK):**
```json
{
  "stats": {
    "total": 150,
    "today": 5,
    "pending": 23,
    "approved": 102,
    "declined": 25
  }
}
```

---

## Email Notifications

### User Emails

#### 1. Request Submitted Confirmation
Sent to user when they submit a brand conversion request.

**Subject:** Brand Registration Request Submitted - Phyo

**Content:** Confirms submission and provides timeline for review (24-48 hours).

#### 2. Request Approved
Sent to user when admin approves their request.

**Subject:** Congratulations! Your Account Has Been Converted to Brand - Phyo

**Key Points:**
- Congratulates user on approval
- **Important:** Informs user to use their **existing login credentials**
- Lists next steps (complete profile, create campaigns, etc.)
- No new credentials are sent

#### 3. Request Declined
Sent to user when admin declines their request.

**Subject:** Brand Registration Request Update - Phyo

**Key Points:**
- Politely informs of rejection
- Includes rejection reason if provided
- Mentions they can continue as regular user
- Offers option to reapply in future

---

## Important Notes

### Security & Data Integrity

1. **No Duplicate Accounts:** Users cannot have multiple pending or approved requests
2. **Account Conversion:** When approved, the USER account is converted to BRAND type while preserving:
   - User ID (MongoDB _id)
   - Email and password
   - All authentication tokens remain valid
   - OAuth credentials (if applicable)
   - Subscription and credits data

3. **Transaction Safety:** The approval process uses MongoDB transactions to ensure data consistency

### User Flow

```
1. User signs up as USER type (with gender required, phone optional)
   ↓
2. User verifies email via OTP
   ↓
3. User logs in and uses platform as USER
   ↓
4. User submits brand conversion request
   ↓
5. Admin reviews request
   ↓
6a. Approved → User account becomes BRAND (same credentials)
   OR
6b. Declined → User stays as USER (can reapply later)
```

### Status Values

- `NONE`: No brand request submitted
- `PENDING`: Request submitted, waiting for admin review
- `APPROVED`: Request approved, account converted to BRAND
- `DECLINED`: Request declined by admin

### Field Updates in Models

**userAuth Schema (USER type):**
- Added: `gender` (required, enum: Male/Female/Other)
- Added: `phoneNumber` (optional)
- Added: `brandRegistrationStatus` (tracks conversion status)

---

## Testing Guide

### Test Scenario 1: Complete Approval Flow

1. **Sign up as USER:**
```bash
POST /api/user/signup
{
  "email": "testuser@example.com",
  "password": "password123",
  "type": "USER",
  "name": "Test User",
  "username": "testuser",
  "gender": "Male",
  "phoneNumber": "+1234567890"
}
```

2. **Verify email with OTP** (from email)

3. **Login:**
```bash
POST /api/user/login
{
  "email": "testuser@example.com",
  "password": "password123"
}
```

4. **Submit brand conversion request:**
```bash
POST /api/user-to-brand/submit
Headers: Authorization: Bearer <user_token>
{
  "company_name": "Test Company",
  "website_url": "https://testcompany.com",
  "industry": "Technology",
  "contact": {
    "first_name": "Test",
    "last_name": "User"
  }
}
```

5. **Check status:**
```bash
GET /api/user-to-brand/my-status
Headers: Authorization: Bearer <user_token>
```

6. **Admin approves:**
```bash
POST /api/user-to-brand/admin/<request_id>/approve
Headers: Authorization: Bearer <admin_token>
{
  "admin_notes": "Approved for testing"
}
```

7. **Login again with same credentials:**
```bash
POST /api/user/login
{
  "email": "testuser@example.com",
  "password": "password123"
}
```

8. **Verify user type is now BRAND** in the response

### Test Scenario 2: Decline Flow

Follow steps 1-5 above, then:

6. **Admin declines:**
```bash
POST /api/user-to-brand/admin/<request_id>/decline
Headers: Authorization: Bearer <admin_token>
{
  "rejection_reason": "Company details could not be verified"
}
```

7. **Check status again:**
```bash
GET /api/user-to-brand/my-status
Headers: Authorization: Bearer <user_token>
```
Should show status as "DECLINED" with rejection reason.

---

## Migration Notes

No database migration is needed for existing users. The new fields will be automatically added when:
- New users sign up with the updated schema
- Existing users who want to convert to BRAND will provide the information when submitting the request

Existing BRAND accounts (created through the old flow) remain unchanged and functional.
