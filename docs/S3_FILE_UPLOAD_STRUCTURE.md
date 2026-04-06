# AWS S3 File Upload Structure - Influencers vs Brands

## 📁 S3 Bucket Structure

### Bucket Name
```
phyo-brand-assets
```

### Folder Structure

```
phyo-brand-assets/
├── brands/
│   ├── {brand_email}/
│   │   ├── company_logo-{timestamp}.png
│   │   ├── brand_images-{timestamp}.jpg
│   │   ├── business_registration-{timestamp}.pdf
│   │   └── authorization_letter-{timestamp}.pdf
│   └── another_brand_email/
│       └── ...
│
└── influencers/
    ├── {instagram_username}/
    │   ├── profile_picture-{timestamp}.jpg
    │   ├── cover_photo-{timestamp}.png
    │   └── media_kit-{timestamp}.pdf
    └── another_influencer_username/
        └── ...
```

## 🔄 Implementation Details

### Brand Files
**Identifier**: Brand email (sanitized)
**S3 Path**: `brands/{sanitized_email}/`
**Files**:
- `company_logo` - Company logo image
- `brand_images` - Multiple brand images (up to 10)
- `business_registration` - Business registration document
- `authorization_letter` - Authorization letter document

**Example**:
```
brands/company_phyo_com/
├── company_logo-1733918400000-123456789.png
├── brand_images-1733918400000-987654321.jpg
└── business_registration-1733918400000-456789123.pdf
```

### Influencer Files
**Identifier**: Instagram username (preferred) or email (fallback)
**S3 Path**: `influencers/{sanitized_username}/`
**Files**:
- `profile_picture` - Influencer profile picture
- `cover_photo` - Cover/banner photo
- `media_kit` - Media kit PDF

**Example**:
```
influencers/abhidev/
├── profile_picture-1733918400000-123456789.jpg
├── cover_photo-1733918400000-987654321.png
└── media_kit-1733918400000-456789123.pdf
```

## 🛠️ Code Changes Made

### 1. Updated `localStorage` Configuration
```typescript
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Detect if influencer or brand upload based on field names
    const isInfluencerUpload = ['profile_picture', 'cover_photo', 'media_kit'].includes(file.fieldname);
    
    let uploadDir: string;
    
    if (isInfluencerUpload) {
      // Use Instagram username for influencers
      const instagramUsername = (req.body?.social_media?.instagram?.username) || 
                                (req.body?.contact?.email?.split('@')[0]) || 
                                'anonymous';
      uploadDir = path.join(__dirname, '../../uploads/influencers', sanitizedUsername);
    } else {
      // Use email for brands
      uploadDir = path.join(__dirname, '../../uploads/brands', sanitizedEmail);
    }
    
    cb(null, uploadDir);
  }
});
```

### 2. Updated `getFileUrl` Function
```typescript
export const getFileUrl = async (
  file: Express.Multer.File, 
  userIdentifier: string,
  isInfluencer: boolean = false
): Promise<string> => {
  // ...
  
  // Different S3 path based on type
  const s3Key = isInfluencer 
    ? `influencers/${sanitizedIdentifier}/${file.filename}`
    : `brands/${sanitizedIdentifier}/${file.filename}`;
  
  const s3Url = await uploadToS3(file.path, s3Key, file.mimetype);
  // ...
}
```

### 3. Updated `extractFileUrls` Function
```typescript
export const extractFileUrls = async (
  files: { [fieldname: string]: Express.Multer.File[] } | undefined,
  userIdentifier: string,
  isInfluencer: boolean = false  // NEW PARAMETER
) => {
  // Process files with isInfluencer flag
  for (const fieldName of Object.keys(files)) {
    fileUrls[fieldName] = await getFileUrl(file, userIdentifier, isInfluencer);
  }
}
```

