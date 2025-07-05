import mongoose, { Schema, Document } from 'mongoose';
import { IMessage } from '../types';

export interface MessageDocument extends IMessage, Document {}

const messageSchema = new Schema<MessageDocument>({
  conversationId: { 
    type: String, 
    required: true,
    ref: 'Conversation'
  },
  senderId: { 
    type: String, 
    required: true,
    ref: 'User'
  },
  content: { 
    type: String, 
    required: function(this: MessageDocument) {
      return this.messageType === 'text';
    },
    trim: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  mediaUrl: {
    type: String,
    trim: true
  },
  mediaKey: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  readAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1 });

const Message = mongoose.model<MessageDocument>('Message', messageSchema);

export default Message; 