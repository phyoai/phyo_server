# Brand Request API Documentation

## Overview

The Brand Request API provides a **unified endpoint** that supports two different flows:
1. **New Brand Registration** - Direct brand signup without prior USER account
2. **USER to BRAND Conversion** - Existing USER account requests to become a BRAND

Both flows use the **same endpoint** (`/api/brand-requests/submit`) with smart detection based on authentication status.

---

## API Endpoints

### 1. Submit Brand Request (Unified)

**Endpoint:** `POST /api/brand-requests/submit`

**Authentication:** Optional (uses `optionalAuth` middleware)
- **Without token:** Creates new brand registration request
- **With token:** Converts existing USER to BRAND

#### Request Body

```json
{
  "company_name": "Google Inc.",
  "website_url": "https://www.google.com",
  "industry": "Technology",
  "company_type": "Brand", // Optional: Brand, Agency, Marketplace
  "company_size": "1000+", // Optional: 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+
  "contact": {
    "first_name": "Abhi",
    "last_name": "shek",
    "email": "brand@example.com", // Required ONLY for non-authenticated requests
    "phone": "+1234567890", // Optional
    "job_title": "Marketing Manager" // Optional
  },
  "account": {
    "signup_method": "email" // email, google, linkedin, sso
  }
}
```

#### Flow 1: New Brand Registration (No Authentication)

**Request Headers:**
```
Content-Type: application/json
```

**What Happens:**
1. System validates all required fields including `contact.email`
2. Checks if email already exists in brand requests or brand accounts
3. Creates brand request with `isUserConversion: false`
4. Sends confirmation email to the provided email
5. Admin reviews and approves/rejects
6. On approval: Creates new BRAND account with generated password
7. User receives email with login credentials

**Success Response:**
```json
{
  "message": "Brand registration submitted successfully! We will review your application and confirm by email within 24-48 hours.",
  "request_id": "64f5e7b9c2d4e1a2b3c4d5e6",
  "is_conversion": false
}
```

#### Flow 2: USER to BRAND Conversion (With Authentication)

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Note:** The `contact.email` field is automatically populated from the authenticated user's account and should be omitted or will be overridden.

**What Happens:**
1. System detects authenticated user via JWT token
2. Validates user is of type USER (not already BRAND or INFLUENCER)
3. Checks for duplicate pending requests
4. Overrides `contact.email` with authenticated user's email
5. Creates brand request with `isUserConversion: true` and `userId`
6. Updates user's `brandRegistrationStatus` to PENDING
7. Sends confirmation email
8. Admin reviews and approves/rejects
9. On approval: Converts USER account to BRAND (same credentials)
10. User continues using existing email/password

**Success Response:**
```json
{
  "message": "Brand registration submitted successfully! We will review your application and confirm by email within 24-48 hours.",
  "request_id": "64f5e7b9c2d4e1a2b3c4d5e6",
  "is_conversion": true
}
```

**Error Responses:**

```json
// Already a BRAND
{
  "message": "You are already registered as a brand."
}

// Not a USER
{
  "message": "Only USER type accounts can request brand conversion."
}

// Duplicate request
{
  "message": "A brand registration request already exists with this email address.",
  "status": "PENDING"
}
```

---

### 2. Get All Brand Requests (Admin)

**Endpoint:** `GET /api/brand-requests/admin/requests`

**Authentication:** Required (Admin JWT token)

**Query Parameters:**
- `status` - Filter by status (PENDING/APPROVED/REJECTED/ALL)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `search` - Search in company name, email, name, or industry

**Example:**
```
GET /api/brand-requests/admin/requests?status=PENDING&page=1&limit=20&search=google
```

**Response:**
```json
{
  "requests": [
    {
      "_id": "64f5e7b9c2d4e1a2b3c4d5e6",
      "company_name": "Google Inc.",
      "website_url": "https://www.google.com",
      "industry": "Technology",
      "company_type": "Brand",
      "company_size": "1000+",
      "contact": {
        "first_name": "Abhi",
        "last_name": "shek",
        "email": "abhi@google.com",
        "phone": "+1234567890",
        "job_title": "Marketing Manager"
      },
      "account": {
        "signup_method": "email"
      },
      "status": "PENDING",
      "userId": "64f5e7b9c2d4e1a2b3c4d5e5", // Only for conversions
      "isUserConversion": true, // true for USER conversions, false for new brands
      "created_at": "2024-12-04T10:30:00.000Z",
      "updated_at": "2024-12-04T10:30:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_requests": 95,
    "limit": 20
  }
}
```

---

### 3. Get Single Brand Request (Admin)

