# Enhanced Chat System with S3 File Upload Documentation

## Overview

This documentation describes the comprehensive one-on-one chat system implemented for the Phyo platform. The system supports real-time messaging, online status tracking, typing indicators, message read receipts, and **direct file uploads via AWS S3** (no more URL-based media sharing).

## Features

### Core Features
- ✅ One-on-one messaging without follow requirements
- ✅ Real-time message delivery via WebSocket
- ✅ Online/Offline status tracking
- ✅ Typing indicators
- ✅ Message read receipts with timestamps
- ✅ **Direct file uploads via AWS S3** (NEW)
- ✅ Support for multiple file types (images, documents, videos, audio)
- ✅ Message delivery confirmation
- ✅ Conversation management
- ✅ File metadata tracking

## Supported File Types

### Images
- JPEG, PNG, GIF, WebP
- Maximum size: 5MB

### Documents
- PDF, DOC, DOCX, XLS, XLSX, TXT, CSV
- Maximum size: 10MB

### Videos
- MP4, AVI, MOV, WMV
- Maximum size: 10MB

### Audio
- MP3, WAV, AAC
- Maximum size: 10MB

## Database Schema

### User Model Extensions
```typescript
interface IUser {
  // ... existing fields
  isOnline?: boolean;        // Current online status
  lastSeen?: Date;          // Last activity timestamp
  socketId?: string;        // Current socket connection ID
}
```

### Conversation Model
```typescript
interface IConversation {
  participants: string[];    // Array of user IDs (exactly 2 for one-on-one)
  lastMessage?: string;     // Preview of last message
  lastMessageTime?: Date;   // Timestamp of last message
  createdAt: Date;
  updatedAt: Date;
}
```

### Message Model
```typescript
interface IMessage {
  conversationId: string;   // Reference to conversation
  senderId: string;         // Message sender ID
  content?: string;         // Text content (optional for media messages)
  timestamp: Date;          // Message timestamp
  messageType: 'text' | 'image' | 'file'; // Message type
  mediaUrl?: string;        // S3 URL for media content
  mediaKey?: string;        // S3 key for media deletion
  fileName?: string;        // Original file name
  fileSize?: number;        // File size in bytes
  isRead: boolean;          // Read status
  readAt?: Date;           // Read timestamp
  isDelivered: boolean;     // Delivery status
  deliveredAt?: Date;       // Delivery timestamp
}
```

## API Endpoints

### Authentication
All endpoints require JWT authentication via Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Conversation Management

#### Create Conversation
```
POST /api/conversation
Content-Type: application/json

{
  "participantId": "user_id_here"
}
```

#### Get User Conversations
```
GET /api/conversation
```

#### Get Conversation by ID
```
GET /api/conversation/:id
```

#### Delete Conversation
```
DELETE /api/conversation/:id
```

### Message Management

#### Send Text Message
```
POST /api/messages
Content-Type: application/json

{
  "conversationId": "conversation_id_here",
  "content": "Message content",
  "messageType": "text"
}
```

#### Send Message with File Upload (NEW)
```
POST /api/messages/with-file
Content-Type: multipart/form-data

{
  "file": <file>,
  "conversationId": "conversation_id_here",
  "content": "Optional message content"
}
```

#### Get Messages
```
GET /api/messages/:conversationId?page=1&limit=50
```

#### Mark Message as Read
```
PATCH /api/messages/:id/read
```

#### Delete Message
```
DELETE /api/messages/:id
```

### File Upload Management

#### Upload Chat Image (Legacy - Images Only)
```
POST /api/upload/chat-image
Content-Type: multipart/form-data

{
  "image": <file>,
  "conversationId": "conversation_id_here"
}
```

#### Upload Chat File (NEW - All File Types)
```
POST /api/upload/chat-file
Content-Type: multipart/form-data

{
  "file": <file>,
  "conversationId": "conversation_id_here"
}
```

#### Delete Chat File
```
DELETE /api/upload/chat-file/:key
```

## WebSocket Events

### Client to Server Events

#### Connection
```javascript
const socket = io('ws://localhost:4000', {
  query: { userId: 'user_id_here' }
});
```

#### Join Conversation
```javascript
socket.emit('joinConversation', 'conversation_id_here');
```

#### Leave Conversation
```javascript
socket.emit('leaveConversation', 'conversation_id_here');
```

#### Send Text Message
```javascript
socket.emit('sendMessage', {
  sender: 'user_id_here',
  content: 'Message content',
  conversationId: 'conversation_id_here',
  messageType: 'text'
});
```

#### Send File Message (After Upload)
```javascript
socket.emit('sendMessage', {
  sender: 'user_id_here',
  conversationId: 'conversation_id_here',
  messageType: 'file', // or 'image'
  mediaUrl: 's3_url_here',
  mediaKey: 's3_key_here',
  fileName: 'original_filename.pdf',
  fileSize: 1024000,
  mimeType: 'application/pdf'
});
```

