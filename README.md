# Phyo Server - Enhanced Chat System with S3 File Uploads

## Overview

This is the backend server for the Phyo platform, featuring an enhanced chat system with direct file uploads via AWS S3. Users can now upload and share various file types directly in conversations without needing to provide external URLs.

## Key Features

### Chat System
- ✅ Real-time messaging via WebSocket
- ✅ One-on-one conversations
- ✅ Online/offline status tracking
- ✅ Typing indicators
- ✅ Message read receipts
- ✅ **Direct file uploads via S3** (NEW)

### File Upload Support
- **Images**: JPEG, PNG, GIF, WebP (max 5MB)
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV (max 10MB)
- **Videos**: MP4, AVI, MOV, WMV (max 10MB)
- **Audio**: MP3, WAV, AAC (max 10MB)

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- AWS S3 bucket
- AWS credentials

### Environment Variables
Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/phyo

# JWT
JWT_SECRET=your_jwt_secret_here

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# For development
npm run dev
```

## API Endpoints

### Chat System

#### Send Text Message
```http
POST /api/messages
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "conversationId": "conversation_id",
  "content": "Hello world!",
  "messageType": "text"
}
```

#### Send Message with File Upload
```http
POST /api/messages/with-file
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

{
  "file": <file>,
  "conversationId": "conversation_id",
  "content": "Check out this file!"
}
```

#### Upload File Only
```http
POST /api/upload/chat-file
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

{
  "file": <file>,
  "conversationId": "conversation_id"
}
```

#### Get Messages
```http
GET /api/messages/:conversationId?page=1&limit=50
Authorization: Bearer <jwt_token>
```

### Conversation Management

#### Create Conversation
```http
POST /api/conversation
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "participantId": "user_id"
}
```

#### Get User Conversations
```http
GET /api/conversation
Authorization: Bearer <jwt_token>
```

## WebSocket Events

### Client to Server
- `joinConversation` - Join a conversation
- `leaveConversation` - Leave a conversation
- `sendMessage` - Send a message
- `typing` - Send typing indicator
- `seenMessage` - Mark message as read

### Server to Client
- `receiveMessage` - Receive new message
- `userTyping` - User typing indicator
- `userOnline` - User came online
- `userOffline` - User went offline
- `messageSeen` - Message was seen

## File Upload Examples

### JavaScript/React Example
```javascript
// Upload and send file
async function uploadAndSendFile(conversationId, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversationId', conversationId);

  const response = await fetch('/api/messages/with-file', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return await response.json();
}

// WebSocket file message
socket.emit('sendMessage', {
  sender: userId,
  conversationId: conversationId,
  messageType: 'file',
  mediaUrl: fileData.url,
  mediaKey: fileData.key,
  fileName: fileData.originalName,
  fileSize: fileData.size,
  mimeType: fileData.mimeType
});
```

## Testing

Run the test script to verify file upload functionality:

```bash
# Install test dependencies
npm install form-data socket.io-client

# Run tests (update token and conversation ID in test-file-upload.js)
node test-file-upload.js
```

## Security Features

- JWT authentication for all endpoints
- File type validation
- File size limits
- Conversation access control
- S3 bucket security policies

## Performance Optimizations

- Direct S3 uploads (no server storage)
- Database indexing for fast queries
- WebSocket for real-time communication
- File streaming for large uploads

## Monitoring

Key metrics to monitor:
- File upload success/failure rates
- S3 storage usage
- Message delivery times
- WebSocket connection stability

## Documentation

For detailed API documentation, see:
- [Chat System Documentation](./docs/chat-system.md)
- [API Documentation](./docs/CAMPAIGN_API_DOCS.md)
- [Environment Setup](./docs/environment-setup.md)

## Support

For technical support or questions, please contact the development team or create an issue in the project repository.

---

**Last Updated**: 2024-01-15  
**Version**: 2.0.0 (Enhanced with S3 File Uploads) 