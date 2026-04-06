# AWS S3 Setup Guide for Phyo Brand Assets

## Overview

This guide will help you set up AWS S3 for storing brand logos, images, and verification documents. S3 (Simple Storage Service) is Amazon's cloud storage solution that provides:

- ✅ Scalable storage (unlimited)
- ✅ High availability (99.99% uptime)
- ✅ Global CDN delivery
- ✅ Automatic backups
- ✅ Cost-effective ($0.023/GB/month)

---

## Prerequisites

- AWS Account (create at https://aws.amazon.com)
- Credit card for billing (free tier available)
- Basic understanding of cloud storage

---

## Step 1: Create AWS Account

1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow the registration process
4. Verify your email and phone
5. Add payment method
6. Complete verification

**Note:** AWS offers a free tier with 5GB storage for 12 months.

---

## Step 2: Create S3 Bucket

### 2.1 Navigate to S3

1. Log in to AWS Console
2. In the search bar, type "S3"
3. Click on "S3" service

### 2.2 Create Bucket

1. Click **"Create bucket"** button
2. **Bucket name:** `phyo-brand-assets` (must be globally unique)
   - If taken, try: `phyo-brand-assets-2024` or `yourcompany-phyo-brand-assets`
3. **Region:** Choose closest to your users
   - US East (N. Virginia) `us-east-1` - Good for US/Global
   - EU (Ireland) `eu-west-1` - Good for Europe
   - Asia Pacific (Mumbai) `ap-south-1` - Good for India
   - Asia Pacific (Singapore) `ap-southeast-1` - Good for Asia
4. **Object Ownership:** 
   - Select **"ACLs enabled"**
   - Select **"Bucket owner preferred"**
5. **Block Public Access:**
   - **UNCHECK** "Block all public access"
   - ⚠️ Check the warning acknowledgment box
   - This is required so uploaded images can be accessed publicly
6. **Bucket Versioning:** Disabled (or Enabled if you want version history)
7. **Default encryption:** Server-side encryption (recommended)
8. Click **"Create bucket"**

---

## Step 3: Configure Bucket CORS

CORS (Cross-Origin Resource Sharing) allows your frontend to upload files directly to S3.

1. Click on your newly created bucket name
2. Go to **"Permissions"** tab
3. Scroll down to **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"**
5. Paste this configuration:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-request-id"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

6. Click **"Save changes"**

**Note:** For production, replace `"*"` in AllowedOrigins with your actual domain:
```json
"AllowedOrigins": [
  "https://phyo.ai",
  "https://www.phyo.ai"
]
```

---

## Step 4: Create IAM User for Programmatic Access

### 4.1 Navigate to IAM

1. In AWS Console search bar, type "IAM"
2. Click on "IAM" service

### 4.2 Create New User

1. Click **"Users"** in left sidebar
2. Click **"Add users"** button
3. **User name:** `phyo-upload-service`
4. Click **"Next"**

### 4.3 Set Permissions

**Option A: Attach Existing Policy (Easy but less secure)**

1. Select **"Attach policies directly"**
2. Search for: `AmazonS3FullAccess`
3. Check the box next to it
4. Click **"Next"**
5. Click **"Create user"**

**Option B: Create Custom Policy (Recommended for production)**

1. Select **"Attach policies directly"**
2. Click **"Create policy"**
3. Select **"JSON"** tab
4. Paste this policy (replace `phyo-brand-assets` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::phyo-brand-assets/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::phyo-brand-assets"
    }
  ]
}
```

5. Click **"Next"**
6. **Policy name:** `PhyoBrandAssetUploadPolicy`
7. Click **"Create policy"**
8. Go back to user creation, refresh policies, select your new policy
9. Click **"Next"** → **"Create user"**

### 4.4 Create Access Keys

1. Click on the newly created user (`phyo-upload-service`)
2. Go to **"Security credentials"** tab
3. Scroll down to **"Access keys"**
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Click **"Next"**
7. Optional: Add description tag
8. Click **"Create access key"**

### 4.5 Save Access Keys

**⚠️ IMPORTANT:** This is your ONLY chance to see the Secret Access Key!

You'll see:
- **Access key ID:** `AKIA...` (example: `AKIAIOSFODNN7EXAMPLE`)
- **Secret access key:** `wJalr...` (example: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

**Copy both and save them securely!**

---

## Step 5: Configure Server Environment Variables

1. Open your server's `.env` file:
   ```
   c:\Users\Abhishek\Desktop\Phyo\phyo_docker\server\.env
   ```

2. Add these lines (replace with your actual values):

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=phyo-brand-assets
```

