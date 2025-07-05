# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the root directory of your project with the following variables:

```bash
# Database Configuration
MONGO_URI=mongodb://localhost:27017/phyo_server
# or for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/phyo_server

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# Server Configuration
PORT=4000
NODE_ENV=development

# Email Configuration (if needed)
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```

## AWS S3 Setup

### 1. Create S3 Bucket
1. Log in to AWS Console
2. Navigate to S3 service
3. Create a new bucket with the name specified in `S3_BUCKET_NAME`
4. Configure bucket for public read access if needed

### 2. Configure IAM User
Create an IAM user with the following permissions policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-s3-bucket-name",
                "arn:aws:s3:::your-s3-bucket-name/*"
            ]
        }
    ]
}
```

### 3. CORS Configuration
Configure CORS for your S3 bucket:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

## Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Test Socket Connection
Open browser console and test:
```javascript
const socket = io('http://localhost:4000', {
  query: { userId: 'test_user_id' }
});

socket.on('connect', () => {
  console.log('Connected to chat server');
});
```

## Production Setup

### 1. Build Project
```bash
npm run build
```

### 2. Start Production Server
```bash
npm start
```

### 3. Environment Variables for Production
Update the following variables for production:

```bash
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/phyo_server
JWT_SECRET=your_production_jwt_secret_here
```

## Docker Setup (Optional)

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/phyo_server
      - JWT_SECRET=your_jwt_secret
      - AWS_ACCESS_KEY_ID=your_aws_key
      - AWS_SECRET_ACCESS_KEY=your_aws_secret
      - AWS_REGION=us-east-1
      - S3_BUCKET_NAME=your-bucket
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### API Testing with Postman
Import the Postman collection from `postman/` directory to test all endpoints.

## Troubleshooting

### Common Issues

1. **Socket Connection Failed**
   - Check if PORT is available
   - Verify CORS configuration
   - Ensure JWT token is valid

2. **S3 Upload Failed**
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Ensure bucket exists and is accessible

3. **Database Connection Failed**
   - Check MongoDB connection string
   - Verify database is running
   - Check network connectivity

4. **JWT Token Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper token format

### Debug Mode
Enable debug logs:
```bash
DEBUG=* npm run dev
```

## Monitoring

### Health Check Endpoint
```bash
GET /api/health
```

### Metrics Endpoint
```bash
GET /api/metrics
```

## Security Checklist

- [ ] JWT secret is strong and secure
- [ ] AWS credentials are properly configured
- [ ] S3 bucket has proper permissions
- [ ] CORS is configured correctly
- [ ] Rate limiting is implemented
- [ ] Input validation is in place
- [ ] HTTPS is enabled in production
- [ ] Database connection is secure

---

For additional help, refer to the main [Chat System Documentation](./chat-system.md). 