#### Mark Typing
```javascript
socket.emit('typing', {
  conversationId: 'conversation_id_here',
  isTyping: true
});
```

#### Mark Message as Seen
```javascript
socket.emit('seenMessage', {
  messageId: 'message_id_here',
  userId: 'user_id_here'
});
```

### Server to Client Events

#### Receive Message
```javascript
socket.on('receiveMessage', (message) => {
  console.log('New message:', message);
});
```

#### User Typing
```javascript
socket.on('userTyping', (data) => {
  console.log('User typing:', data);
});
```

#### User Online/Offline
```javascript
socket.on('userOnline', (data) => {
  console.log('User online:', data);
});

socket.on('userOffline', (data) => {
  console.log('User offline:', data);
});
```

#### Message Seen
```javascript
socket.on('messageSeen', (data) => {
  console.log('Message seen:', data);
});
```

## Client-Side Implementation

### ChatSystem Class
```javascript
class ChatSystem {
  constructor(userId, token) {
    this.userId = userId;
    this.token = token;
    this.socket = io('ws://localhost:4000', {
      query: { userId }
    });
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on('receiveMessage', (message) => {
      this.handleNewMessage(message);
    });

    this.socket.on('userTyping', (data) => {
      this.handleTyping(data);
    });

    this.socket.on('userOnline', (data) => {
      this.handleUserOnline(data);
    });

    this.socket.on('userOffline', (data) => {
      this.handleUserOffline(data);
    });

    this.socket.on('messageSeen', (data) => {
      this.handleMessageSeen(data);
    });
  }

  sendMessage(conversationId, content, messageType = 'text') {
    this.socket.emit('sendMessage', {
      sender: this.userId,
      content,
      conversationId,
      messageType
    });
  }

  sendFile(conversationId, fileData) {
    this.socket.emit('sendMessage', {
      sender: this.userId,
      conversationId,
      messageType: fileData.fileTypeCategory === 'image' ? 'image' : 'file',
      mediaUrl: fileData.url,
      mediaKey: fileData.key,
      fileName: fileData.originalName,
      fileSize: fileData.size,
      mimeType: fileData.mimeType
    });
  }

  markTyping(conversationId, isTyping) {
    this.socket.emit('typing', {
      conversationId,
      isTyping
    });
  }

  markMessageSeen(messageId) {
    this.socket.emit('seenMessage', {
      messageId,
      userId: this.userId
    });
  }
}
```

### File Upload Examples

#### Upload and Send File
```javascript
async function uploadAndSendFile(conversationId, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversationId', conversationId);

  try {
    // Upload file
    const uploadResponse = await fetch('/api/upload/chat-file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const uploadResult = await uploadResponse.json();
    
    if (uploadResult.data) {
      // Send message with file
      const messageResponse = await fetch('/api/messages/with-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const messageResult = await messageResponse.json();
      return messageResult.data;
    }
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}
```

#### Direct Message with File Upload
```javascript
async function sendMessageWithFile(conversationId, file, content = '') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversationId', conversationId);
  if (content) {
    formData.append('content', content);
  }

  const response = await fetch('/api/messages/with-file', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const result = await response.json();
  return result.data;
}
```

## Environment Variables

Make sure to set these environment variables for S3 integration:

```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name
```

## Security Considerations

### Authentication
- All endpoints require JWT authentication
- File uploads are restricted to conversation participants
- File type validation prevents malicious uploads

### File Security
- File size limits prevent abuse
- MIME type validation ensures only allowed file types
- S3 bucket policies should be configured for proper access control
- Files are stored with unique UUIDs to prevent conflicts

### Rate Limiting
- Consider implementing rate limiting for file uploads
- Monitor S3 usage to prevent cost overruns

## Error Handling

### Common Error Responses

#### File Too Large
```json
{
  "message": "File too large",
  "error": "File size exceeds maximum allowed size"
}
```

#### Invalid File Type
```json
{
  "message": "Invalid file type",
  "error": "File type not supported"
}
```

#### Upload Failed
```json
{
  "message": "Upload failed",
  "error": "Failed to upload file to S3"
}
```

## Performance Considerations

### File Upload Optimization
- Files are uploaded directly to S3
- No temporary storage on server
- Streaming uploads for large files
- Parallel upload support for multiple files

### Database Optimization
- Message indexes for fast queries
- Conversation indexes for participant lookups
- File metadata stored efficiently

## Monitoring and Logging

### Key Metrics to Monitor
- File upload success/failure rates
- S3 storage usage
- Message delivery times
- WebSocket connection stability

### Logging
- File upload events logged
- S3 operation errors logged
- Message delivery confirmations logged
- User online/offline status changes logged 