### 4. Updated Influencer Controller
```typescript
export const submitInfluencerRegistration = async (req, res) => {
  const files = req.files;
  
  // Extract Instagram username first (before other processing)
  const tempInstagramUsername = req.body.social_media?.instagram?.username || 
                               req.body.social_media?.instagram?.link?.match(/instagram\.com\/([^\/\?]+)/)?.[1];
  
  // Use Instagram username as identifier, fallback to email
  const userIdentifier = tempInstagramUsername || req.body.contact?.email || 'anonymous';
  
  // Pass isInfluencer=true to upload to correct S3 path
  const fileUrls = await extractFileUrls(files, userIdentifier, true);
  
  // Continue with registration...
}
```

## 📊 Upload Flow

### For Influencers:
1. **Frontend** → Sends multipart/form-data with `profile_picture`, `cover_photo`, `media_kit`
2. **Multer** → Detects influencer fields, saves to `uploads/influencers/{username}/`
3. **Controller** → Extracts Instagram username as identifier
4. **extractFileUrls()** → Called with `isInfluencer=true`
5. **getFileUrl()** → Uploads to S3 at `influencers/{username}/{filename}`
6. **Cleanup** → Deletes local temp files
7. **Return** → S3 URLs: `https://phyo-brand-assets.s3.us-east-1.amazonaws.com/influencers/{username}/{file}`

### For Brands:
1. **Frontend** → Sends `company_logo`, `brand_images`, `business_registration`, etc.
2. **Multer** → Detects brand fields, saves to `uploads/brands/{email}/`
3. **Controller** → Uses email as identifier
4. **extractFileUrls()** → Called with `isInfluencer=false` (default)
5. **getFileUrl()** → Uploads to S3 at `brands/{email}/{filename}`
6. **Cleanup** → Deletes local temp files
7. **Return** → S3 URLs: `https://phyo-brand-assets.s3.us-east-1.amazonaws.com/brands/{email}/{file}`

## 🔍 Testing

### Test Influencer Upload:
```bash
# Submit influencer registration with files
POST /api/influencer-requests/submit
Content-Type: multipart/form-data

Fields:
- social_media[instagram][username]: "abhidev"
- profile_picture: <file>
- cover_photo: <file>
- media_kit: <file>

Expected S3 URLs:
✅ https://phyo-brand-assets.s3.us-east-1.amazonaws.com/influencers/abhidev/profile_picture-{timestamp}.jpg
✅ https://phyo-brand-assets.s3.us-east-1.amazonaws.com/influencers/abhidev/cover_photo-{timestamp}.png
✅ https://phyo-brand-assets.s3.us-east-1.amazonaws.com/influencers/abhidev/media_kit-{timestamp}.pdf
```

### Test Brand Upload:
```bash
# Submit brand registration with files
POST /api/brand-requests/submit
Content-Type: multipart/form-data

Fields:
- contact[email]: "brand@phyo.com"
- company_logo: <file>
- brand_images: <file[]>

Expected S3 URLs:
✅ https://phyo-brand-assets.s3.us-east-1.amazonaws.com/brands/brand_phyo_com/company_logo-{timestamp}.png
✅ https://phyo-brand-assets.s3.us-east-1.amazonaws.com/brands/brand_phyo_com/brand_images-{timestamp}.jpg
```

## 🎯 Key Benefits

1. **Clear Separation**: Brands and influencers have separate folders
2. **Easy Management**: Files organized by username/email
3. **Identifier Logic**: Instagram username for influencers, email for brands
4. **Scalability**: Each user has their own folder
5. **Cleanup**: Temp files automatically deleted after S3 upload

## ⚠️ Important Notes

1. **Instagram Username Priority**: Always use Instagram username for influencers when available
2. **Fallback**: If no Instagram username, use email prefix as identifier
3. **Sanitization**: All identifiers are sanitized (replace non-alphanumeric with `_`)
4. **Unique Filenames**: Timestamp + random number ensures no collisions
5. **Temp Files**: Local uploads are temporary and deleted after S3 upload

## 🔐 S3 Permissions

Make sure your S3 bucket policy allows public read access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::phyo-brand-assets/*"
    }
  ]
}
```

Or configure CloudFront for better performance and security.

---

**Status**: ✅ Implemented and ready for testing