**Endpoint:** `GET /api/brand-requests/admin/requests/:id`

**Authentication:** Required (Admin JWT token)

**Response:**
```json
{
  "request": {
    "_id": "64f5e7b9c2d4e1a2b3c4d5e6",
    "company_name": "Google Inc.",
    // ... all request fields ...
    "isUserConversion": true,
    "userId": "64f5e7b9c2d4e1a2b3c4d5e5"
  }
}
```

---

### 4. Approve Brand Request (Admin)

**Endpoint:** `PUT /api/brand-requests/admin/requests/:id/approve`

**Authentication:** Required (Admin JWT token)

**Request Body:**
```json
{
  "admin_notes": "Approved - verified company details" // Optional
}
```

**What Happens:**

**For New Brand Registration (isUserConversion: false):**
1. Generates secure password for brand account
2. Creates new BRAND document with generated credentials
3. Generates OTP for email verification
4. Updates request status to APPROVED
5. Sends email with login credentials and OTP

**For USER to BRAND Conversion (isUserConversion: true):**
1. Starts MongoDB transaction
2. Retrieves existing USER account
3. Deletes USER document
4. Creates BRAND document with **same _id and credentials**
5. Updates user's `brandRegistrationStatus` to APPROVED
6. Updates request status to APPROVED
7. Sends conversion confirmation email (no credentials - use existing)

**Success Response:**
```json
{
  "message": "Brand request approved successfully. Welcome email sent to the brand."
}
```

---

### 5. Reject Brand Request (Admin)

**Endpoint:** `PUT /api/brand-requests/admin/requests/:id/reject`

**Authentication:** Required (Admin JWT token)

**Request Body:**
```json
{
  "admin_notes": "Internal notes", // Optional
  "rejection_reason": "Reason shown to user" // Optional
}
```

**What Happens:**
1. Updates request status to REJECTED
2. For conversions: Updates user's `brandRegistrationStatus` to DECLINED
3. Sends rejection email with reason (if provided)
4. User can reapply later

**Success Response:**
```json
{
  "message": "Brand request rejected successfully. Notification email sent to the brand."
}
```

---

### 6. Get Brand Request Statistics (Admin)

**Endpoint:** `GET /api/brand-requests/admin/requests/stats`

**Authentication:** Required (Admin JWT token)

**Response:**
```json
{
  "stats": {
    "total": 150,
    "today": 5,
    "pending": 25,
    "approved": 100,
    "rejected": 25
  }
}
```

---

## Database Schema

### BrandRequest Model

```typescript
{
  company_name: String (required),
  website_url: String (required, URL format),
  industry: String (required),
  company_type: String (optional, enum: ['Brand', 'Agency', 'Marketplace']),
  company_size: String (optional, enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']),
  contact: {
    first_name: String (required),
    last_name: String (required),
    email: String (required, unique, email format),
    phone: String (optional),
    job_title: String (optional)
  },
  account: {
    signup_method: String (required, enum: ['email', 'google', 'linkedin', 'sso'])
  },
  status: String (enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING'),
  admin_notes: String (optional),
  reviewed_by: String (optional),
  reviewed_at: Date (optional),
  userId: String (optional, ref: 'User'), // Links to USER account if conversion
  isUserConversion: Boolean (default: false), // Flag for USER to BRAND conversion
  created_at: Date,
  updated_at: Date
}
```

### UserAuth Schema Updates

```typescript
{
  // Existing fields...
  
  // NEW FIELDS for conversion tracking:
  gender: String (optional, enum: ['Male', 'Female', 'Other']),
  phoneNumber: String (optional),
  brandRegistrationStatus: String (
    enum: ['NONE', 'PENDING', 'APPROVED', 'DECLINED'], 
    default: 'NONE'
  )
}
```

---

## Email Templates

### 1. Brand Request Submitted
- Sent immediately after submission
- Confirms receipt of application
- Shows submitted details
- Mentions 24-48 hour review timeline

### 2. Brand Request Approved (New Brand)
- Congratulates on approval
- **Includes login credentials** (email + generated password)
- Includes OTP for email verification
- Lists next steps

### 3. Brand Request Approved (Conversion)
- Congratulates on approval
- **No credentials** - mentions using existing login
- Confirms account type change
- Lists next steps

### 4. Brand Request Rejected
- Polite rejection notice
- Includes rejection reason if provided
- Mentions ability to reapply
- For conversions: User remains as USER type

---

## Status Flow

### New Brand Registration Flow
```
Submit (no auth) → PENDING → Admin Review → APPROVED/REJECTED
                                          ↓
                              If APPROVED: New BRAND account created
                              If REJECTED: No account created
```

