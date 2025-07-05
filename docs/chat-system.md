# One-on-One Chat System Documentation

## Overview

This documentation describes the comprehensive one-on-one chat system implemented for the Phyo platform. The system supports real-time messaging, online status tracking, typing indicators, message read receipts, and image sharing via AWS S3.

## Features

### Core Features
- ✅ One-on-one messaging without follow requirements
- ✅ Real-time message delivery via WebSocket
- ✅ Online/Offline status tracking
- ✅ Typing indicators
- ✅ Message read receipts with timestamps
- ✅ Image sharing via AWS S3
- ✅ Message delivery confirmation
- ✅ Conversation management
- ✅ File metadata tracking

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

#### Send Message
```
POST /api/messages
Content-Type: application/json

{
  "conversationId": "conversation_id_here",
  "content": "Message content",
  "messageType": "text"
}
```

#### Send Media Message
```
POST /api/messages
Content-Type: application/json

{
  "conversationId": "conversation_id_here",
  "messageType": "image",
  "mediaUrl": "s3_url_here",
  "mediaKey": "s3_key_here",
  "fileName": "original_filename.jpg",
  "fileSize": 1024000
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

### Image Upload

#### Upload Chat Image
```
POST /api/upload/chat-image
Content-Type: multipart/form-data

{
  "image": <file>,
  "conversationId": "conversation_id_here"
}
```

#### Delete Chat Image
```
DELETE /api/upload/chat-image/:key
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

#### Send Message
```javascript
socket.emit('sendMessage', {
  sender: 'user_id_here',
  content: 'Message content',
  conversationId: 'conversation_id_here',
  messageType: 'text'
});
```

#### Send Media Message
```javascript
socket.emit('sendMessage', {
  sender: 'user_id_here',
  conversationId: 'conversation_id_here',
  messageType: 'image',
  mediaUrl: 's3_url_here',
  mediaKey: 's3_key_here',
  fileName: 'image.jpg',
  fileSize: 1024000
});
```

#### Typing Indicator
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

#### Message Seen
```javascript
socket.on('messageSeen', (data) => {
  console.log('Message seen:', data);
  // { messageId, userId, readAt }
});
```

#### User Typing
```javascript
socket.on('userTyping', (data) => {
  console.log('User typing:', data);
  // { userId, isTyping }
});
```

#### User Online/Offline
```javascript
socket.on('userOnline', (data) => {
  console.log('User online:', data);
  // { userId, isOnline: true }
});

socket.on('userOffline', (data) => {
  console.log('User offline:', data);
  // { userId, isOnline: false, lastSeen }
});
```

#### Message Error
```javascript
socket.on('messageError', (error) => {
  console.error('Message error:', error);
});
```

## AWS S3 Configuration

### Environment Variables
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

### S3 Bucket Structure
```
your-bucket-name/
├── chat-images/
│   ├── uuid-1.jpg
│   ├── uuid-2.png
│   └── ...
```

### Supported File Types
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### File Size Limits
- Maximum file size: 5MB
- Recommended image dimensions: 1920x1080 or smaller

## Usage Examples

### Frontend Integration

#### React/JavaScript Example
```javascript
import io from 'socket.io-client';

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

  sendImage(conversationId, imageData) {
    this.socket.emit('sendMessage', {
      sender: this.userId,
      conversationId,
      messageType: 'image',
      mediaUrl: imageData.url,
      mediaKey: imageData.key,
      fileName: imageData.fileName,
      fileSize: imageData.fileSize
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

#### Image Upload Example
```javascript
async function uploadImage(conversationId, imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('conversationId', conversationId);

  const response = await fetch('/api/upload/chat-image', {
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

## Security Considerations

### Authentication
- All API endpoints require valid JWT tokens
- Socket connections require user ID verification
- File uploads are restricted to authenticated users

### File Upload Security
- File type validation (whitelist approach)
- File size limits enforced
- Unique file names prevent conflicts
- S3 bucket permissions configured for security

### Message Privacy
- Users can only access conversations they're part of
- Message history is restricted to conversation participants
- File access is validated before serving

## Error Handling

### Common Error Responses
```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Performance Optimizations

### Database Indexing
- Conversation participants indexed for fast lookups
- Message timestamps indexed for chronological queries
- User online status indexed for presence queries

### Pagination
- Messages are paginated (default: 50 messages per page)
- Conversations sorted by last message time
- Efficient cursor-based pagination for large datasets

### File Optimization
- Image compression recommended before upload
- CDN integration for faster file delivery
- Automatic cleanup of unused files

## Monitoring and Logging

### Key Metrics
- Active socket connections
- Message delivery rates
- File upload success rates
- User online/offline patterns

### Error Logging
- Failed message deliveries
- File upload errors
- Socket connection issues
- Database query failures

## Future Enhancements

### Planned Features
- Message reactions/emojis
- Message threading
- Voice messages
- Video calls
- Message search
- Chat backups
- Multi-language support

### Technical Improvements
- Redis for session management
- Message queuing for reliability
- WebRTC for direct peer-to-peer communication
- Advanced file compression
- Real-time encryption

---

## Support

For technical support or questions about the chat system, please contact the development team or create an issue in the project repository.

**Last Updated**: 2024-01-15
**Version**: 1.0.0 