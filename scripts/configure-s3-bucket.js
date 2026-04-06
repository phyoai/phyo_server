const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'phyo-chat-images';

async function configureS3Bucket() {
  try {
    console.log('Configuring S3 bucket for public read access...');
    console.log('Bucket name:', BUCKET_NAME);
    console.log('Region:', process.env.AWS_REGION || 'us-east-1');
    
    // 1. Set bucket policy for public read access
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
        }
      ]
    };

    await s3.putBucketPolicy({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(bucketPolicy)
    }).promise();
    
    console.log('✅ Bucket policy updated successfully!');
    
    // 2. Configure CORS for web access (ACL removed - using bucket policy instead)
    const corsConfiguration = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
          AllowedOrigins: ['*'],
          ExposeHeaders: ['ETag']
        }
      ]
    };

    await s3.putBucketCors({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    }).promise();
    
    console.log('✅ CORS configuration updated!');
    
    console.log('\n🎉 S3 bucket configured successfully!');
    console.log('Your uploaded images should now be publicly accessible.');
    
  } catch (error) {
    console.error('❌ Error configuring S3 bucket:', error.message);
    console.log('\nManual configuration required:');
    console.log('1. Go to AWS S3 Console');
    console.log(`2. Select bucket: ${BUCKET_NAME}`);
    console.log('3. Go to "Permissions" tab');
    console.log('4. Edit "Block public access" - turn OFF all settings');
    console.log('5. Add bucket policy for public read access');
    console.log('6. Configure CORS for web access');
  }
}

configureS3Bucket(); 