### USER to BRAND Conversion Flow
```
Submit (with auth) → PENDING → Admin Review → APPROVED/REJECTED
                           ↓                         ↓
          User status: PENDING    If APPROVED: USER → BRAND (same creds)
                                  If REJECTED: Remains USER
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Already a BRAND | User is already registered as BRAND |
| 400 | Only USER type | Only USER accounts can convert |
| 400 | Duplicate request | Request already exists for this email |
| 400 | Missing fields | Required fields not provided |
| 400 | Already reviewed | Request has already been approved/rejected |
| 404 | User not found | Authenticated user account not found |
| 404 | Request not found | Brand request not found |
| 500 | Internal error | Server error |

---

## Frontend Integration Guide

### For New Brand Registration (No Login Required)

```javascript
// Direct brand registration - no user account needed
const submitBrandRequest = async () => {
  const response = await fetch('/api/brand-requests/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      company_name: "Google Inc.",
      website_url: "https://www.google.com",
      industry: "Technology",
      company_type: "Brand",
      company_size: "1000+",
      contact: {
        first_name: "John",
        last_name: "Doe",
        email: "john@google.com", // REQUIRED for non-authenticated
        phone: "+1234567890",
        job_title: "Marketing Manager"
      },
      account: {
        signup_method: "email"
      }
    })
  });
  
  const data = await response.json();
  console.log(data.is_conversion); // false
};
```

### For USER to BRAND Conversion (Requires Login)

```javascript
// User is logged in - converting existing account to BRAND
const submitConversionRequest = async (token) => {
  const response = await fetch('/api/brand-requests/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Include JWT token
    },
    body: JSON.stringify({
      company_name: "Google Inc.",
      website_url: "https://www.google.com",
      industry: "Technology",
      company_type: "Brand",
      company_size: "1000+",
      contact: {
        first_name: "John",
        last_name: "Doe",
        // email is NOT required - taken from authenticated user
        phone: "+1234567890",
        job_title: "Marketing Manager"
      },
      account: {
        signup_method: "email"
      }
    })
  });
  
  const data = await response.json();
  console.log(data.is_conversion); // true
};
```

### Display User's Brand Request Status

```javascript
// Check if logged-in user has a pending brand request
const checkBrandStatus = async (user) => {
  // Check user.brandRegistrationStatus field
  if (user.brandRegistrationStatus === 'PENDING') {
    return "Your brand registration is under review";
  } else if (user.brandRegistrationStatus === 'APPROVED') {
    return "Your account has been converted to BRAND";
  } else if (user.brandRegistrationStatus === 'DECLINED') {
    return "Your brand request was declined. You can reapply.";
  }
  return "No pending request";
};
```

---

## Testing Guide

### Test Scenario 1: New Brand Registration

1. **Submit request without authentication:**
```bash
curl -X POST http://localhost:4000/api/brand-requests/submit \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "website_url": "https://test.com",
    "industry": "Technology",
    "contact": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@test.com"
    },
    "account": {
      "signup_method": "email"
    }
  }'
```

2. **Expected:** Request created with `isUserConversion: false`
3. **Admin approves:** New BRAND account created with generated password
4. **User receives:** Email with login credentials

### Test Scenario 2: USER to BRAND Conversion

1. **Sign up as USER first**
2. **Login and get JWT token**
3. **Submit conversion request:**
```bash
curl -X POST http://localhost:4000/api/brand-requests/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "company_name": "Test Company",
    "website_url": "https://test.com",
    "industry": "Technology",
    "contact": {
      "first_name": "John",
      "last_name": "Doe"
    },
    "account": {
      "signup_method": "email"
    }
  }'
```

4. **Expected:** Request created with `isUserConversion: true` and `userId`
5. **Admin approves:** USER account converted to BRAND (same credentials)
6. **User continues:** Using existing email/password

---

## Security Considerations

✅ **Authentication:** Optional auth allows both flows in one endpoint
✅ **Email Override:** For authenticated users, email is taken from JWT (prevents spoofing)
✅ **Duplicate Prevention:** Checks for existing requests by email
✅ **Type Validation:** Only USER accounts can convert to BRAND
✅ **Transaction Safety:** MongoDB transactions ensure data consistency during conversion
✅ **Admin Only:** Approval/rejection requires admin authentication

---

## Support

For issues or questions:
- Check main docs: `docs/USER_TO_BRAND_CONVERSION_API.md`
- Review controller: `src/controllers/brandRequest.ts`
- Check model: `src/models/brandRequest.ts`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`
