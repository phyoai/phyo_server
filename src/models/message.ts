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
    required: true,
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
  isRead: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1 });

const Message = mongoose.model<MessageDocument>('Message', messageSchema);

export default Message; 