3. **Save the file**

4. **Restart your server** for changes to take effect:
   ```powershell
   # Stop the server (Ctrl+C)
   # Start it again
   npm run dev
   ```

---

## Step 6: Test the Setup

### Test 1: Verify Environment Variables

Run this in your server directory:

```powershell
node -e "require('dotenv').config(); console.log('Region:', process.env.AWS_REGION); console.log('Bucket:', process.env.AWS_S3_BUCKET); console.log('Access Key:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Missing');"
```

**Expected output:**
```
Region: us-east-1
Bucket: phyo-brand-assets
Access Key: Set
```

### Test 2: Upload a Test File via Postman

1. Follow the Postman Testing Guide (POSTMAN_TESTING_GUIDE.md)
2. Do Test 3: Registration with File Uploads
3. After successful upload, check the response for S3 URLs

**Example S3 URL:**
```
https://phyo-brand-assets.s3.us-east-1.amazonaws.com/brands/john@testcompany.com/logo-1704672000000.png
```

### Test 3: Verify in AWS Console

1. Go to AWS Console → S3
2. Click on your bucket (`phyo-brand-assets`)
3. Navigate to `brands/` folder
4. You should see uploaded files organized by user email
5. Click on a file to see details
6. Copy the "Object URL" and open in browser - you should see the image

---

## Step 7: Make Uploaded Objects Public

If uploaded files are NOT accessible publicly:

### Option A: Bucket Policy (Recommended)

1. Go to bucket → **Permissions** tab
2. Scroll to **"Bucket policy"**
3. Click **"Edit"**
4. Paste this policy (replace bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::phyo-brand-assets/*"
    }
  ]
}
```

5. Click **"Save changes"**

**Note:** This makes ALL objects in the bucket publicly readable. Perfect for brand assets.

### Option B: ACL per Object (Already implemented in code)

Our code already sets ACL to `public-read` when uploading, so this should work automatically if you chose "ACLs enabled" in Step 2.

---

## Folder Structure in S3

Your bucket will be organized like this:

```
phyo-brand-assets/
├── brands/
│   ├── john@testcompany.com/
│   │   ├── logo-1704672000000.png
│   │   ├── brand-image-1704672001000.jpg
│   │   ├── brand-image-1704672002000.jpg
│   │   ├── business-registration-1704672003000.pdf
│   │   └── authorization-letter-1704672004000.pdf
│   ├── sarah@acmecorp.com/
│   │   ├── logo-1704672100000.png
│   │   └── brand-image-1704672101000.jpg
│   └── ...
```

Each brand has their own folder (based on email), and files have unique timestamps.

---

## Cost Estimation

### Storage Costs
- **Price:** $0.023 per GB/month (first 50 TB)
- **Example:** 1000 brands × 10 MB average = 10 GB = $0.23/month

### Request Costs
- **PUT/POST:** $0.005 per 1,000 requests
- **GET:** $0.0004 per 1,000 requests
- **Example:** 10,000 uploads/month = $0.05

### Data Transfer
- **First 1 GB/month:** FREE
- **Next 9.999 TB/month:** $0.09 per GB
- **Example:** 100 GB download = ~$9

**Total estimated cost for small-medium usage: $1-10/month**

**Free Tier (first 12 months):**
- 5 GB storage
- 20,000 GET requests
- 2,000 PUT requests

---

## Security Best Practices

### ✅ DO:
- Use IAM users with limited permissions (not root account)
- Enable bucket encryption
- Use HTTPS for all uploads/downloads
- Set CORS to specific domains in production
- Regularly rotate access keys
- Monitor CloudWatch for unusual activity
- Enable S3 access logging

### ❌ DON'T:
- Commit access keys to Git (add `.env` to `.gitignore`)
- Share access keys in Slack/email
- Use root AWS account credentials
- Make entire bucket public (only uploaded objects)
- Store sensitive data unencrypted

---

## Troubleshooting

### Issue: "Access Denied" when uploading

**Solutions:**
1. Check IAM user has correct permissions
2. Verify bucket policy allows uploads
3. Check ACL is enabled on bucket
4. Ensure access keys are correct in `.env`

### Issue: "Bucket already exists"

**Solution:** Bucket names are globally unique. Choose a different name.

### Issue: Uploaded files return 403 Forbidden

**Solutions:**
1. Add bucket policy (Step 7, Option A)
2. Ensure "Block Public Access" is disabled
3. Check if ACL is set to `public-read` in code

### Issue: "Invalid Access Key"

**Solutions:**
1. Double-check access keys in `.env`
2. Ensure no extra spaces or quotes
3. Regenerate access keys if needed

### Issue: CORS errors in browser

**Solutions:**
1. Verify CORS configuration (Step 3)
2. Check AllowedOrigins includes your domain
3. Clear browser cache
4. Check browser console for specific error

---

## Monitoring and Maintenance

### CloudWatch Metrics
1. Go to AWS Console → CloudWatch
2. Select "S3" metrics
3. Monitor:
   - Bucket size
   - Number of objects
   - Request count
   - Error rates

### S3 Storage Class (Cost Optimization)

For older files, you can transition to cheaper storage:

1. Go to bucket → **Management** tab
2. Create **Lifecycle rule**
3. Example rule:
   - Transition to S3 Infrequent Access after 30 days
   - Transition to Glacier after 90 days
   - Delete after 365 days (if applicable)

This can save 50-90% on storage costs for old files.

---

## Alternative: LocalStack (for Testing)

If you want to test S3 locally without AWS account:

1. Install LocalStack:
   ```powershell
   pip install localstack
   ```

2. Start LocalStack:
   ```powershell
   localstack start
   ```

3. Update `.env`:
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=test
   AWS_SECRET_ACCESS_KEY=test
   AWS_S3_BUCKET=phyo-brand-assets
   AWS_ENDPOINT=http://localhost:4566  # Add this line
   ```

4. Files will be stored locally but behave like S3

---

## Migration from Local Storage to S3

If you already have files in `server/uploads/brands/`:

### Option 1: Manual Upload via AWS CLI

1. Install AWS CLI: https://aws.amazon.com/cli/
2. Configure credentials:
   ```powershell
   aws configure
   ```
3. Sync local files to S3:
   ```powershell
   aws s3 sync ./uploads/brands/ s3://phyo-brand-assets/brands/ --acl public-read
   ```

### Option 2: Gradual Migration

Keep both local and S3 working:
- New uploads → S3
- Old uploads → Keep in local storage
- Update database URLs gradually

---

## Next Steps

Once S3 is set up:

1. ✅ Test file uploads via Postman
2. ✅ Test file access from frontend
3. ✅ Monitor first few uploads
4. ✅ Set up CloudWatch alerts
5. ✅ Configure lifecycle rules for cost optimization
6. ✅ Plan backup strategy
7. ✅ Document access key rotation schedule

---

## Support Resources

- AWS S3 Documentation: https://docs.aws.amazon.com/s3/
- AWS Free Tier: https://aws.amazon.com/free/
- AWS Pricing Calculator: https://calculator.aws/
- AWS Support: https://console.aws.amazon.com/support/

---

## Quick Reference

### Environment Variables
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
AWS_S3_BUCKET=phyo-brand-assets
```

### Bucket URL Format
```
https://{bucket}.s3.{region}.amazonaws.com/{key}
```

Example:
```
https://phyo-brand-assets.s3.us-east-1.amazonaws.com/brands/user@example.com/logo-123.png
```

### IAM Policy ARN Format
```
arn:aws:s3:::{bucket}/*
```

---

**Your S3 setup is complete! 🎉**

Files uploaded through the Brand Registration API will now be stored in AWS S3 with public URLs for easy access.
